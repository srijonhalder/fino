import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiXCircle, FiUsers, FiTrendingUp, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';

const STATUS_BADGE = {
  active: 'badge badge-success',
  passed: 'badge badge-cyan',
  executed: 'badge badge-neon',
  rejected: 'badge bg-red-500/15 text-red-400 border border-red-500/25',
  expired: 'badge bg-gray-500/15 text-gray-400 border border-gray-500/25',
};

const STATUS_ICONS = {
  active: <FiClock className="mr-1" />,
  passed: <FiCheckCircle className="mr-1" />,
  executed: <FiCheckCircle className="mr-1" />,
  rejected: <FiXCircle className="mr-1" />,
  expired: <FiClock className="mr-1" />,
};

const TYPE_LABELS = {
  BUSINESS_APPROVAL: 'Business Approval',
  REVENUE_VERIFICATION: 'Revenue Verification',
  PARAMETER_CHANGE: 'Parameter Change',
  EMERGENCY_DELIST: 'Emergency Delist',
};

const ProposalCard = ({ proposal }) => {
  const business = proposal.businessId;
  const status = proposal.status || 'active';
  const timeLeft = proposal.votingEndsAt ? new Date(proposal.votingEndsAt) - new Date() : 0;
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const minsLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));
  const isExpired = timeLeft <= 0 && status === 'active';

  const upvotes = parseInt(proposal.upvoteWeight || 0);
  const downvotes = parseInt(proposal.downvoteWeight || 0);
  const totalVotes = upvotes + downvotes;
  const approvalPercent = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 0;
  const voterCount = proposal.liveVoterCount || proposal.voterCount || proposal.totalVoters || 0;
  const quorumMet = proposal.quorumMet !== undefined ? proposal.quorumMet : voterCount >= 3;

  return (
    <Link
      to={`/governance/proposals/${proposal.proposalId}`}
      className="block glass rounded-xl hover:border-primary-500/30 hover:bg-white/[0.06] transition-all duration-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {TYPE_LABELS[proposal.proposalType] || proposal.proposalType}
          </span>
          <span className={`inline-flex items-center ${STATUS_BADGE[status] || STATUS_BADGE.active} text-xs`}>
            {STATUS_ICONS[status]}
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          {business?.name || `Proposal #${proposal.proposalId}`}
        </h3>
        {business?.category && (
          <p className="text-sm text-gray-400 mb-3">
            {business.category} · {business.location?.city ? `${business.location.city}, ${business.location.state}` : (typeof business.location === 'string' ? business.location : 'India')}
          </p>
        )}

        {/* Vote bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center text-teal-400"><FiThumbsUp className="mr-1" /> {upvotes}</span>
              <span className="flex items-center text-red-400"><FiThumbsDown className="mr-1" /> {downvotes}</span>
            </div>
            <span className={`font-bold ${approvalPercent >= 60 ? 'text-teal-400' : 'text-red-400'}`}>{approvalPercent}% FOR</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="flex h-full">
              <div className="bg-teal-500 transition-all duration-500" style={{ width: `${totalVotes > 0 ? (upvotes / totalVotes) * 100 : 0}%` }} />
              <div className="bg-red-500 transition-all duration-500" style={{ width: `${totalVotes > 0 ? (downvotes / totalVotes) * 100 : 0}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center"><FiUsers className="mr-1" /> {voterCount} {voterCount === 1 ? 'voter' : 'voters'}</div>
          {status === 'active' && !isExpired && (
            <div className="flex items-center text-amber-400"><FiClock className="mr-1" /> {hoursLeft}h {minsLeft}m left</div>
          )}
          {isExpired && <span className="text-xs text-red-400 font-medium">Ready to finalize</span>}
          {(status === 'passed' || status === 'executed') && (
            <div className="flex items-center text-teal-400"><FiTrendingUp className="mr-1" /> Approved</div>
          )}
        </div>

        {status === 'active' && (
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${quorumMet ? 'text-teal-400 bg-teal-500/15' : 'text-amber-400 bg-amber-500/15'}`}>
              {quorumMet ? `✓ Quorum met (${voterCount}/3)` : `⏳ Needs ${3 - voterCount} more vote${3 - voterCount !== 1 ? 's' : ''}`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default ProposalCard;
