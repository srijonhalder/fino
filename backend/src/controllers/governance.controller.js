const crypto = require('crypto');
const Business = require('../models/Business');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const {
  getGovernanceReadOnly,
  getGovernanceContract,
  getDocumentRegistryReadOnly,
  GOVERNANCE_PARAMS,
  PROPOSAL_TYPES,
  PROPOSAL_STATUS,
} = require('../config/governance');
const proposalCreatorService = require('../services/proposalCreator.service');
const verificationOracle = require('../services/verificationOracle.service');
const voteIndexer = require('../services/voteIndexer.service');

/**
 * Map on-chain proposal type to string (uppercase for frontend)
 */
const proposalTypeToString = (type) => {
  const types = ['BUSINESS_APPROVAL', 'REVENUE_VERIFICATION', 'PARAMETER_CHANGE', 'EMERGENCY_DELIST'];
  return types[type] || 'UNKNOWN';
};

/**
 * Map on-chain status to string
 */
const statusToString = (status) => {
  const statuses = ['active', 'passed', 'rejected', 'executed'];
  return statuses[status] || 'unknown';
};

/**
 * Enrich on-chain proposal with business data from MongoDB
 */
const enrichProposalWithBusiness = async (proposal) => {
  try {
    // Try to find business by matching the hash
    // The businessHash is stored as a 32-byte hash of the MongoDB _id
    const businesses = await Business.find({}).lean();
    
    for (const business of businesses) {
      const idHash = crypto.createHash('sha256').update(business._id.toString()).digest('hex');
      const proposalHashHex = Buffer.isBuffer(proposal.businessHash) 
        ? proposal.businessHash.toString('hex') 
        : Buffer.from(proposal.businessHash).toString('hex');
      
      if (proposalHashHex === idHash) {
        return {
          ...proposal,
          // Use proposalId consistently (frontend expects proposalId, not id)
          proposalId: proposal.id,
          proposalType: proposalTypeToString(proposal.proposalType),
          status: statusToString(proposal.status),
          // Convert Unix timestamp (seconds) to ISO date string for frontend
          votingEndsAt: new Date(proposal.endTime * 1000).toISOString(),
          votingStartsAt: new Date(proposal.startTime * 1000).toISOString(),
          businessId: business,
          businessName: business.name,
          businessCategory: business.category,
        };
      }
    }
    
    // No matching business found
    return {
      ...proposal,
      proposalId: proposal.id,
      proposalType: proposalTypeToString(proposal.proposalType),
      status: statusToString(proposal.status),
      votingEndsAt: new Date(proposal.endTime * 1000).toISOString(),
      votingStartsAt: new Date(proposal.startTime * 1000).toISOString(),
      businessId: null,
    };
  } catch (err) {
    console.error('Failed to enrich proposal:', err.message);
    return {
      ...proposal,
      proposalId: proposal.id,
      proposalType: proposalTypeToString(proposal.proposalType),
      status: statusToString(proposal.status),
      votingEndsAt: new Date(proposal.endTime * 1000).toISOString(),
      votingStartsAt: new Date(proposal.startTime * 1000).toISOString(),
      businessId: null,
    };
  }
};

/**
 * @desc    Get all governance proposals (from on-chain)
 * @route   GET /api/governance/proposals
 * @access  Public
 */
const getProposals = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    
    const governance = getGovernanceReadOnly();
    let proposals = await governance.getAllProposals();
    
    // Enrich with business data
    proposals = await Promise.all(proposals.map(enrichProposalWithBusiness));
    
    // Apply filters
    if (status) {
      proposals = proposals.filter(p => p.status === status);
    }
    if (type) {
      proposals = proposals.filter(p => p.proposalType === type);
    }
    
    // Sort by start time descending (newest first)
    proposals.sort((a, b) => b.startTime - a.startTime);
    
    // Paginate
    const total = proposals.length;
    const startIdx = (page - 1) * limit;
    const paginatedProposals = proposals.slice(startIdx, startIdx + parseInt(limit));
    
    return successResponse(res, { 
      proposals: paginatedProposals, 
      total, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    }, 'Proposals fetched from chain.');
  } catch (error) {
    console.error('getProposals error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get active proposals only (from on-chain)
 * @route   GET /api/governance/proposals/active
 * @access  Public
 */
const getActiveProposals = async (req, res) => {
  try {
    const governance = getGovernanceReadOnly();
    let proposals = await governance.getActiveProposals();
    
    // Enrich with business data and vote counts
    const enriched = await Promise.all(proposals.map(async (p) => {
      const enrichedProposal = await enrichProposalWithBusiness(p);
      
      try {
        const result = await governance.getVoteResult(p.id);
        return {
          ...enrichedProposal,
          liveVoterCount: result.voters,
          quorumMet: result.voters >= GOVERNANCE_PARAMS.MIN_VOTERS,
          upvoteWeight: result.upvotes,
          downvoteWeight: result.downvotes,
        };
      } catch {
        return { ...enrichedProposal, liveVoterCount: 0, quorumMet: false };
      }
    }));
    
    // Sort by end time (soonest ending first)
    enriched.sort((a, b) => a.endTime - b.endTime);
    
    return successResponse(res, { proposals: enriched }, 'Active proposals fetched from chain.');
  } catch (error) {
    console.error('getActiveProposals error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get proposal details by ID (from on-chain)
 * @route   GET /api/governance/proposals/:id
 * @access  Public
 */
const getProposalById = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    
    const governance = getGovernanceReadOnly();
    
    // Fetch proposal from chain
    let proposal;
    try {
      proposal = await governance.getProposal(proposalId);
    } catch (err) {
      return errorResponse(res, 'Proposal not found on chain.', 404);
    }
    
    // Enrich with business data
    const enrichedProposal = await enrichProposalWithBusiness(proposal);
    
    // Get on-chain vote data
    let onChainData = {};
    try {
      const result = await governance.getVoteResult(proposalId);
      onChainData = {
        upvoteWeight: result.upvotes,
        downvoteWeight: result.downvotes,
        voterCount: result.voters,
        onChainStatus: result.status,
      };
    } catch (err) {
      console.error('Failed to get on-chain vote result:', err.message);
    }
    
    // Get attestations for this business
    let attestations = [];
    let rangeProofs = [];
    let verificationSummary = { total: 0, verified: 0, rangeProofs: 0 };
    if (enrichedProposal.businessId?._id) {
      try {
        const registry = getDocumentRegistryReadOnly();
        const businessIdStr = enrichedProposal.businessId._id.toString();
        attestations = await registry.getAttestations(businessIdStr);
        rangeProofs = await registry.getRangeProofs(businessIdStr);
        const summary = await registry.getVerificationSummary(businessIdStr);
        verificationSummary = {
          total: Number(summary[0]),
          verified: Number(summary[1]),
          rangeProofs: Number(summary[2]),
        };
      } catch (err) {
        console.error('Failed to get attestations:', err.message);
      }
    }
    
    // Format attestations for frontend
    const formattedAttestations = Array.isArray(attestations)
      ? attestations.map(a => ({
          claim: a.claim,
          status: Number(a.status),
          method: a.method,
          timestamp: Number(a.timestamp),
        }))
      : [];
    
    const formattedProofs = Array.isArray(rangeProofs)
      ? rangeProofs.map(p => ({
          claim: p.claim,
          threshold: Number(p.threshold),
          isAbove: p.isAbove,
          verifiedAt: Number(p.verifiedAt),
        }))
      : [];
    
    // Check if requesting user has voted (check on-chain)
    let userVoteStatus = null;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user?.walletAddress) {
          // Check on-chain if user has voted
          const stellarService = require('../services/stellar.service');
          userVoteStatus = await stellarService.hasUserVoted(
            user.walletAddress, 
            proposalId
          );
        }
      } catch { /* ignore auth errors for public route */ }
    }
    
    return successResponse(res, {
      proposal: enrichedProposal,
      onChainData,
      attestations: formattedAttestations,
      rangeProofs: formattedProofs,
      verificationSummary,
      userVoteStatus,
    }, 'Proposal details fetched from chain.');
  } catch (error) {
    console.error('getProposalById error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Prepare an unsigned vote transaction for client-side signing
 * @route   POST /api/governance/proposals/:id/vote/prepare
 * @access  Private
 */
const prepareVoteTransaction = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { support } = req.body;
    const user = req.user;
    
    if (typeof support !== 'boolean') {
      return errorResponse(res, 'support must be a boolean (true=upvote, false=downvote).', 400);
    }
    
    if (!user.walletAddress) {
      return errorResponse(res, 'You must have a connected wallet to vote.', 400);
    }
    
    // Verify proposal exists and is active
    const governance = getGovernanceReadOnly();
    let proposal;
    try {
      proposal = await governance.getProposal(proposalId);
    } catch {
      return errorResponse(res, 'Proposal not found on chain.', 404);
    }
    
    if (proposal.status !== PROPOSAL_STATUS.ACTIVE) {
      return errorResponse(res, 'Proposal is not active.', 400);
    }
    
    // Check if voting period has ended
    const now = Math.floor(Date.now() / 1000);
    if (now > proposal.endTime) {
      return errorResponse(res, 'Voting period has ended.', 400);
    }
    
    // Build unsigned transaction for client-side signing
    const stellarService = require('../services/stellar.service');
    const unsignedXdr = await stellarService.buildVoteTransaction(
      user.walletAddress,
      proposalId,
      support
    );
    
    return successResponse(res, {
      unsignedXdr,
      proposalId,
      support,
      voterAddress: user.walletAddress,
    }, 'Vote transaction prepared. Sign with your wallet.');
  } catch (error) {
    console.error('prepareVoteTransaction error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Submit a signed vote transaction (on-chain)
 * @route   POST /api/governance/proposals/:id/vote
 * @access  Private
 */
const submitVote = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    const { signedXdr } = req.body;
    const user = req.user;
    
    if (!signedXdr) {
      return errorResponse(res, 'signedXdr is required.', 400);
    }
    
    if (!user.walletAddress) {
      return errorResponse(res, 'You must have a connected wallet to vote.', 400);
    }
    
    // Submit the signed transaction
    const stellarService = require('../services/stellar.service');
    const result = await stellarService.submitSignedTransaction(signedXdr);
    
    // Get updated vote result
    const governance = getGovernanceReadOnly();
    const voteResult = await governance.getVoteResult(proposalId);
    
    return successResponse(res, {
      txHash: result.txHash,
      voterCount: voteResult.voters,
      quorumMet: voteResult.voters >= GOVERNANCE_PARAMS.MIN_VOTERS,
      message: 'Vote submitted on-chain successfully!',
    }, 'Vote submitted!');
  } catch (error) {
    console.error('submitVote error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Trigger proposal finalization (on-chain)
 * @route   POST /api/governance/proposals/:id/finalize
 * @access  Private
 */
const triggerFinalize = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    
    const governance = getGovernanceReadOnly();
    let proposal;
    try {
      proposal = await governance.getProposal(proposalId);
    } catch {
      return errorResponse(res, 'Proposal not found on chain.', 404);
    }
    
    if (proposal.status !== PROPOSAL_STATUS.ACTIVE) {
      return errorResponse(res, 'Proposal already finalized.', 400);
    }
    
    const now = Math.floor(Date.now() / 1000);
    if (now <= proposal.endTime) {
      return errorResponse(res, `Voting period not yet ended. Ends at ${new Date(proposal.endTime * 1000).toISOString()}.`, 400);
    }
    
    // Finalize on-chain
    const governanceWrite = getGovernanceContract();
    const result = await governanceWrite.finalizeProposal(proposalId);
    
    // Get final result
    const finalProposal = await governance.getProposal(proposalId);
    const finalStatus = statusToString(finalProposal.status);
    
    return successResponse(res, {
      txHash: result.txHash,
      status: finalStatus,
    }, `Proposal finalized: ${finalStatus}`);
  } catch (error) {
    console.error('triggerFinalize error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get proposal result (from on-chain)
 * @route   GET /api/governance/proposals/:id/result
 * @access  Public
 */
const getProposalResult = async (req, res) => {
  try {
    const proposalId = parseInt(req.params.id);
    
    const governance = getGovernanceReadOnly();
    
    let proposal;
    try {
      proposal = await governance.getProposal(proposalId);
    } catch {
      return errorResponse(res, 'Proposal not found on chain.', 404);
    }
    
    const enrichedProposal = await enrichProposalWithBusiness(proposal);
    const voteResult = await governance.getVoteResult(proposalId);
    
    return successResponse(res, {
      proposal: enrichedProposal,
      voteResult: {
        upvotes: voteResult.upvotes,
        downvotes: voteResult.downvotes,
        voterCount: voteResult.voters,
        status: statusToString(voteResult.status),
      },
    }, 'Proposal result fetched from chain.');
  } catch (error) {
    console.error('getProposalResult error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get current user's vote history
 * @route   GET /api/governance/my-votes
 * @access  Private
 */
const getMyVotes = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user.walletAddress) {
      return errorResponse(res, 'Wallet address not found for user.', 400);
    }
    
    // Get vote history from indexer
    const votes = await voteIndexer.getUserVoteHistory(user.walletAddress);
    
    // Enrich with business data
    const enrichedVotes = await Promise.all(votes.map(async (vote) => {
      try {
        // Find business by hash
        const businesses = await Business.find({}).lean();
        let businessData = null;
        
        for (const business of businesses) {
          const idHash = crypto.createHash('sha256').update(business._id.toString()).digest('hex');
          const voteHashHex = Buffer.isBuffer(vote.businessHash) 
            ? vote.businessHash.toString('hex') 
            : Buffer.from(vote.businessHash).toString('hex');
          
          if (voteHashHex === idHash) {
            businessData = business;
            break;
          }
        }
        
        return {
          ...vote,
          businessName: businessData?.name || `Proposal #${vote.proposalId}`,
          businessCategory: businessData?.category,
        };
      } catch (err) {
        console.error('Failed to enrich vote:', err);
        return vote;
      }
    }));
    
    // Get voter stats
    const stats = await voteIndexer.getVoterStats(user.walletAddress);
    
    return successResponse(res, { 
      votes: enrichedVotes,
      stats,
    }, 'Vote history fetched successfully.');
  } catch (error) {
    console.error('getMyVotes error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get business attestations (for voting UI)
 * @route   GET /api/governance/business/:id/attestations
 * @access  Public
 */
const getAttestations = async (req, res) => {
  try {
    const businessId = req.params.id;
    const registry = getDocumentRegistryReadOnly();
    
    const attestations = await registry.getAttestations(businessId);
    const rangeProofs = await registry.getRangeProofs(businessId);
    const summary = await registry.getVerificationSummary(businessId);
    
    const formattedAttestations = attestations.map(a => ({
      claim: a.claim,
      status: Number(a.status),
      method: a.method,
      timestamp: Number(a.timestamp),
    }));
    
    const formattedProofs = rangeProofs.map(p => ({
      claim: p.claim,
      threshold: Number(p.threshold),
      isAbove: p.isAbove,
      verifiedAt: Number(p.verifiedAt),
    }));
    
    return successResponse(res, {
      attestations: formattedAttestations,
      rangeProofs: formattedProofs,
      summary: {
        total: Number(summary[0]),
        verified: Number(summary[1]),
        rangeProofs: Number(summary[2]),
      },
    }, 'Attestations fetched.');
  } catch (error) {
    console.error('getAttestations error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get governance leaderboard
 * @route   GET /api/governance/leaderboard
 * @access  Public
 */
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get leaderboard from indexer
    const leaderboard = await voteIndexer.getVoterLeaderboard(limit);
    
    // Enrich with user data
    const enrichedLeaderboard = await Promise.all(leaderboard.map(async (entry, index) => {
      try {
        const user = await User.findOne({ walletAddress: entry.address }).lean();
        
        return {
          rank: index + 1,
          address: entry.address,
          voteCount: entry.voteCount,
          username: user?.name || `User ${entry.address.substring(0, 8)}...`,
          email: user?.email,
        };
      } catch (err) {
        return {
          rank: index + 1,
          address: entry.address,
          voteCount: entry.voteCount,
          username: `User ${entry.address.substring(0, 8)}...`,
        };
      }
    }));
    
    return successResponse(res, { 
      leaderboard: enrichedLeaderboard,
    }, 'Leaderboard fetched successfully.');
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get platform governance stats (from on-chain)
 * @route   GET /api/governance/stats
 * @access  Public
 */
const getGovernanceStats = async (req, res) => {
  try {
    const governance = getGovernanceReadOnly();
    const proposals = await governance.getAllProposals();
    
    const totalProposals = proposals.length;
    const activeProposals = proposals.filter(p => p.status === PROPOSAL_STATUS.ACTIVE).length;
    const passedProposals = proposals.filter(p => 
      p.status === PROPOSAL_STATUS.PASSED || p.status === PROPOSAL_STATUS.EXECUTED
    ).length;
    const rejectedProposals = proposals.filter(p => p.status === PROPOSAL_STATUS.REJECTED).length;
    
    // Calculate total votes across all proposals
    let totalVotes = 0;
    for (const p of proposals) {
      try {
        const result = await governance.getVoteResult(p.id);
        totalVotes += result.voters;
      } catch {}
    }
    
    return successResponse(res, {
      totalProposals,
      activeProposals,
      passedProposals,
      rejectedProposals,
      approvalRate: totalProposals > 0
        ? Math.round((passedProposals / (passedProposals + rejectedProposals || 1)) * 100)
        : 0,
      totalVotes,
      uniqueVoters: totalVotes, // Alias for frontend compatibility
      governanceParams: GOVERNANCE_PARAMS,
      dataSource: 'on-chain',
    }, 'Governance stats fetched from chain.');
  } catch (error) {
    console.error('getGovernanceStats error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Trigger oracle verification for a business (admin only)
 * @route   POST /api/governance/verify/:businessId
 * @access  Admin
 */
const triggerVerification = async (req, res) => {
  try {
    const { businessId } = req.params;
    const business = await Business.findById(businessId);
    if (!business) return errorResponse(res, 'Business not found.', 404);
    
    // Start oracle verification in background
    const result = await verificationOracle.startVerification(businessId);
    
    // If verification was successful and business is ready, create proposal
    if (result.success && business.attestationStatus === 'complete') {
      try {
        const proposalResult = await proposalCreatorService.createBusinessProposal(businessId);
        return successResponse(res, {
          verification: result,
          proposal: proposalResult,
        }, 'Verification complete and proposal created!');
      } catch (propErr) {
        return successResponse(res, { verification: result, proposalError: propErr.message },
          'Verification complete but proposal creation failed.');
      }
    }
    
    return successResponse(res, { verification: result }, 'Verification completed.');
  } catch (error) {
    console.error('triggerVerification error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getProposals,
  getActiveProposals,
  getProposalById,
  prepareVoteTransaction,
  submitVote,
  triggerFinalize,
  getProposalResult,
  getMyVotes,
  getAttestations,
  getLeaderboard,
  getGovernanceStats,
  triggerVerification,
};
