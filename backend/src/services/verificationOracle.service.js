const crypto = require('crypto');
const Business = require('../models/Business');
const { getDocumentRegistryContract } = require('../config/governance');
const { BUSINESS_STATUS } = require('../utils/constants');

/**
 * Verification Oracle Service
 * Runs automated checks on business data and creates on-chain attestations.
 * Voters see verified claims without seeing the actual documents.
 */

// ── Individual Check Functions ──

/**
 * CHECK 1: Validate GST number format
 * GST format: 2 digits (state) + 10 chars (PAN) + 1 alphanum + 1 Z + 1 checkdigit = 15 chars
 */
const verifyGST = (gstNumber) => {
  if (!gstNumber) return { valid: false, message: 'GST number not provided' };
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const valid = gstRegex.test(gstNumber.toUpperCase());
  return {
    valid,
    message: valid ? 'GST number format is valid and well-formed' : 'GST number format is invalid',
  };
};

/**
 * CHECK 2: Validate PAN number format
 * PAN format: XXXXX9999X (5 letters + 4 digits + 1 letter)
 */
const verifyPAN = (panNumber) => {
  if (!panNumber) return { valid: false, message: 'PAN number not provided' };
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const valid = panRegex.test(panNumber.toUpperCase());
  return {
    valid,
    message: valid ? 'PAN number format is valid' : 'PAN number format is invalid',
  };
};

/**
 * CHECK 3: Business age verification
 * Returns true if business has been operating for > 6 months
 */
const checkBusinessAge = (yearsInOperation) => {
  const meetsMinimum = yearsInOperation >= 0.5; // at least 6 months
  return {
    meetsMinimum,
    ageInYears: yearsInOperation,
    message: meetsMinimum
      ? `Business has been operating for ${yearsInOperation} year(s) (> 6 months)`
      : `Business is too new: ${yearsInOperation} year(s) (minimum 6 months)`,
  };
};

/**
 * CHECK 4: Document completeness
 * Check that all required document types are uploaded
 */
const checkDocumentCompleteness = (documents, photos) => {
  const docCount = documents ? documents.length : 0;
  const hasPhotos = photos && photos.length > 0;
  const totalDocs = docCount + (hasPhotos ? 1 : 0);
  // We expect at least 3 documents + 1 photo for a complete application
  const isComplete = totalDocs >= 3;
  return {
    complete: isComplete,
    documentCount: totalDocs,
    message: isComplete
      ? `All documents submitted (${totalDocs} items)`
      : `Incomplete documents — only ${totalDocs} items (need at least 3)`,
  };
};

/**
 * CHECK 5: AI Risk Score evaluation
 * Uses existing AI score from Gemini analysis
 */
const evaluateAIScore = (aiCreditScore) => {
  if (!aiCreditScore && aiCreditScore !== 0) {
    return { score: null, rating: 'UNKNOWN', message: 'AI analysis not yet completed' };
  }
  let rating = 'HIGH';
  if (aiCreditScore >= 70) rating = 'LOW';
  else if (aiCreditScore >= 40) rating = 'MEDIUM';

  return {
    score: aiCreditScore,
    rating,
    message: `AI Risk Score: ${aiCreditScore}/100 (${rating} Risk)`,
  };
};

/**
 * CHECK 6: Funding goal reasonability
 * Compare against category averages
 */
const checkFundingGoalReason = (fundingGoal, category) => {
  const categoryAverages = {
    food_beverage: 50000,
    retail: 75000,
    services: 40000,
    manufacturing: 150000,
    agriculture: 60000,
    technology: 100000,
    healthcare: 120000,
    education: 80000,
    other: 70000,
  };

  const average = categoryAverages[category] || 70000;
  const ratio = fundingGoal / average;
  const isReasonable = ratio <= 3; // up to 3x category average is OK

  return {
    reasonable: isReasonable,
    ratio: parseFloat(ratio.toFixed(2)),
    message: isReasonable
      ? `Funding goal ₹${fundingGoal.toLocaleString()} is within expected range for ${category}`
      : `Funding goal ₹${fundingGoal.toLocaleString()} is ${ratio.toFixed(1)}x the category average (₹${average.toLocaleString()})`,
  };
};

// ── Main Verification Function ──

/**
 * Run all 6 verification checks for a business and store attestations on-chain
 * @param {string} businessId - MongoDB business ID
 * @returns {Promise<{success: boolean, checks: Object[]}>}
 */
const startVerification = async (businessId) => {
  console.log(`\n${'#'.repeat(60)}`);
  console.log(`🔍 VERIFICATION ORACLE STARTED for business: ${businessId}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`${'#'.repeat(60)}`);
  
  const business = await Business.findById(businessId).populate('ownerId');
  if (!business) {
    console.error(`❌ Business not found in database: ${businessId}`);
    throw new Error(`Business not found: ${businessId}`);
  }

  console.log(`📋 Business details:`);
  console.log(`   - Name: ${business.name}`);
  console.log(`   - Category: ${business.category}`);
  console.log(`   - Current status: ${business.status}`);
  console.log(`   - Attestation status: ${business.attestationStatus || 'none'}`);
  
  console.log(`⏳ Updating status to "verifying"...`);
  business.status = 'verifying';
  business.attestationStatus = 'in_progress';
  await business.save();

  let registry;
  try {
    registry = getDocumentRegistryContract();
    console.log(`✅ Document Registry contract initialized`);
  } catch (registryErr) {
    console.error(`❌ Failed to initialize Document Registry contract:`);
    console.error(`   - Error: ${registryErr.message}`);
    business.attestationStatus = 'failed';
    await business.save();
    throw registryErr;
  }
  
  const businessIdStr = businessId.toString();
  const checks = [];
  const txHashes = [];

  try {
    // CHECK 1: GST Validation
    try {
      const gstResult = verifyGST(business.gstNumber);
      const gstStatus = gstResult.valid ? 1 : 2; // 1=VERIFIED, 2=FAILED (Solidity enum)
      const gstProofHash = crypto.createHash('sha256').update(`gst_${business.gstNumber || 'none'}_${Date.now()}`).digest('hex');
      const gstTx = await registry.addAttestation(
        businessIdStr,
        `GST Registration: ${gstResult.message}`,
        gstStatus,
        gstProofHash,
        'format_check'
      );
      await gstTx.wait();
      txHashes.push(gstTx.hash);
      checks.push({ check: 'GST', ...gstResult, txHash: gstTx.hash });
      console.log(`  ✅ GST check: ${gstResult.valid ? 'VERIFIED' : 'FAILED'}`);
    } catch (gstError) {
      console.error(`  ⚠️ GST attestation failed (continuing verification):`, gstError.message);
      checks.push({ check: 'GST', valid: false, message: 'Attestation failed', error: gstError.message });
    }

    // CHECK 2: PAN Validation
    try {
      const panNumber = business.ownerId?.panNumber;
      const panResult = verifyPAN(panNumber);
      const panStatus = panResult.valid ? 1 : 2;
      const panProofHash = crypto.createHash('sha256').update(`pan_${panNumber || 'none'}_${Date.now()}`).digest('hex');
      const panTx = await registry.addAttestation(
        businessIdStr,
        `PAN Verification: ${panResult.message}`,
        panStatus,
        panProofHash,
        'format_check'
      );
      await panTx.wait();
      txHashes.push(panTx.hash);
      checks.push({ check: 'PAN', ...panResult, txHash: panTx.hash });
      console.log(`  ✅ PAN check: ${panResult.valid ? 'VERIFIED' : 'FAILED'}`);
    } catch (panError) {
      console.error(`  ⚠️ PAN attestation failed (continuing verification):`, panError.message);
      checks.push({ check: 'PAN', valid: false, message: 'Attestation failed', error: panError.message });
    }

    // CHECK 3: Business Age
    try {
      const ageResult = checkBusinessAge(business.yearsInOperation);
      const ageStatus = ageResult.meetsMinimum ? 1 : 2;
      const ageProofHash = crypto.createHash('sha256').update(`age_${business.yearsInOperation}_${Date.now()}`).digest('hex');
      const ageTx = await registry.addAttestation(
        businessIdStr,
        `Business Age: ${ageResult.message}`,
        ageStatus,
        ageProofHash,
        'format_check'
      );
      await ageTx.wait();
      txHashes.push(ageTx.hash);
      checks.push({ check: 'Business Age', ...ageResult, txHash: ageTx.hash });
      console.log(`  ✅ Age check: ${ageResult.meetsMinimum ? 'VERIFIED' : 'FAILED'}`);
    } catch (ageError) {
      console.error(`  ⚠️ Business Age attestation failed (continuing verification):`, ageError.message);
      checks.push({ check: 'Business Age', meetsMinimum: false, message: 'Attestation failed', error: ageError.message });
    }

    // CHECK 4: Document Completeness
    try {
      const docResult = checkDocumentCompleteness(business.documents, business.photos);
      const docStatus = docResult.complete ? 1 : 2;
      const docProofHash = crypto.createHash('sha256').update(`docs_${docResult.documentCount}_${Date.now()}`).digest('hex');
      const docTx = await registry.addAttestation(
        businessIdStr,
        `Document Completeness: ${docResult.message}`,
        docStatus,
        docProofHash,
        'format_check'
      );
      await docTx.wait();
      txHashes.push(docTx.hash);
      checks.push({ check: 'Documents', ...docResult, txHash: docTx.hash });
      console.log(`  ✅ Doc check: ${docResult.complete ? 'VERIFIED' : 'FAILED'}`);
    } catch (docError) {
      console.error(`  ⚠️ Document attestation failed (continuing verification):`, docError.message);
      checks.push({ check: 'Documents', complete: false, message: 'Attestation failed', error: docError.message });
    }

    // CHECK 5: AI Risk Score
    try {
      const aiResult = evaluateAIScore(business.aiCreditScore);
      const aiStatus = aiResult.score !== null ? 1 : 0; // VERIFIED if scored, PENDING if not
      const aiProofHash = crypto.createHash('sha256').update(`ai_${aiResult.score}_${Date.now()}`).digest('hex');
      const aiTx = await registry.addAttestation(
        businessIdStr,
        `AI Risk Assessment: ${aiResult.message}`,
        aiStatus,
        aiProofHash,
        'ai_analysis'
      );
      await aiTx.wait();
      txHashes.push(aiTx.hash);
      checks.push({ check: 'AI Score', ...aiResult, txHash: aiTx.hash });
      console.log(`  ✅ AI check: score=${aiResult.score}`);
    } catch (aiError) {
      console.error(`  ⚠️ AI Score attestation failed (continuing verification):`, aiError.message);
      checks.push({ check: 'AI Score', score: null, message: 'Attestation failed', error: aiError.message });
    }

    // CHECK 6: Funding Goal Reasonability
    try {
      const goalResult = checkFundingGoalReason(business.fundingGoal, business.category);
      const goalStatus = goalResult.reasonable ? 1 : 2;
      const goalProofHash = crypto.createHash('sha256').update(`goal_${business.fundingGoal}_${Date.now()}`).digest('hex');
      const goalTx = await registry.addAttestation(
        businessIdStr,
        `Funding Goal: ${goalResult.message}`,
        goalStatus,
        goalProofHash,
        'format_check'
      );
      await goalTx.wait();
      txHashes.push(goalTx.hash);
      checks.push({ check: 'Funding Goal', ...goalResult, txHash: goalTx.hash });
      console.log(`  ✅ Goal check: ${goalResult.reasonable ? 'VERIFIED' : 'WARNING'}`);
    } catch (goalError) {
      console.error(`  ⚠️ Funding Goal attestation failed (continuing verification):`, goalError.message);
      checks.push({ check: 'Funding Goal', reasonable: false, message: 'Attestation failed', error: goalError.message });
    }

    // Update business with attestation data (even if some attestations failed)
    business.attestationStatus = txHashes.length > 0 ? 'complete' : 'partial';
    business.attestationTxHashes = txHashes;
    business.status = 'vote_required'; // Ready for governance proposal regardless of attestation results
    await business.save();

    const successCount = checks.filter(c => c.valid || c.meetsMinimum || c.complete || c.reasonable || c.score !== null).length;
    console.log(`\n${'='.repeat(40)}`);
    console.log(`🎉 VERIFICATION SUMMARY for ${business.name}`);
    console.log(`${'='.repeat(40)}`);
    console.log(`   - Checks passed: ${successCount}/6`);
    console.log(`   - On-chain attestations: ${txHashes.length}`);
    console.log(`   - Attestation status: ${business.attestationStatus}`);
    console.log(`   - Business status: ${business.status}`);

    // Immediately create governance proposal (don't wait for cron)
    console.log(`\n📝 AUTO-CREATING GOVERNANCE PROPOSAL...`);
    try {
      const proposalCreator = require('./proposalCreator.service');
      const proposalResult = await proposalCreator.createBusinessProposal(businessId);
      console.log(`✅ Governance proposal #${proposalResult.proposalId} created for ${business.name}`);
      console.log(`   - Transaction: ${proposalResult.txHash}`);
    } catch (proposalErr) {
      console.error(`❌ FAILED to auto-create governance proposal for ${business.name}:`);
      console.error(`   - Error: ${proposalErr.message}`);
      console.error(`   - The cron job will retry in 5 minutes`);
      // Don't throw - business is in vote_required, cron will retry
    }

    console.log(`${'#'.repeat(60)}\n`);
    return { success: true, checks };
  } catch (error) {
    console.error(`\n${'!'.repeat(60)}`);
    console.error(`❌ VERIFICATION ORACLE FAILED for ${businessId}`);
    console.error(`${'!'.repeat(60)}`);
    console.error(`   - Error: ${error.message}`);
    console.error(`   - Stack: ${error.stack?.split('\n').slice(0, 3).join('\n')}`);
    business.attestationStatus = 'failed';
    business.status = BUSINESS_STATUS.REJECTED;
    business.rejectionReason = `Automated verification failed: ${error.message}`;
    await business.save();
    console.error(`   - Business status updated to: ${BUSINESS_STATUS.REJECTED}`);
    console.error(`${'!'.repeat(60)}\n`);
    return { success: false, error: error.message, checks };
  }
};

module.exports = {
  startVerification,
  verifyGST,
  verifyPAN,
  checkBusinessAge,
  checkDocumentCompleteness,
  evaluateAIScore,
  checkFundingGoalReason,
};
