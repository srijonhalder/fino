const crypto = require("crypto");
const Business = require("../models/Business");
const User = require("../models/User");
const DividendRecord = require("../models/DividendRecord");
const {
  getGovernanceContract,
  getGovernanceReadOnly,
  PROPOSAL_STATUS,
} = require("../config/governance");
const dividendDistributorService = require("./dividendDistributor.service");
const notificationService = require("./notification.service");
const stellarService = require("./stellar.service");
const { FUNDING_DEADLINE_DAYS } = require("../utils/constants");

const canonicalWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== "string") return "";
  const normalized = walletAddress.trim();
  if (!normalized) return "";
  if (/^[gG][a-zA-Z2-7]{55}$/.test(normalized)) return normalized.toUpperCase();
  if (/^0x[a-fA-F0-9]{40}$/.test(normalized)) return normalized.toLowerCase();
  return normalized;
};

/**
 * Proposal Finalizer Service
 * Finalizes expired proposals on-chain and executes results.
 * 
 * Note: With on-chain governance, proposals are stored on-chain.
 * We query the contract to find active proposals and finalize them.
 */

/**
 * Finalize a single proposal
 * @param {number} proposalId - On-chain proposal ID
 * @returns {Promise<{status: string, txHash: string}>}
 */
const finalizeOne = async (proposalId) => {
  const governance = getGovernanceReadOnly();
  const governanceWrite = getGovernanceContract();

  console.log(`⏰ Finalizing proposal #${proposalId}...`);

  // Get current proposal state from chain
  const proposal = await governance.getProposal(proposalId);
  
  if (proposal.status !== PROPOSAL_STATUS.ACTIVE) {
    console.log(`  Proposal #${proposalId} already finalized (status: ${proposal.status})`);
    return { status: statusToString(proposal.status), txHash: null };
  }

  // Check if voting period has ended
  const now = Math.floor(Date.now() / 1000);
  if (now <= proposal.endTime) {
    console.log(`  Proposal #${proposalId} voting still active until ${new Date(proposal.endTime * 1000).toISOString()}`);
    return { status: 'active', txHash: null };
  }

  // Finalize on-chain
  let finalizeTxHash = null;
  try {
    const result = await governanceWrite.finalizeProposal(proposalId);
    finalizeTxHash = result.txHash;
  } catch (err) {
    console.error(`  Failed to finalize on-chain: ${err.message}`);
    throw err;
  }

  // Get final result
  const finalProposal = await governance.getProposal(proposalId);
  const voteResult = await governance.getVoteResult(proposalId);
  
  const finalStatus = statusToString(finalProposal.status);
  const passed = finalProposal.status === PROPOSAL_STATUS.PASSED;

  console.log(`  Result: ${finalStatus.toUpperCase()} — ${voteResult.voters} voters`);

  // Find business by hash
  const business = await findBusinessByHash(proposal.businessHash);

  // Execute result
  if (passed) {
    await executePassedProposal(proposalId, proposal.proposalType, business);
  } else if (finalProposal.status === PROPOSAL_STATUS.REJECTED) {
    await executeRejectedProposal(proposalId, proposal.proposalType, business);
  }

  // Send notifications
  try {
    await notificationService.notifyProposalResult(
      proposalId,
      passed,
      business?.name || `Proposal #${proposalId}`
    );
    if (business) {
      await notificationService.notifyBusinessOwner(business._id, passed);
    }
  } catch (err) {
    console.error("Failed to send finalization notifications:", err.message);
  }

  return { status: finalStatus, txHash: finalizeTxHash };
};

/**
 * Convert status number to string
 */
const statusToString = (status) => {
  const statuses = ['active', 'passed', 'rejected', 'executed'];
  return statuses[status] || 'unknown';
};

/**
 * Find business by its hash stored on-chain
 */
const findBusinessByHash = async (businessHash) => {
  try {
    const businesses = await Business.find({}).lean();
    const hashHex = Buffer.from(businessHash).toString('hex');
    
    for (const business of businesses) {
      const idHash = crypto.createHash('sha256').update(business._id.toString()).digest('hex');
      if (idHash === hashHex) {
        return business;
      }
    }
    return null;
  } catch (err) {
    console.error('Failed to find business by hash:', err.message);
    return null;
  }
};

/**
 * Execute actions for a passed proposal
 */
const executePassedProposal = async (proposalId, proposalType, business) => {
  const governanceWrite = getGovernanceContract();
  const adminPublicKey = process.env.STELLAR_ADMIN_PUBLIC_KEY;

  // ProposalType 0 = BusinessApproval
  if (proposalType === 0 && business) {
    const fullBusiness = await Business.findById(business._id);
    
    // Deploy Soroban token on Stellar if not already deployed
    if (!fullBusiness.tokenDetails?.contractAddress) {
      try {
        const tokenName = fullBusiness.tokenDetails?.tokenName || `${fullBusiness.name} Token`;
        const tokenSymbol = fullBusiness.tokenDetails?.tokenSymbol || fullBusiness.name.substring(0, 4).toUpperCase();
        const totalTokens = fullBusiness.tokenDetails?.totalTokens || 100;
        
        const deployment = await stellarService.deployBusinessToken(
          tokenName,
          tokenSymbol,
          totalTokens,
          fullBusiness._id.toString(),
          fullBusiness.tokenDetails?.tokenPrice || 0,
          fullBusiness.fundingGoal || 0
        );
        fullBusiness.tokenDetails.contractAddress = deployment.contractAddress;
        fullBusiness.escrowAddress = process.env.ESCROW_CONTRACT_ID || process.env.ESCROW_CONTRACT_ADDRESS || "";
        console.log(`  🚀 Token deployed at ${deployment.contractAddress}`);
      } catch (deployErr) {
        console.error("  Failed to deploy token:", deployErr.message);
      }
    }

    fullBusiness.status = "fundraising";
    fullBusiness.fundingDeadline = new Date(
      Date.now() + FUNDING_DEADLINE_DAYS * 24 * 60 * 60 * 1000
    );
    await fullBusiness.save();
    console.log(`  ✅ Business "${fullBusiness.name}" approved — now fundraising (deadline: ${fullBusiness.fundingDeadline.toISOString()})`);

    // Notify business owner
    try {
      await notificationService.createNotification(
        fullBusiness.ownerId,
        "business_fundraising",
        "🚀 Your Business is Now Open for Investment!",
        `"${fullBusiness.name}" has been approved and is now listed for investors.`,
        `/businesses/${fullBusiness._id}`
      );
    } catch (notifErr) {
      console.error("  Fundraising notification failed:", notifErr.message);
    }

    // Notify all investors about new opportunity
    try {
      const allInvestors = await User.find({
        role: "investor",
        walletAddress: { $exists: true, $ne: null }
      });
      const Notification = require("../models/Notification");
      const investorNotifs = allInvestors
        .filter((u) => u._id.toString() !== fullBusiness.ownerId.toString())
        .map((u) => ({
          userId: u._id,
          type: "new_investment_opportunity",
          title: `💼 New Investment: ${fullBusiness.name}`,
          message: `"${fullBusiness.name}" is now open for investment! Goal: ₹${fullBusiness.fundingGoal}. ${fullBusiness.revenueSharePercentage}% revenue share.`,
          link: `/businesses/${fullBusiness._id}`,
        }));
      if (investorNotifs.length > 0) {
        await Notification.insertMany(investorNotifs);
        console.log(`  📢 Notified ${investorNotifs.length} investors`);
      }
    } catch (notifErr) {
      console.error("  Investor notification failed:", notifErr.message);
    }

    // Mark proposal as executed on-chain
    try {
      await governanceWrite.markExecuted(adminPublicKey, proposalId);
    } catch (err) {
      console.error("  Failed to mark executed on-chain:", err.message);
    }
  }

  // ProposalType 1 = RevenueVerification - distribute dividends
  if (proposalType === 1 && business) {
    try {
      const divRecord = await DividendRecord.findOne({
        businessId: business._id,
        status: "pending",
      }).sort("-createdAt");

      if (!divRecord) {
        console.error("  No pending dividend record found");
        return;
      }

      const depositIndex = divRecord.dividendDepositIndex || 0;

      // Call DividendDistributor.approveAndDistribute on-chain
      const result = await dividendDistributorService.distributeAfterVote(
        business._id.toString(),
        depositIndex
      );

      const normalizedPayouts = (result.results || []).map((payout) => ({
        ...payout,
        walletAddress: canonicalWalletAddress(payout.walletAddress),
      }));

      divRecord.individualPayouts = []; divRecord.individualPayouts.push(...normalizedPayouts); divRecord.markModified('individualPayouts');

      divRecord.distributedAt = new Date();
      divRecord.distributionTxHash = result.txHash;
      const allSuccess = normalizedPayouts.length > 0 && normalizedPayouts.every((p) => p.success);
      const allFailed = normalizedPayouts.length > 0 && normalizedPayouts.every((p) => !p.success);
      divRecord.status = allSuccess
        ? "completed"
        : allFailed
          ? "failed"
          : "partially_failed";
      await divRecord.save();

      // Notify investors
      const fullBusiness = await Business.findById(business._id);
      const users = await User.find({ walletAddress: { $exists: true, $ne: null } });
      
      for (const user of users) {
        try {
          const isInvestor = await stellarService.isBusinessInvestor(
            fullBusiness.tokenDetails.contractAddress,
            user.walletAddress
          );
          if (isInvestor) {
            await notificationService.notifyDividendReceived(
              user._id,
              'See portfolio',
              fullBusiness.name
            );
          }
        } catch {}
      }

      console.log(`  💰 Dividends distributed (tx: ${result.txHash})`);
    } catch (err) {
      console.error("  Failed to distribute dividends:", err.message);
    }
  }
};

/**
 * Execute actions for a rejected proposal
 */
const executeRejectedProposal = async (proposalId, proposalType, business) => {
  // ProposalType 0 = BusinessApproval
  if (proposalType === 0 && business) {
    const fullBusiness = await Business.findById(business._id);
    if (fullBusiness) {
      fullBusiness.status = "rejected";
      fullBusiness.rejectionReason = "Rejected by community governance vote";
      await fullBusiness.save();
      console.log(`  ❌ Business "${fullBusiness.name}" rejected by community vote`);
    }
  }

  // ProposalType 1 = RevenueVerification - reject dividend distribution
  if (proposalType === 1 && business) {
    try {
      const divRecord = await DividendRecord.findOne({
        businessId: business._id,
        status: "pending",
      }).sort("-createdAt");

      if (divRecord) {
        const depositIndex = divRecord.dividendDepositIndex || 0;

        // Reject on-chain to return XLM to the depositor
        try {
          const refund = await dividendDistributorService.rejectAfterVote(
            business._id.toString(),
            depositIndex,
            divRecord.dividendDepositAmountXLM
          );
          if (refund.success) {
            console.log(`  ❌ Distribution rejected — XLM refunded to owner (tx: ${refund.txHash})`);
          } else {
            console.warn(`  ❌ Distribution rejected — refund NOT sent (${refund.reason})`);
          }
        } catch (contractErr) {
          console.error("  Failed to refund deposit:", contractErr.message);
        }

        divRecord.status = "rejected";
        divRecord.rejectionReason = "Revenue verification vote failed";
        await divRecord.save();
        console.log(`  ❌ Dividend distribution rejected`);
      }
    } catch (err) {
      console.error("  Failed to reject distribution:", err.message);
    }
  }
};

/**
 * Main cron job: check and finalize all expired proposals
 * Queries on-chain for active proposals with ended voting periods
 */
const checkAndFinalize = async () => {
  try {
    const governance = getGovernanceReadOnly();
    const proposals = await governance.getAllProposals();
    
    const now = Math.floor(Date.now() / 1000);
    const expiredActive = proposals.filter(
      p => p.status === PROPOSAL_STATUS.ACTIVE && now > p.endTime
    );

    if (!expiredActive.length) {
      console.log("⏰ No expired proposals to finalize");
      return;
    }

    console.log(`⏰ Found ${expiredActive.length} expired proposal(s) to finalize`);

    for (const proposal of expiredActive) {
      try {
        await finalizeOne(proposal.id);
      } catch (err) {
        console.error(`Failed to finalize proposal #${proposal.id}:`, err.message);
      }
    }
  } catch (error) {
    console.error("checkAndFinalize error:", error.message);
  }
};

module.exports = {
  checkAndFinalize,
  finalizeOne,
};

