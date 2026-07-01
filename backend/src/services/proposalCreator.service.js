const crypto = require('crypto');
const Business = require('../models/Business');
const { getGovernanceContract, PROPOSAL_TYPES, GOVERNANCE_PARAMS } = require('../config/governance');
const notificationService = require('./notification.service');
const { adminKeypair } = require('../config/stellar');

/**
 * Proposal Creator Service
 * Creates governance proposals on-chain after oracle verification completes.
 * 
 * Note: Proposals are now stored only on-chain, not in MongoDB.
 */

// Helper to extract meaningful error details
const formatError = (err) => {
  if (!err) return 'Unknown error';
  
  // Handle Soroban contract errors
  if (err.message?.includes('VM call trapped')) {
    return `Contract execution failed: ${err.message}`;
  }
  
  // Handle simulation errors
  if (err.message?.includes('simulation')) {
    return `Transaction simulation failed: ${err.message}`;
  }
  
  // Handle auth errors
  if (err.message?.includes('Not a proposal creator') || err.message?.includes('Not authorized')) {
    return `Authorization error - admin not authorized as proposal creator: ${err.message}`;
  }
  
  return err.message || err.toString();
};

/**
 * Create a governance proposal for a business approval vote
 * @param {string} businessId - MongoDB business ID
 * @returns {Promise<{proposalId: number, txHash: string}>}
 */
const createBusinessProposal = async (businessId) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 PROPOSAL CREATION STARTED for business: ${businessId}`);
  console.log(`${'='.repeat(60)}`);
  
  const business = await Business.findById(businessId);
  if (!business) {
    console.error(`❌ Business not found in database: ${businessId}`);
    throw new Error(`Business not found: ${businessId}`);
  }
  
  console.log(`📋 Business details:`);
  console.log(`   - Name: ${business.name}`);
  console.log(`   - Status: ${business.status}`);
  console.log(`   - Attestation: ${business.attestationStatus}`);
  console.log(`   - Existing proposalId: ${business.proposalId || 'none'}`);
  
  if (business.status !== 'vote_required') {
    console.error(`❌ Business status is "${business.status}", expected "vote_required"`);
    throw new Error(`Business is not ready for voting. Status: ${business.status}`);
  }

  console.log(`📝 Creating governance proposal for: ${business.name}`);

  // Build metadata (in production this would go to IPFS)
  const metadata = JSON.stringify({
    businessName: business.name,
    category: business.category,
    fundingGoal: business.fundingGoal,
    revenueShare: business.revenueSharePercentage,
    location: business.location,
    attestationStatus: business.attestationStatus,
    aiCreditScore: business.aiCreditScore,
    riskRating: business.riskRating,
    createdAt: new Date().toISOString(),
  });

  // For hackathon: use metadata hash as "IPFS CID"
  const metadataIpfs = `metadata_${businessId}_${Date.now()}`;

  // Create business ID hash for on-chain storage (32 bytes)
  const businessHash = crypto.createHash('sha256').update(businessId.toString()).digest('hex');
  
  console.log(`🔗 On-chain parameters:`);
  console.log(`   - businessHash: ${businessHash.substring(0, 16)}...`);
  console.log(`   - metadataIpfs: ${metadataIpfs}`);
  console.log(`   - proposer (admin): ${adminKeypair.publicKey()}`);

  // Create on-chain proposal
  let result;
  try {
    console.log(`⏳ Calling governance contract createProposal()...`);
    const governance = getGovernanceContract();
    result = await governance.createProposal(
      adminKeypair.publicKey(), // proposer (admin creates on behalf of system)
      PROPOSAL_TYPES.BUSINESS_APPROVAL,
      businessHash,
      metadataIpfs
    );
    console.log(`✅ Contract call successful!`);
  } catch (contractErr) {
    console.error(`❌ CONTRACT ERROR during createProposal():`);
    console.error(`   - Error type: ${contractErr.constructor.name}`);
    console.error(`   - Message: ${formatError(contractErr)}`);
    if (contractErr.stack) {
      console.error(`   - Stack: ${contractErr.stack.split('\n').slice(0, 3).join('\n')}`);
    }
    throw contractErr;
  }

  const proposalId = result.proposalId;
  const txHash = result.txHash;
  
  console.log(`📊 Proposal result:`);
  console.log(`   - proposalId: ${proposalId}`);
  console.log(`   - txHash: ${txHash}`);

  // Calculate voting end date (for reference)
  const votingEndsAt = new Date(Date.now() + GOVERNANCE_PARAMS.VOTING_DURATION_MINUTES * 60 * 1000);

  // Update business status with proposal reference
  try {
    business.proposalId = proposalId;
    business.status = 'voting';
    await business.save();
    console.log(`💾 Business status updated to "voting" with proposalId=${proposalId}`);
  } catch (dbErr) {
    console.error(`❌ DATABASE ERROR updating business status:`);
    console.error(`   - Message: ${dbErr.message}`);
    throw dbErr;
  }

  console.log(`✅ Proposal #${proposalId} created for ${business.name} — voting until ${votingEndsAt.toISOString()}`);
  console.log(`${'='.repeat(60)}\n`);

  // Notify all users with wallets about the new proposal
  try {
    await notificationService.notifyUsersAboutNewProposal(
      proposalId,
      business.name,
      'business_approval'
    );
  } catch (err) {
    console.error('Failed to send new proposal notifications:', err.message);
  }

  return { proposalId, txHash };
};

/**
 * Create a revenue verification proposal
 * @param {string} businessId - MongoDB business ID
 * @param {string} dividendRecordId - MongoDB dividend record ID
 * @returns {Promise<{proposalId: number, txHash: string}>}
 */
const createRevenueVerificationProposal = async (businessId, dividendRecordId) => {
  const business = await Business.findById(businessId);
  if (!business) throw new Error(`Business not found: ${businessId}`);

  const metadataIpfs = `revenue_${businessId}_${dividendRecordId}_${Date.now()}`;
  const businessHash = crypto.createHash('sha256').update(businessId.toString()).digest('hex');

  const governance = getGovernanceContract();
  const result = await governance.createProposal(
    adminKeypair.publicKey(),
    PROPOSAL_TYPES.REVENUE_VERIFICATION,
    businessHash,
    metadataIpfs
  );

  const proposalId = result.proposalId;
  const txHash = result.txHash;

  console.log(`✅ Revenue verification proposal #${proposalId} created for ${business.name}`);

  // Notify users about the new revenue verification proposal
  try {
    await notificationService.notifyUsersAboutNewProposal(
      proposalId,
      business.name,
      'revenue_verification'
    );
  } catch (err) {
    console.error('Failed to send new proposal notifications:', err.message);
  }

  return { proposalId, txHash };
};

/**
 * Check for businesses needing proposals and create them (cron job)
 */
const checkPendingBusinesses = async () => {
  console.log(`\n${'*'.repeat(60)}`);
  console.log(`🔄 CRON JOB: checkPendingBusinesses started at ${new Date().toISOString()}`);
  console.log(`${'*'.repeat(60)}`);
  
  try {
    const pendingBusinesses = await Business.find({ status: 'vote_required' });
    console.log(`🔍 Found ${pendingBusinesses.length} businesses needing governance proposals`);

    if (pendingBusinesses.length === 0) {
      console.log(`ℹ️  No businesses in vote_required status. Nothing to do.`);
      return;
    }

    for (const biz of pendingBusinesses) {
      console.log(`\n🏢 Processing business: ${biz.name} (${biz._id})`);
      try {
        const result = await createBusinessProposal(biz._id.toString());
        console.log(`✅ Successfully created proposal #${result.proposalId} for ${biz.name}`);
      } catch (err) {
        console.error(`❌ Failed to create proposal for ${biz.name}:`);
        console.error(`   - Error: ${formatError(err)}`);
        // Continue to next business, don't stop the entire cron job
      }
    }
    
    console.log(`\n✅ checkPendingBusinesses completed at ${new Date().toISOString()}`);
  } catch (error) {
    console.error(`❌ checkPendingBusinesses CRITICAL ERROR:`);
    console.error(`   - Message: ${error.message}`);
    console.error(`   - Stack: ${error.stack}`);
  }
  
  console.log(`${'*'.repeat(60)}\n`);
};

module.exports = {
  createBusinessProposal,
  createRevenueVerificationProposal,
  checkPendingBusinesses,
};
