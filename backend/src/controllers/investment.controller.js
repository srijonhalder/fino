/**
 * Investment Controller - On-Chain Data
 * 
 * Investments are now tracked on-chain via BusinessToken contracts.
 * This controller handles the investment flow and queries on-chain balances.
 */

const Business = require('../models/Business');
const User = require('../models/User');
const DividendRecord = require('../models/DividendRecord');
const InvestmentTxLog = require('../models/InvestmentTxLog');
const stellarService = require('../services/stellar.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  XLM_INR_RATE,
  MIN_INVESTMENT_INR,
  MAX_INVESTMENT_INR,
  BUSINESS_STATUS,
} = require('../utils/constants');
const { adminKeypair } = require('../config/stellar');

const canonicalWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== 'string') return '';
  const normalized = walletAddress.trim();
  if (!normalized) return '';
  if (/^[gG][a-zA-Z2-7]{55}$/.test(normalized)) return normalized.toUpperCase();
  if (/^0x[a-fA-F0-9]{40}$/.test(normalized)) return normalized.toLowerCase();
  return normalized;
};

const { Horizon } = require('@stellar/stellar-sdk');
const horizonServer = new Horizon.Server('https://horizon-testnet.stellar.org');

const getSuccessfulDividendTotalsForWallet = async (businessId, walletAddress) => {
  let totalXLM = 0;
  const targetMemo = 'DIV:' + businessId.toString();
  const adminAddress = adminKeypair ? adminKeypair.publicKey() : null;

  if (!adminAddress) {
    return { totalINR: 0, totalXLM: 0 };
  }

  try {
    const canonicalTarget = canonicalWalletAddress(walletAddress);
    let url = horizonServer.transactions().forAccount(canonicalTarget).limit(100).order('desc');
    let hasMore = true;
    let pageCount = 0;

    // Search up to 500 recent transactions
    while (hasMore && pageCount < 5) {
      const txPage = await url.call();
      pageCount++;

      if (txPage.records.length === 0) break;

      for (const tx of txPage.records) {
        if (tx.source_account === adminAddress && tx.memo === targetMemo) {
          const opsPage = await tx.operations();
          for (const op of opsPage.records) {
            if (op.type === 'payment' && op.to === canonicalTarget && op.asset_type === 'native') {
              totalXLM += Number(op.amount);
            }
          }
        }
      }

      if (txPage.records.length < 100) {
        hasMore = false;
      } else {
        url = txPage.next();
      }
    }
  } catch (err) {
    console.error('Error fetching on-chain dividends:', err.message || err);
  }

  const totalINR = totalXLM * XLM_INR_RATE;

  return {
    totalINR: Number(totalINR.toFixed(2)),
    totalXLM: Number(totalXLM.toFixed(6)),
  };
};

/**
 * @desc    Initiate an investment (step 1 — returns payment info)
 * @route   POST /api/investments/initiate
 * @access  Private (investor)
 */
const initiateInvestment = async (req, res) => {
  try {
    const { businessId, tokenAmount } = req.body;
    const investor = req.user;

    // Check wallet connected
    if (!investor.walletAddress) {
      return errorResponse(res, 'Please connect your wallet first.', 400);
    }

    // Find business
    const business = await Business.findById(businessId);
    if (!business) {
      return errorResponse(res, 'Business not found.', 404);
    }
    if (business.status !== BUSINESS_STATUS.FUNDRAISING) {
      return errorResponse(res, 'This business is not currently accepting investments.', 400);
    }

    // Validate token amount
    const tokens = Number(tokenAmount);
    if (!tokens || tokens < 1) {
      return errorResponse(res, 'Token amount must be at least 1.', 400);
    }

    // Check available tokens
    const availableTokens = business.tokenDetails.totalTokens - business.tokenDetails.soldTokens;
    if (tokens > availableTokens) {
      return errorResponse(res, `Only ${availableTokens} tokens available.`, 400);
    }

    // Calculate amounts
    const totalAmountINR = tokens * business.tokenDetails.tokenPrice;
    const totalAmountXLM = totalAmountINR / XLM_INR_RATE;

    // Check investment limits
    if (totalAmountINR < MIN_INVESTMENT_INR) {
      return errorResponse(res, `Minimum investment is ₹${MIN_INVESTMENT_INR}.`, 400);
    }

    // Check existing on-chain balance to enforce max investment limit
    let existingTokens = 0;
    if (business.tokenDetails.contractAddress) {
      try {
        const balance = await stellarService.getBusinessTokenBalance(
          business.tokenDetails.contractAddress,
          investor.walletAddress
        );
        existingTokens = Number(balance);
      } catch (err) {
        console.warn('Could not check existing token balance:', err.message);
      }
    }

    const existingINR = existingTokens * business.tokenDetails.tokenPrice;
    if (existingINR + totalAmountINR > MAX_INVESTMENT_INR) {
      return errorResponse(
        res,
        `Total investment cannot exceed ₹${MAX_INVESTMENT_INR} per business. You already hold tokens worth ₹${existingINR}.`,
        400
      );
    }

    // Generate a unique investment reference ID
    const investmentRef = `INV_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return successResponse(
      res,
      {
        investmentRef,
        tokensPurchased: tokens,
        totalAmountINR,
        totalAmountXLM: parseFloat(totalAmountXLM.toFixed(6)),
        escrowContractAddress: process.env.ESCROW_CONTRACT_ID || process.env.ESCROW_CONTRACT_ADDRESS,
        adminWalletAddress: adminKeypair ? adminKeypair.publicKey() : null,
        instruction: `Send exactly ${totalAmountXLM.toFixed(6)} XLM to the escrow wallet using Freighter, then call the confirm endpoint with the transaction hash.`,
      },
      'Investment initiated. Please send XLM to the escrow wallet.',
      201
    );
  } catch (error) {
    console.error('Initiate investment error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Confirm investment after XLM payment (step 2)
 * @route   POST /api/investments/confirm
 * @access  Private
 */
const confirmInvestment = async (req, res) => {
  try {
    const { businessId, tokenAmount, xlmTransactionHash } = req.body;

    if (!businessId || !tokenAmount || !xlmTransactionHash) {
      return errorResponse(res, 'Business ID, token amount, and transaction hash are required.', 400);
    }

    const investor = req.user;
    if (!investor.walletAddress) {
      return errorResponse(res, 'Wallet not connected.', 400);
    }

    // Find business
    let business = await Business.findById(businessId);
    if (!business) {
      return errorResponse(res, 'Business not found.', 404);
    }

    // Verify the transaction via stellarService
    const receipt = await stellarService.checkTransactionStatus(xlmTransactionHash);
    if (!receipt || receipt.status !== 'success') {
      return errorResponse(res, 'Transaction not found, failed, or still pending on-chain.', 400);
    }

    const tokens = Number(tokenAmount);
    if (!tokens || tokens < 1) {
      return errorResponse(res, 'Token amount must be at least 1.', 400);
    }
    const totalAmountINR = tokens * business.tokenDetails.tokenPrice;
    const expectedXLM = totalAmountINR / XLM_INR_RATE;

    // Verify the payment actually went from this investor to the admin wallet for
    // at least the expected amount — checkTransactionStatus above only confirms the
    // hash succeeded on-chain at all, not who paid whom how much.
    const adminAddress = adminKeypair ? adminKeypair.publicKey() : null;
    try {
      const txRecord = await horizonServer.transactions().transaction(xlmTransactionHash).call();
      const canonicalInvestor = canonicalWalletAddress(investor.walletAddress);
      const opsPage = await txRecord.operations();
      const paidEnough = opsPage.records.some(
        (op) =>
          op.type === 'payment' &&
          op.asset_type === 'native' &&
          op.to === adminAddress &&
          canonicalWalletAddress(op.from) === canonicalInvestor &&
          Number(op.amount) >= expectedXLM - 0.0001 // tolerate rounding
      );
      if (!paidEnough) {
        return errorResponse(
          res,
          `Transaction does not contain a payment of at least ${expectedXLM.toFixed(6)} XLM from your wallet to the escrow wallet.`,
          400
        );
      }
    } catch (err) {
      return errorResponse(res, `Could not verify payment details on-chain: ${err.message}`, 400);
    }

    // Reject replay of an already-used payment hash (same tx confirmed twice, possibly
    // against a different business/investment) — nothing previously persisted this.
    try {
      await InvestmentTxLog.create({
        xlmTransactionHash,
        businessId: business._id,
        investorId: investor._id,
        tokenAmount: tokens,
        totalAmountINR,
      });
    } catch (err) {
      if (err.code === 11000) {
        return errorResponse(res, 'This transaction hash has already been used to confirm an investment.', 409);
      }
      throw err;
    }

    // Atomically reserve tokens/raised-amount so concurrent confirmations can't oversell
    // (a plain load-then-save here would let two requests both pass the availability
    // check before either commits, overselling tokens past totalTokens).
    const reserved = await Business.findOneAndUpdate(
      {
        _id: businessId,
        status: BUSINESS_STATUS.FUNDRAISING,
        $expr: {
          $lte: [
            { $add: ['$tokenDetails.soldTokens', tokens] },
            '$tokenDetails.totalTokens',
          ],
        },
      },
      {
        $inc: {
          raisedAmount: totalAmountINR,
          'tokenDetails.soldTokens': tokens,
        },
      },
      { new: true }
    );

    if (!reserved) {
      return errorResponse(
        res,
        'Investment could not be confirmed — the business may no longer be accepting investments or the remaining tokens have already sold out.',
        409
      );
    }

    business = reserved;

    // Transfer tokens to investor wallet on-chain
    let tokenTxHash = null;
    if (business.tokenDetails.contractAddress) {
      try {
        const result = await stellarService.transferTokens(
          business.tokenDetails.contractAddress,
          investor.walletAddress,
          tokens
        );
        tokenTxHash = result.txHash;
      } catch (tokenErr) {
        console.error('Token transfer failed:', tokenErr.message);
        return errorResponse(res, 'Token transfer failed. Please contact support.', 500);
      }
    }

    // Check if funding goal is reached
    if (business.raisedAmount >= business.fundingGoal) {
      business.status = BUSINESS_STATUS.FUNDED;

      // Release escrow to business owner
      const owner = await User.findById(business.ownerId);
      if (owner && owner.walletAddress) {
        try {
          const escrowXLM = business.raisedAmount / XLM_INR_RATE;
          await stellarService.sendXLM(owner.walletAddress, escrowXLM.toFixed(6));
          business.status = BUSINESS_STATUS.ACTIVE;
          console.log(`✅ Escrow released: ${escrowXLM.toFixed(6)} XLM to ${owner.walletAddress}`);
        } catch (escrowErr) {
          console.error('Escrow release failed:', escrowErr.message);
        }
      }

      // Notify business owner
      try {
        const notificationService = require('../services/notification.service');
        await notificationService.createNotification(
          business.ownerId,
          'funding_complete',
          '🎉 Funding Goal Reached!',
          `"${business.name}" is now fully funded!`,
          `/dashboard/business`
        );
      } catch (notifErr) {
        console.error('Notification failed:', notifErr.message);
      }
    }

    await business.save();

    // Notify investor
    try {
      const notificationService = require('../services/notification.service');
      await notificationService.notifyInvestmentConfirmed(
        investor._id,
        business.name,
        tokens
      );
    } catch (notifErr) {
      console.error('Investment notification failed:', notifErr.message);
    }

    return successResponse(
      res,
      {
        tokenTransferTxHash: tokenTxHash,
        xlmTransactionHash,
        tokensPurchased: tokens,
        businessName: business.name,
        businessFundingProgress: business.fundingProgress,
      },
      'Investment confirmed and tokens transferred on-chain!'
    );
  } catch (error) {
    console.error('Confirm investment error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get my investments (from on-chain token balances)
 * @route   GET /api/investments/my-investments
 * @access  Private
 */
const getMyInvestments = async (req, res) => {
  try {
    const investor = req.user;
    const investorWallet = canonicalWalletAddress(investor.walletAddress);
    if (!investorWallet) {
      return successResponse(res, { investments: [] }, 'No wallet connected.');
    }

    // Get all businesses with token contracts
    const businesses = await Business.find({
      'tokenDetails.contractAddress': { $exists: true, $ne: null },
    }).lean();

    const investments = [];

    // Check on-chain balance for each business token
    for (const business of businesses) {
      try {
        const balance = await stellarService.getBusinessTokenBalance(
          business.tokenDetails.contractAddress,
          investorWallet
        );
        
        const tokenBalance = Number(balance);
        if (tokenBalance > 0) {
          const { totalINR, totalXLM } = await getSuccessfulDividendTotalsForWallet(
            business._id,
            investorWallet
          );

          investments.push({
            businessId: business._id,
            businessName: business.name,
            businessCategory: business.category,
            businessStatus: business.status,
            tokensPurchased: tokenBalance,
            tokenPrice: business.tokenDetails.tokenPrice,
            totalValueINR: tokenBalance * business.tokenDetails.tokenPrice,
            contractAddress: business.tokenDetails.contractAddress,
            revenueSharePercentage: business.revenueSharePercentage,
            ownershipPercentage: business.tokenDetails.totalTokens > 0
              ? ((tokenBalance / business.tokenDetails.totalTokens) * 100).toFixed(4)
              : '0',
            totalDividendsEarned: totalINR,
            totalDividendsEarnedXLM: totalXLM,
            stellarExplorerUrl: `https://stellar.expert/explorer/testnet/contract/${business.tokenDetails.contractAddress}`,
          });
        }
      } catch (err) {
        console.warn(`Failed to check balance for ${business.name}:`, err.message);
      }
    }

    return successResponse(res, { investments }, 'Portfolio fetched from on-chain.');
  } catch (error) {
    console.error('Get my investments error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get all investors for a business (from on-chain)
 * @route   GET /api/investments/business/:businessId
 * @access  Private (Admin/Business Owner)
 */
const getBusinessInvestors = async (req, res) => {
  try {
    const business = await Business.findById(req.params.businessId);
    if (!business) {
      return errorResponse(res, 'Business not found.', 404);
    }

    // Get all users with wallets
    const users = await User.find({ walletAddress: { $exists: true, $ne: null } }).lean();
    const investors = [];

    // Check each user's on-chain balance
    if (business.tokenDetails.contractAddress) {
      for (const user of users) {
        try {
          const balance = await stellarService.getBusinessTokenBalance(
            business.tokenDetails.contractAddress,
            user.walletAddress
          );
          
          const tokenBalance = Number(balance);
          if (tokenBalance > 0) {
            investors.push({
              userId: user._id,
              name: user.name,
              email: user.email,
              walletAddress: user.walletAddress,
              tokenBalance,
              valueINR: tokenBalance * business.tokenDetails.tokenPrice,
              ownershipPercentage: ((tokenBalance / business.tokenDetails.totalTokens) * 100).toFixed(4),
            });
          }
        } catch (err) {
          // Skip users with balance check errors
        }
      }
    }

    const totalTokensHeld = investors.reduce((sum, inv) => sum + inv.tokenBalance, 0);
    const totalValueINR = investors.reduce((sum, inv) => sum + inv.valueINR, 0);

    return successResponse(
      res,
      {
        investors,
        totalInvestors: investors.length,
        totalTokensHeld,
        totalValueINR,
      },
      'Business investors fetched from on-chain.'
    );
  } catch (error) {
    console.error('Get business investors error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get on-chain portfolio — live token balances + XLM balance
 * @route   GET /api/investments/on-chain-portfolio
 * @access  Private
 */
const getOnChainPortfolio = async (req, res) => {
  try {
    const walletAddress = canonicalWalletAddress(req.user.walletAddress);
    if (!walletAddress) {
      return errorResponse(res, 'No wallet connected.', 400);
    }

    // Get XLM balance
    const { xlmBalance } = await stellarService.checkBalance(walletAddress);

    // Get all business token holdings
    const businesses = await Business.find({
      'tokenDetails.contractAddress': { $exists: true, $ne: null },
    }).lean();

    const holdings = [];

    for (const business of businesses) {
      try {
        const balance = await stellarService.getBusinessTokenBalance(
          business.tokenDetails.contractAddress,
          walletAddress
        );
        
        const tokenBalance = Number(balance);
        if (tokenBalance > 0) {
          const { totalINR, totalXLM } = await getSuccessfulDividendTotalsForWallet(
            business._id,
            walletAddress
          );

          holdings.push({
            businessName: business.name,
            category: business.category,
            contractAddress: business.tokenDetails.contractAddress,
            revenueSharePercentage: business.revenueSharePercentage || 0,
            businessStatus: business.status,
            onChainTokenBalance: tokenBalance,
            totalSupply: business.tokenDetails.totalTokens,
            tokenPriceINR: business.tokenDetails.tokenPrice,
            ownershipPercentage: business.tokenDetails.totalTokens > 0
              ? ((tokenBalance / business.tokenDetails.totalTokens) * 100).toFixed(4)
              : '0',
            holdingValueINR: tokenBalance * business.tokenDetails.tokenPrice,
            totalDividendsEarned: totalINR,
            totalDividendsEarnedXLM: totalXLM,
            stellarExplorerUrl: `https://stellar.expert/explorer/testnet/contract/${business.tokenDetails.contractAddress}`,
          });
        }
      } catch (err) {
        console.warn(`Failed to check balance for ${business.name}:`, err.message);
      }
    }

    const totalHoldingValueINR = holdings.reduce((s, h) => s + h.holdingValueINR, 0);
    const totalDividendsINR = holdings.reduce((s, h) => s + h.totalDividendsEarned, 0);
    const totalDividendsXLM = holdings.reduce((s, h) => s + h.totalDividendsEarnedXLM, 0);

    return successResponse(
      res,
      {
        walletAddress,
        xlmBalance: parseFloat(xlmBalance),
        holdings,
        summary: {
          totalHoldings: holdings.length,
          totalHoldingValueINR: parseFloat(totalHoldingValueINR.toFixed(2)),
          totalDividendsINR: parseFloat(totalDividendsINR.toFixed(2)),
          totalDividendsXLM: parseFloat(totalDividendsXLM.toFixed(6)),
        },
      },
      'On-chain portfolio fetched.'
    );
  } catch (error) {
    console.error('On-chain portfolio error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Check if user is an investor of a specific business (for voting eligibility)
 * @route   GET /api/investments/check/:businessId
 * @access  Private
 */
const checkInvestorStatus = async (req, res) => {
  try {
    const { businessId } = req.params;
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return successResponse(res, { isInvestor: false }, 'No wallet connected.');
    }

    const business = await Business.findById(businessId);
    if (!business || !business.tokenDetails.contractAddress) {
      return successResponse(res, { isInvestor: false }, 'Business not found or no token contract.');
    }

    const isInvestor = await stellarService.isBusinessInvestor(
      business.tokenDetails.contractAddress,
      walletAddress
    );

    return successResponse(res, { 
      isInvestor,
      businessName: business.name,
    }, isInvestor ? 'You are an investor.' : 'You are not an investor.');
  } catch (error) {
    console.error('Check investor status error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  initiateInvestment,
  confirmInvestment,
  getMyInvestments,
  getBusinessInvestors,
  getOnChainPortfolio,
  checkInvestorStatus,
};
