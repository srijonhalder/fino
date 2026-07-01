const crypto = require('crypto');
const { getDocumentRegistryContract } = require('../config/governance');

/**
 * ZK Proof Service (Simulated for Hackathon)
 *
 * In production, this would use circom/snarkjs to generate actual zero-knowledge proofs.
 * For the hackathon demo, we simulate ZK proofs by:
 *   1. Computing the claim (e.g., "revenue > threshold")
 *   2. Hashing the private value + claim to create a "proof hash"
 *   3. Storing the claim result (true/false) on-chain via DocumentRegistry
 *
 * The privacy property is demonstrated: voters see "Revenue > ₹30,000 = TRUE"
 * but never see the actual revenue amount.
 */

/**
 * Generate a simulated ZK range proof for revenue verification
 * Proves: "actualRevenue > threshold" without revealing actualRevenue
 *
 * @param {number} actualRevenue - The private value (never revealed)
 * @param {number} threshold - The public threshold
 * @returns {{isAboveThreshold: boolean, proofHash: string, claim: string}}
 */
const generateRevenueRangeProof = (actualRevenue, threshold) => {
  // In production: circom circuit would prove this
  // For hackathon: compute claim result and hash

  const isAboveThreshold = actualRevenue > threshold;

  // Create a proof hash that encodes the private value + claim
  // This simulates what snarkjs.groth16.prove() would generate
  const proofData = JSON.stringify({
    privateInput: actualRevenue,
    publicInput: threshold,
    result: isAboveThreshold,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const proofHash = crypto.createHash('sha256').update(proofData).digest('hex');

  return {
    isAboveThreshold,
    proofHash,
    claim: `Monthly revenue > ₹${threshold.toLocaleString()}`,
    threshold,
    // Note: actualRevenue is NEVER included in the return value
    // This simulates the zero-knowledge property
  };
};

/**
 * Generate a simulated ZK proof for business age
 * Proves: "business is older than minimumYears" without revealing exact registration date
 *
 * @param {number} yearsInOperation - Private: actual years
 * @param {number} minimumYears - Public: minimum required years
 * @returns {{meetsMinimum: boolean, proofHash: string, claim: string}}
 */
const generateBusinessAgeProof = (yearsInOperation, minimumYears = 0.5) => {
  const meetsMinimum = yearsInOperation >= minimumYears;

  const proofData = JSON.stringify({
    privateInput: yearsInOperation,
    publicInput: minimumYears,
    result: meetsMinimum,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const proofHash = crypto.createHash('sha256').update(proofData).digest('hex');

  return {
    meetsMinimum,
    proofHash,
    claim: `Business age > ${minimumYears * 12} months`,
    minimumYears,
  };
};

/**
 * Generate a ZK proof for funding utilization
 * Proves: "utilization percentage > threshold" without revealing exact amounts
 *
 * @param {number} raisedAmount - Private: actual raised
 * @param {number} fundingGoal - Public: the goal
 * @param {number} thresholdPercent - Public: minimum utilization %
 * @returns {{meetsThreshold: boolean, proofHash: string, claim: string}}
 */
const generateFundingUtilizationProof = (raisedAmount, fundingGoal, thresholdPercent = 50) => {
  const utilization = fundingGoal > 0 ? (raisedAmount / fundingGoal) * 100 : 0;
  const meetsThreshold = utilization >= thresholdPercent;

  const proofData = JSON.stringify({
    privateInput: raisedAmount,
    publicInputs: { fundingGoal, thresholdPercent },
    result: meetsThreshold,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  });

  const proofHash = crypto.createHash('sha256').update(proofData).digest('hex');

  return {
    meetsThreshold,
    proofHash,
    claim: `Funding utilization > ${thresholdPercent}%`,
    thresholdPercent,
  };
};

/**
 * Store a ZK range proof result on-chain
 *
 * @param {string} businessId - MongoDB business ID
 * @param {string} claim - Human-readable claim
 * @param {number} threshold - The public threshold
 * @param {boolean} isAbove - Whether the private value is above threshold
 * @param {string} proofHash - Hash of the ZK proof
 * @returns {Promise<{txHash: string}>}
 */
const storeProofOnChain = async (businessId, claim, threshold, isAbove, proofHash) => {
  try {
    const registry = getDocumentRegistryContract();
    const proofHashBytes32 = `0x${proofHash}`;

    const tx = await registry.addRangeProof(
      businessId.toString(),
      claim,
      threshold,
      isAbove,
      proofHashBytes32
    );
    await tx.wait();

    console.log(`✅ ZK proof stored on-chain: "${claim}" = ${isAbove} — tx: ${tx.hash}`);
    return { txHash: tx.hash };
  } catch (error) {
    console.error(`❌ Failed to store ZK proof on-chain:`, error.message);
    throw error;
  }
};

/**
 * Generate and store revenue verification ZK proof for a business
 * Called when a business submits a revenue report
 *
 * @param {string} businessId - MongoDB business ID
 * @param {number} revenueAmount - The private revenue amount
 * @param {number} threshold - Public threshold (default: ₹30,000)
 * @returns {Promise<{proof: Object, txHash: string}>}
 */
const verifyRevenueWithZKProof = async (businessId, revenueAmount, threshold = 30000) => {
  // Generate the proof
  const proof = generateRevenueRangeProof(revenueAmount, threshold);

  // Store on-chain
  const { txHash } = await storeProofOnChain(
    businessId,
    proof.claim,
    threshold,
    proof.isAboveThreshold,
    proof.proofHash
  );

  return { proof, txHash };
};

module.exports = {
  generateRevenueRangeProof,
  generateBusinessAgeProof,
  generateFundingUtilizationProof,
  storeProofOnChain,
  verifyRevenueWithZKProof,
};
