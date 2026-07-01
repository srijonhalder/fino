const Business = require('../models/Business');
const User = require('../models/User');
const stellarService = require('./stellar.service');
const emailService = require('./email.service');
const { BUSINESS_STATUS } = require('../utils/constants');

/**
 * Check for expired fundraising campaigns and process refunds
 * 
 * Note: With on-chain investment tracking, refunds need to query
 * BusinessToken holders and refund their XLM from escrow.
 */
const checkExpiredCampaigns = async () => {
  try {
    console.log('⏰ Checking for expired fundraising campaigns...');

    // Find all businesses with expired deadlines still in fundraising status
    const expiredBusinesses = await Business.find({
      status: BUSINESS_STATUS.FUNDRAISING,
      fundingDeadline: { $lt: new Date() },
    });

    if (expiredBusinesses.length === 0) {
      console.log('✅ No expired campaigns found.');
      return { processed: 0, refunds: 0 };
    }

    console.log(`⚠️ Found ${expiredBusinesses.length} expired campaign(s). Processing refunds...`);

    let totalRefunds = 0;

    for (const business of expiredBusinesses) {
      try {
        // Get all users with wallets and check their on-chain token balances
        const users = await User.find({ 
          walletAddress: { $exists: true, $ne: null } 
        }).lean();

        if (!business.tokenDetails?.contractAddress) {
          console.log(`  No token contract for ${business.name} — skipping refunds`);
          business.status = BUSINESS_STATUS.EXPIRED;
          await business.save();
          continue;
        }

        // Check each user's token balance on-chain
        for (const user of users) {
          try {
            const balance = await stellarService.getBusinessTokenBalance(
              business.tokenDetails.contractAddress,
              user.walletAddress
            );
            
            const tokenBalance = Number(balance);
            if (tokenBalance <= 0) continue;

            // Calculate refund amount based on token holding
            const refundINR = tokenBalance * business.tokenDetails.tokenPrice;
            const refundXLM = refundINR / 1000; // Approximate XLM rate

            // Send refund
            const result = await stellarService.sendXLM(
              user.walletAddress, 
              refundXLM.toFixed(6)
            );

            totalRefunds++;
            console.log(`  💸 Refunded ${refundXLM.toFixed(6)} XLM to ${user.walletAddress}`);

            // Send refund email (fire and forget)
            if (user.email) {
              emailService.sendRefundEmail(
                user.email,
                user.name,
                business.name,
                refundXLM.toFixed(6)
              );
            }
          } catch (refundErr) {
            console.error(
              `❌ Refund failed for investor ${user._id} — business ${business.name}:`,
              refundErr.message
            );
          }
        }

        // Update business status
        business.status = BUSINESS_STATUS.EXPIRED;
        await business.save();

        console.log(`✅ Campaign expired: ${business.name} — ${totalRefunds} investor(s) refunded`);
      } catch (bizErr) {
        console.error(`❌ Failed to process expired campaign ${business.name}:`, bizErr.message);
      }
    }

    console.log(
      `⏰ Deadline check complete: ${expiredBusinesses.length} campaign(s) expired, ${totalRefunds} refund(s) processed.`
    );

    return { processed: expiredBusinesses.length, refunds: totalRefunds };
  } catch (error) {
    console.error('❌ Deadline checker error:', error.message);
    return { processed: 0, refunds: 0, error: error.message };
  }
};

module.exports = { checkExpiredCampaigns };
