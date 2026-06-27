/**
 * Governance Configuration for Fino
 * 
 * This module provides access to on-chain governance contracts via Soroban.
 * All mock implementations have been removed - data is fetched directly from chain.
 */

const stellarService = require('../services/stellar.service');

// Contract addresses (from deployed .env)
const DOCUMENT_REGISTRY_ADDRESS = process.env.DOCUMENT_REGISTRY_ID;
const GOVERNANCE_CONTRACT_ADDRESS = process.env.GOVERNANCE_CONTRACT_ID;
const DIVIDEND_DISTRIBUTOR_ADDRESS = process.env.DIVIDEND_CONTRACT_ID;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ID;

// ── Governance Parameters ──
// These match the constants in the governance smart contract
const GOVERNANCE_PARAMS = {
  MIN_VOTERS: 3,
  APPROVAL_PERCENT: 60,
  EMERGENCY_APPROVAL: 80,
  EMERGENCY_MIN_VOTERS: 5,
  VOTING_DURATION_MINUTES: 15, // For testing (production: 2 days)
};

// ── Proposal Type Enum mapping (matches Soroban enum) ──
const PROPOSAL_TYPES = {
  BUSINESS_APPROVAL: 0,
  REVENUE_VERIFICATION: 1,
  PARAMETER_CHANGE: 2,
  EMERGENCY_DELIST: 3,
};

// ── Proposal Status Enum mapping (matches Soroban enum) ──
const PROPOSAL_STATUS = {
  ACTIVE: 0,
  PASSED: 1,
  REJECTED: 2,
  EXECUTED: 3,
};

/**
 * Governance Contract Interface (On-Chain)
 * 
 * Wrapper class providing a clean interface to the Soroban governance contract.
 * All methods call the actual deployed contract via stellar.service.js
 */
class GovernanceContract {
  /**
   * Get proposal count from contract
   */
  async proposalCount() {
    return await stellarService.getProposalCount();
  }

  /**
   * Get proposal by ID
   * @param {number} proposalId 
   */
  async getProposal(proposalId) {
    return await stellarService.getProposal(proposalId);
  }

  /**
   * Get vote result for a proposal
   * Returns { upvotes, downvotes, voters, status }
   */
  async getVoteResult(proposalId) {
    return await stellarService.getVoteResult(proposalId);
  }

  /**
   * Get voting power for an address (always 1 in new 1-wallet-1-vote system)
   */
  async getVotingPower(voterAddress) {
    return await stellarService.getVotingPower(voterAddress);
  }

  /**
   * Create a new governance proposal
   */
  async createProposal(proposerAddress, proposalType, businessHash, metadataIpfs) {
    return await stellarService.createProposal(proposerAddress, proposalType, businessHash, metadataIpfs);
  }

  /**
   * Submit a vote on a proposal
   */
  async vote(voterAddress, proposalId, support) {
    return await stellarService.submitVoteOnChain(voterAddress, proposalId, support);
  }

  /**
   * Finalize a proposal after voting period ends
   */
  async finalizeProposal(proposalId) {
    return await stellarService.finalizeProposal(proposalId);
  }

  /**
   * Mark a proposal as executed
   */
  async markExecuted(callerAddress, proposalId) {
    return await stellarService.markProposalExecuted(callerAddress, proposalId);
  }

  /**
   * Get all proposals
   */
  async getAllProposals() {
    return await stellarService.getAllProposals();
  }

  /**
   * Get active proposals only
   */
  async getActiveProposals() {
    return await stellarService.getActiveProposals();
  }
}

/**
 * Document Registry Interface (On-Chain)
 * 
 * For now, attestations are stored on-chain via the DocumentRegistry contract.
 * This interface wraps the contract calls.
 */
class DocumentRegistryContract {
  /**
   * Register a document hash on-chain
   * @param {string} businessId - MongoDB business ID
   * @param {string} docType - Document type (e.g., 'GST', 'PAN', 'photo')
   * @param {string} docHashHex - SHA-256 hash of document as hex string
   * @param {string} encryptedCid - IPFS CID or encrypted reference
   * @returns {Object} Transaction object with wait() method
   */
  async registerDocument(businessId, docType, docHashHex, encryptedCid) {
    try {
      const txHash = await stellarService.registerDocumentOnChain(
        businessId, 
        docType, 
        docHashHex, 
        encryptedCid
      );
      return { hash: txHash, wait: async () => ({ status: 'success' }) };
    } catch (err) {
      console.error('[DocumentRegistry] Failed to register document:', err.message);
      throw err;
    }
  }

  /**
   * Add an attestation (verification result) on-chain
   * @param {string} businessId - MongoDB business ID
   * @param {string} claim - Verification claim (e.g., 'GST_valid', 'PAN_verified')
   * @param {number} status - Verification status (0=Pending, 1=Verified, 2=Failed)
   * @param {string} proofHashHex - Hash of proof data as hex string
   * @param {string} method - Verification method (e.g., 'api_check', 'manual_review')
   * @returns {Object} Transaction object with wait() method
   */
  async addAttestation(businessId, claim, status, proofHashHex, method) {
    try {
      const txHash = await stellarService.addAttestationOnChain(
        businessId, 
        claim, 
        status, 
        proofHashHex, 
        method
      );
      return { hash: txHash, wait: async () => ({ status: 'success' }) };
    } catch (err) {
      console.error('[DocumentRegistry] Failed to add attestation:', err.message);
      throw err;
    }
  }

  /**
   * Add a range proof (zero-knowledge proof) on-chain
   * @param {string} businessId - MongoDB business ID
   * @param {string} claim - Claim type (e.g., 'funding_goal_range', 'age_range')
   * @param {number} threshold - Threshold value for comparison
   * @param {boolean} isAbove - True if value is above threshold, false if below
   * @param {string} zkProofHashHex - Hash of zero-knowledge proof as hex string
   * @returns {Object} Transaction object with wait() method
   */
  async addRangeProof(businessId, claim, threshold, isAbove, zkProofHashHex) {
    try {
      const txHash = await stellarService.addRangeProofOnChain(
        businessId, 
        claim, 
        threshold, 
        isAbove, 
        zkProofHashHex
      );
      return { hash: txHash, wait: async () => ({ status: 'success' }) };
    } catch (err) {
      console.error('[DocumentRegistry] Failed to add range proof:', err.message);
      throw err;
    }
  }

  /**
   * Get attestations for a business from on-chain
   * @param {string} businessId - MongoDB business ID (converted to hash on-chain)
   * @returns {Array} Array of attestation objects
   */
  async getAttestations(businessId) {
    try {
      return await stellarService.getAttestationsOnChain(businessId);
    } catch (err) {
      console.error('[DocumentRegistry] Failed to get attestations:', err.message);
      return [];
    }
  }

  /**
   * Get range proofs for a business from on-chain
   * @param {string} businessId - MongoDB business ID
   * @returns {Array} Array of range proof objects
   */
  async getRangeProofs(businessId) {
    try {
      return await stellarService.getRangeProofsOnChain(businessId);
    } catch (err) {
      console.error('[DocumentRegistry] Failed to get range proofs:', err.message);
      return [];
    }
  }

  /**
   * Get verification summary for a business from on-chain
   * @param {string} businessId - MongoDB business ID
   * @returns {Object} Verification summary with counts
   */
  async getVerificationSummary(businessId) {
    try {
      const result = await stellarService.getVerificationSummaryOnChain(businessId);
      // Return in array format [total, verified, rangeProofs] for backward compatibility
      return [
        result.total_attestations || 0, 
        result.verified_count || 0, 
        result.range_proof_count || 0
      ];
    } catch (err) {
      console.error('[DocumentRegistry] Failed to get verification summary:', err.message);
      return [0, 0, 0];
    }
  }
}

// Singleton instances
let governanceInstance = null;
let documentRegistryInstance = null;

/**
 * Get governance contract instance (write operations)
 */
const getGovernanceContract = () => {
  if (!governanceInstance) {
    governanceInstance = new GovernanceContract();
  }
  return governanceInstance;
};

/**
 * Get governance contract instance (read-only)
 * Same as getGovernanceContract in Soroban (simulations are read-only)
 */
const getGovernanceReadOnly = () => {
  return getGovernanceContract();
};

/**
 * Get document registry contract instance (write operations)
 */
const getDocumentRegistryContract = () => {
  if (!documentRegistryInstance) {
    documentRegistryInstance = new DocumentRegistryContract();
  }
  return documentRegistryInstance;
};

/**
 * Get document registry contract instance (read-only)
 */
const getDocumentRegistryReadOnly = () => {
  return getDocumentRegistryContract();
};

module.exports = {
  DOCUMENT_REGISTRY_ADDRESS,
  GOVERNANCE_CONTRACT_ADDRESS,
  DIVIDEND_DISTRIBUTOR_ADDRESS,
  ESCROW_CONTRACT_ADDRESS,
  GOVERNANCE_PARAMS,
  PROPOSAL_TYPES,
  PROPOSAL_STATUS,
  getGovernanceContract,
  getGovernanceReadOnly,
  getDocumentRegistryContract,
  getDocumentRegistryReadOnly,
};
