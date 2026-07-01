/**
 * Vote Indexer Service
 * 
 * Tracks and indexes vote events for quick lookups.
 * In production, this would use a proper database or event indexer.
 * For now, we use on-chain data with caching.
 */

const stellarService = require('./stellar.service');
const { getGovernanceReadOnly } = require('../config/governance');

/**
 * Get all votes for a specific user
 * @param {string} userWalletAddress - User's Stellar wallet address
 * @returns {Array} Array of vote records
 */
async function getUserVoteHistory(userWalletAddress) {
    try {
        const governance = getGovernanceReadOnly();
        const allProposals = await governance.getAllProposals();
        
        const votes = [];
        
        // Check each proposal to see if user voted
        for (const proposal of allProposals) {
            try {
                const voteStatus = await stellarService.hasUserVoted(userWalletAddress, proposal.id);
                
                if (voteStatus.hasVoted) {
                    votes.push({
                        proposalId: proposal.id,
                        proposalType: proposal.proposalType,
                        businessHash: proposal.businessHash,
                        support: voteStatus.support,
                        votedAt: proposal.startTime, // Approximate - actual vote time not stored
                        proposalStatus: proposal.status,
                        proposalEndTime: proposal.endTime,
                    });
                }
            } catch (err) {
                console.error(`Failed to check vote for proposal ${proposal.id}:`, err.message);
            }
        }
        
        // Sort by proposal ID descending (newest first)
        votes.sort((a, b) => b.proposalId - a.proposalId);
        
        return votes;
    } catch (err) {
        console.error('[VoteIndexer] Failed to get user vote history:', err);
        throw new Error(`Failed to fetch vote history: ${err.message}`);
    }
}

/**
 * Get leaderboard of most active voters
 * @param {number} limit - Number of top voters to return
 * @returns {Array} Array of {address, voteCount}
 */
async function getVoterLeaderboard(limit = 10) {
    try {
        const governance = getGovernanceReadOnly();
        const allProposals = await governance.getAllProposals();
        
        const voterCounts = new Map();
        
        // Collect all voters from all proposals
        for (const proposal of allProposals) {
            try {
                const voters = await stellarService.getVoters(proposal.id);
                
                for (const voter of voters) {
                    const count = voterCounts.get(voter) || 0;
                    voterCounts.set(voter, count + 1);
                }
            } catch (err) {
                console.error(`Failed to get voters for proposal ${proposal.id}:`, err.message);
            }
        }
        
        // Convert to array and sort
        const leaderboard = Array.from(voterCounts.entries())
            .map(([address, voteCount]) => ({ address, voteCount }))
            .sort((a, b) => b.voteCount - a.voteCount)
            .slice(0, limit);
        
        return leaderboard;
    } catch (err) {
        console.error('[VoteIndexer] Failed to get voter leaderboard:', err);
        throw new Error(`Failed to fetch leaderboard: ${err.message}`);
    }
}

/**
 * Get detailed statistics for a voter
 * @param {string} userWalletAddress - User's Stellar wallet address
 * @returns {Object} Voter statistics
 */
async function getVoterStats(userWalletAddress) {
    try {
        const votes = await getUserVoteHistory(userWalletAddress);
        
        const stats = {
            totalVotes: votes.length,
            votesFor: votes.filter(v => v.support).length,
            votesAgainst: votes.filter(v => !v.support).length,
            proposalsPassed: votes.filter(v => v.proposalStatus === 1 || v.proposalStatus === 3).length,
            proposalsRejected: votes.filter(v => v.proposalStatus === 2).length,
            activeProposalsVoted: votes.filter(v => v.proposalStatus === 0).length,
            successRate: 0,
        };
        
        const completedVotes = stats.proposalsPassed + stats.proposalsRejected;
        if (completedVotes > 0) {
            stats.successRate = Math.round((stats.proposalsPassed / completedVotes) * 100);
        }
        
        return stats;
    } catch (err) {
        console.error('[VoteIndexer] Failed to get voter stats:', err);
        throw new Error(`Failed to fetch voter stats: ${err.message}`);
    }
}

module.exports = {
    getUserVoteHistory,
    getVoterLeaderboard,
    getVoterStats,
};
