const DividendRecord = require("../models/DividendRecord");
const Business = require("../models/Business");
const User = require("../models/User");
const stellarService = require("../services/stellar.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const { XLM_INR_RATE } = require("../utils/constants");

const canonicalWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== "string") return "";
  const normalized = walletAddress.trim();
  if (!normalized) return "";
  if (/^[gG][a-zA-Z2-7]{55}$/.test(normalized)) return normalized.toUpperCase();
  if (/^0x[a-fA-F0-9]{40}$/.test(normalized)) return normalized.toLowerCase();
  return normalized;
};

/**
 * @desc    Get dividend history for a business
 * @route   GET /api/dividends/business/:businessId
 * @access  Private
 */
const getDividendHistory = async (req, res) => {
  try {
    const records = await DividendRecord.find({
      businessId: req.params.businessId,
    })
      .populate("verifiedBy", "name")
      .sort("-createdAt")
      .lean();

    return successResponse(
      res,
      { dividendRecords: records },
      "Dividend history fetched.",
    );
  } catch (error) {
    console.error("Get dividend history error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Admin verify a revenue report
 * @route   PUT /api/dividends/:id/verify
 * @access  Private (Admin)
 */
const verifyRevenue = async (req, res) => {
  try {
    const { verifiedRevenueAmount, adminNotes } = req.body;
    const record = await DividendRecord.findById(req.params.id);

    if (!record) {
      return errorResponse(res, "Dividend record not found.", 404);
    }
    if (record.status !== "pending") {
      return errorResponse(
        res,
        `Cannot verify a record with status "${record.status}".`,
        400,
      );
    }
    if (!verifiedRevenueAmount || verifiedRevenueAmount <= 0) {
      return errorResponse(
        res,
        "Verified revenue amount must be positive.",
        400,
      );
    }

    // Get business to fetch revenue share percentage
    const business = await Business.findById(record.businessId);
    if (!business) {
      return errorResponse(res, "Associated business not found.", 404);
    }

    const totalDividendPool =
      verifiedRevenueAmount * (business.revenueSharePercentage / 100);
    const totalDividendPoolXLM = totalDividendPool / XLM_INR_RATE;

    record.revenueVerified = Number(verifiedRevenueAmount);
    record.totalDividendPool = totalDividendPool;
    record.totalDividendPoolXLM = parseFloat(totalDividendPoolXLM.toFixed(6));
    record.status = "admin_verified";
    record.verifiedBy = req.user._id;
    record.adminNotes = adminNotes || "";
    await record.save();

    return successResponse(
      res,
      {
        dividendRecord: record,
        totalDividendPoolINR: totalDividendPool,
        totalDividendPoolXLM: parseFloat(totalDividendPoolXLM.toFixed(6)),
      },
      "Revenue verified. Ready for distribution.",
    );
  } catch (error) {
    console.error("Verify revenue error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Helper: Get all investors for a business from on-chain token balances
 */
async function getBusinessInvestorsFromChain(business) {
  const investors = [];
  
  if (!business.tokenDetails?.contractAddress) {
    return investors;
  }

  // Get all users with wallets. walletAddress has no unique constraint on User,
  // so dedupe by canonical wallet before querying — otherwise the same wallet's
  // balance gets checked (and could get paid) once per duplicate account.
  const users = await User.find({
    walletAddress: { $exists: true, $ne: null }
  }).lean();

  const seenWallets = new Set();

  // Check each unique wallet's on-chain balance
  for (const user of users) {
    const canonicalWallet = canonicalWalletAddress(user.walletAddress);
    if (!canonicalWallet || seenWallets.has(canonicalWallet)) continue;
    seenWallets.add(canonicalWallet);

    try {
      const balance = await stellarService.getBusinessTokenBalance(
        business.tokenDetails.contractAddress,
        canonicalWallet
      );

      const tokenBalance = Number(balance);
      if (tokenBalance > 0) {
        investors.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          walletAddress: canonicalWallet,
          tokenBalance,
          valueINR: tokenBalance * business.tokenDetails.tokenPrice,
        });
      }
    } catch (err) {
      // Skip wallets with balance check errors
      console.warn(`Failed to check balance for ${canonicalWallet}:`, err.message);
    }
  }

  return investors;
}

/**
 * @desc    Trigger dividend distribution for a verified record
 * @route   POST /api/dividends/:id/distribute
 * @access  Private (Admin)
 */
const triggerDistribution = async (req, res) => {
  try {
    const record = await DividendRecord.findById(req.params.id);
    if (!record) {
      return errorResponse(res, "Dividend record not found.", 404);
    }
    if (record.status !== "admin_verified") {
      return errorResponse(
        res,
        "Record must be admin-verified before distribution.",
        400,
      );
    }

    // Prevent double execution
    record.status = "distributing";
    await record.save();

    const business = await Business.findById(record.businessId);
    if (!business) {
      record.status = "admin_verified";
      await record.save();
      return errorResponse(res, "Associated business not found.", 404);
    }

    // Get all active investors from on-chain token balances
    const investors = await getBusinessInvestorsFromChain(business);

    if (investors.length === 0) {
      record.status = "admin_verified";
      await record.save();
      return errorResponse(
        res,
        "No active investors found for this business.",
        400,
      );
    }

    // Calculate payouts based on on-chain token holdings
    const totalTokens = business.tokenDetails.totalTokens;
    const payouts = [];

    for (const inv of investors) {
      if (!inv.walletAddress) continue;

      const share = inv.tokenBalance / totalTokens;
      const payoutINR = record.totalDividendPool * share;
      const payoutXLM = payoutINR / XLM_INR_RATE;

      payouts.push({
        investorId: inv.userId,
        walletAddress: inv.walletAddress,
        investorName: inv.name,
        tokenBalance: inv.tokenBalance,
        payoutAmountINR: parseFloat(payoutINR.toFixed(2)),
        payoutAmountXLM: parseFloat(payoutXLM.toFixed(6)),
      });
    }

    if (payouts.length === 0) {
      record.status = "admin_verified";
      await record.save();
      return errorResponse(res, "No investors with valid wallets found.", 400);
    }

    // Pre-check admin wallet balance
    const totalXLMNeeded = payouts.reduce(
      (sum, p) => sum + p.payoutAmountXLM,
      0,
    );
    const adminBalance = await stellarService.getAdminBalance();

    if (adminBalance < totalXLMNeeded) {
      record.status = "admin_verified";
      await record.save();
      return errorResponse(
        res,
        `Insufficient admin wallet balance. Need ${totalXLMNeeded.toFixed(6)} XLM but only have ${adminBalance.toFixed(6)} XLM. Please fund the admin wallet first.`,
        400,
      );
    }

    // Execute on-chain distribution
    const xlmPayouts = payouts.map((p) => ({
      walletAddress: p.walletAddress,
      xlmAmount: p.payoutAmountXLM,
    }));

    const results = await stellarService.distributeDividends(xlmPayouts);

    // Update payout results
    const individualPayouts = payouts.map((p, i) => ({
      ...p,
      txHash: results[i]?.txHash || null,
      success: results[i]?.success || false,
    }));

    record.individualPayouts = individualPayouts;
    record.distributedAt = new Date();
    const allSuccess = individualPayouts.every((p) => p.success);
    const allFailed = individualPayouts.every((p) => !p.success);
    record.status = allSuccess
      ? "completed"
      : allFailed
        ? "failed"
        : "partially_failed";
    await record.save();

    const successCount = individualPayouts.filter((p) => p.success).length;

    return successResponse(
      res,
      {
        dividendRecord: record,
        summary: {
          totalPayouts: individualPayouts.length,
          successful: successCount,
          failed: individualPayouts.length - successCount,
        },
      },
      `Dividends distributed! ${successCount}/${individualPayouts.length} successful.`,
    );
  } catch (error) {
    console.error("Trigger distribution error:", error);
    // Rollback status
    try {
      await DividendRecord.findByIdAndUpdate(req.params.id, {
        status: "admin_verified",
      });
    } catch (_) {}
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get my dividend earnings (investor) - from on-chain token holdings
 * @route   GET /api/dividends/my-earnings
 * @access  Private
 */
const getMyDividendEarnings = async (req, res) => {
  try {
    const investor = req.user;
    const investorWallet = canonicalWalletAddress(investor.walletAddress);
    
    if (!investorWallet) {
      return successResponse(
        res,
        {
          totalEarnedINR: 0,
          totalEarnedXLM: 0,
          investments: [],
          payoutHistory: [],
        },
        "No wallet connected."
      );
    }

    // Get all businesses with token contracts
    const businesses = await Business.find({
      'tokenDetails.contractAddress': { $exists: true, $ne: null },
    }).lean();

    const investments = [];
    const businessIds = [];

    // Check on-chain balance for each business token
    for (const business of businesses) {
      try {
        const balance = await stellarService.getBusinessTokenBalance(
          business.tokenDetails.contractAddress,
          investorWallet
        );
        
        const tokenBalance = Number(balance);
        if (tokenBalance > 0) {
          businessIds.push(business._id);
          investments.push({
            businessId: business._id,
            businessName: business.name,
            category: business.category,
            tokensPurchased: tokenBalance,
            tokenValue: tokenBalance * business.tokenDetails.tokenPrice,
          });
        }
      } catch (err) {
        console.warn(`Failed to check balance for ${business.name}:`, err.message);
      }
    }

    // Get dividend records for businesses the user has invested in
    const dividendRecords = await DividendRecord.find({
      businessId: { $in: businessIds },
      status: { $in: ["completed", "partially_failed"] },
    })
      .sort("-distributedAt")
      .lean();

    // Extract the current user's payouts from records
    const myPayouts = [];
    let totalEarnedINR = 0;
    let totalEarnedXLM = 0;

    for (const record of dividendRecords) {
      const myPayout = record.individualPayouts?.find(
        (p) => canonicalWalletAddress(p.walletAddress) === investorWallet && p.success
      );
      if (myPayout) {
        totalEarnedINR += myPayout.payoutAmountINR || 0;
        totalEarnedXLM += myPayout.payoutAmountXLM || 0;
        
        // Get business name
        const business = businesses.find(b => b._id.toString() === record.businessId.toString());
        
        myPayouts.push({
          businessId: record.businessId,
          businessName: business?.name || 'Unknown Business',
          month: record.month,
          year: record.year,
          payoutAmountINR: myPayout.payoutAmountINR,
          payoutAmountXLM: myPayout.payoutAmountXLM,
          txHash: myPayout.txHash,
          distributedAt: record.distributedAt,
        });
      }
    }

    return successResponse(
      res,
      {
        totalEarnedINR: parseFloat(totalEarnedINR.toFixed(2)),
        totalEarnedXLM: parseFloat(totalEarnedXLM.toFixed(6)),
        investments,
        payoutHistory: myPayouts,
      },
      "Dividend earnings fetched.",
    );
  } catch (error) {
    console.error("Get my earnings error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Retry failed payouts from a partially_failed dividend record
 * @route   POST /api/dividends/:id/retry
 * @access  Private (Admin)
 */
const retryFailedPayouts = async (req, res) => {
  try {
    const record = await DividendRecord.findById(req.params.id);
    if (!record) {
      return errorResponse(res, "Dividend record not found.", 404);
    }
    if (record.status !== "partially_failed" && record.status !== "failed") {
      return errorResponse(
        res,
        `Can only retry records with status "partially_failed" or "failed". Current: "${record.status}".`,
        400,
      );
    }

    const failedPayouts = record.individualPayouts.filter((p) => !p.success);
    if (failedPayouts.length === 0) {
      return errorResponse(res, "No failed payouts to retry.", 400);
    }

    // Pre-check admin balance
    const totalXLMNeeded = failedPayouts.reduce(
      (sum, p) => sum + p.payoutAmountXLM,
      0,
    );
    const adminBalance = await stellarService.getAdminBalance();

    if (adminBalance < totalXLMNeeded) {
      return errorResponse(
        res,
        `Insufficient admin wallet balance. Need ${totalXLMNeeded.toFixed(6)} XLM for ${failedPayouts.length} failed payouts, but only have ${adminBalance.toFixed(6)} XLM.`,
        400,
      );
    }

    record.status = "distributing";
    await record.save();

    // Build on-chain payout list for failed ones only
    const xlmPayouts = failedPayouts.map((p) => ({
      walletAddress: p.walletAddress,
      xlmAmount: p.payoutAmountXLM,
    }));

    const results = await stellarService.distributeDividends(xlmPayouts);

    // Update the record's individualPayouts with retry results
    let retryIdx = 0;
    for (let i = 0; i < record.individualPayouts.length; i++) {
      if (!record.individualPayouts[i].success) {
        const result = results[retryIdx];
        if (result && result.success) {
          record.individualPayouts[i].success = true;
          record.individualPayouts[i].txHash = result.txHash;
        }
        retryIdx++;
      }
    }

    const allSuccess = record.individualPayouts.every((p) => p.success);
    const allFailed = record.individualPayouts.every((p) => !p.success);
    record.status = allSuccess
      ? "completed"
      : allFailed
        ? "failed"
        : "partially_failed";
    record.distributedAt = new Date();
    await record.save();

    const successCount = record.individualPayouts.filter(
      (p) => p.success,
    ).length;

    return successResponse(
      res,
      {
        dividendRecord: record,
        summary: {
          totalPayouts: record.individualPayouts.length,
          successful: successCount,
          failed: record.individualPayouts.length - successCount,
          retriedThisRound: failedPayouts.length,
        },
      },
      `Retry complete! ${successCount}/${record.individualPayouts.length} total payouts now successful.`,
    );
  } catch (error) {
    console.error("Retry failed payouts error:", error);
    try {
      await DividendRecord.findByIdAndUpdate(req.params.id, {
        status: "partially_failed",
      });
    } catch (_) {}
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getDividendHistory,
  verifyRevenue,
  triggerDistribution,
  retryFailedPayouts,
  getMyDividendEarnings,
};
