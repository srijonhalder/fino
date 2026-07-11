import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getProposalById } from "../../services/governance.api";
import VotingPanel from "../../components/governance/VotingPanel";
import AttestationBadges from "../../components/governance/AttestationBadges";
import ZKProofBadge from "../../components/governance/ZKProofBadge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { useWallet } from "../../hooks/useWallet";
import { formatDate, formatCurrency, getStellarExplorerUrl } from "../../utils/formatters";
import {
  FiArrowLeft, FiClock, FiExternalLink, FiShield, FiFileText,
  FiThumbsUp, FiThumbsDown, FiRefreshCw, FiUsers,
} from "react-icons/fi";

const STATUS_BADGE = {
  active: "badge badge-success",
  passed: "badge badge-cyan",
  executed: "badge badge-neon",
  rejected: "badge bg-red-500/15 text-red-400 border border-red-500/25",
  expired: "badge bg-gray-500/15 text-gray-400 border border-gray-500/25",
};

const ProposalDetailPage = () => {
  const { id } = useParams();
  const { isConnected } = useWallet();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await getProposalById(id);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !data?.proposal || data.proposal.status !== "active") return;
    const interval = setInterval(() => fetchData(true), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, data, fetchData]);

  const handleVoteComplete = () => fetchData(true);

  if (loading) return <LoadingSpinner message="Loading proposal..." />;
  if (error) return (
    <div className="min-h-screen bg-dark-900 pt-24 px-4 text-center">
      <p className="text-red-400">{error}</p>
      <Link to="/governance" className="text-primary-400 hover:text-primary-300 mt-4 inline-block">Back to Governance</Link>
    </div>
  );

  const { proposal, onChainData, attestations, rangeProofs, verificationSummary, userVoteStatus } = data;
  const business = proposal.businessId;
  const status = proposal.status;
  const timeLeft = proposal.votingEndsAt ? new Date(proposal.votingEndsAt) - new Date() : 0;
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
  const minsLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));
  const isVotingOpen = status === "active" && timeLeft > 0;

  const upvotes = parseInt(onChainData?.upvoteWeight || 0);
  const downvotes = parseInt(onChainData?.downvoteWeight || 0);
  const totalVotes = upvotes + downvotes;
  const upPct = totalVotes > 0 ? Math.round((upvotes / totalVotes) * 100) : 0;
  const downPct = totalVotes > 0 ? Math.round((downvotes / totalVotes) * 100) : 0;
  const voterCount = onChainData?.voterCount || proposal.totalVoters || 0;
  const quorumMet = voterCount >= 3;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/governance" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-400 mb-6 transition-colors">
          <FiArrowLeft className="mr-1" /> Back to Governance
        </Link>

        {/* Header card */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Proposal #{proposal.proposalId} · {proposal.proposalType?.replace("_", " ")}
              </span>
              <h1 className="text-2xl font-black text-white mt-1">
                {business?.name || `Proposal #${proposal.proposalId}`}
              </h1>
              {business && (
                <p className="text-sm text-gray-400 mt-1">
                  {business.category} · {business.location?.city ? `${business.location.city}, ${business.location.state}` : typeof business.location === "string" ? business.location : "India"}
                  {business.revenueSharePercentage && ` · ${business.revenueSharePercentage}% revenue share`}
                </p>
              )}
            </div>
            <span className={STATUS_BADGE[status] || "badge badge-neon"}>{status}</span>
          </div>

          {/* Timer */}
          {status === "active" && (
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center text-sm ${timeLeft > 0 ? "text-amber-400" : "text-red-400"}`}>
                <FiClock className="mr-1" />
                {timeLeft > 0 ? `${hoursLeft}h ${minsLeft}m left (ends ${formatDate(proposal.votingEndsAt)})` : "Voting ended — ready to finalize"}
              </div>
              <button onClick={() => fetchData(true)} disabled={refreshing}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-400 disabled:opacity-50 transition-colors">
                <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          )}

          {/* Vote bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center text-sm text-teal-400 font-medium">
                  <FiThumbsUp className="mr-1" /> {upvotes} FOR ({upPct}%)
                </div>
                <div className="flex items-center text-sm text-red-400 font-medium">
                  <FiThumbsDown className="mr-1" /> {downvotes} AGAINST ({downPct}%)
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <FiUsers /> <span className="font-medium text-white">{voterCount}</span> voters
              </div>
            </div>

            <div className="relative h-3 rounded-full overflow-hidden bg-white/10 mb-2">
              <div className="absolute inset-0 flex">
                <div className="bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-700" style={{ width: `${upPct}%` }} />
                <div className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700" style={{ width: `${downPct}%` }} />
              </div>
              <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/70" style={{ left: "60%" }} title="60% threshold" />
            </div>

            <div className="flex justify-between text-xs items-center">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full ${quorumMet ? "text-teal-400 bg-teal-500/15" : "text-amber-400 bg-amber-500/15"}`}>
                  {quorumMet ? `✓ Quorum met (${voterCount}/3)` : `⏳ Needs ${3 - voterCount} more vote${3 - voterCount !== 1 ? "s" : ""}`}
                </span>
                <span className={`px-2 py-0.5 rounded-full ${upPct >= 60 ? "text-teal-400 bg-teal-500/15" : "text-gray-500"}`}>
                  {upPct >= 60 ? "✓ Above 60% threshold" : "60% threshold required"}
                </span>
              </div>
              {status === "active" && (
                <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
                  <span>Auto-refresh</span>
                </label>
              )}
            </div>
          </div>

          {proposal.onChainTxHash && (
            <a href={getStellarExplorerUrl ? getStellarExplorerUrl("tx", proposal.onChainTxHash) : `https://stellar.expert/explorer/testnet/tx/${proposal.onChainTxHash}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-gray-500 hover:text-primary-400 transition-colors">
              <FiExternalLink className="mr-1" /> View proposal creation tx
            </a>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left */}
          <div className="md:col-span-2 space-y-6">
            {business && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FiFileText className="text-gray-400" /> Business Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                  {[
                    { label: "Funding Goal", value: formatCurrency(business.fundingGoal) },
                    { label: "AI Credit Score", value: `${business.aiCreditScore || "N/A"}/100` },
                    { label: "Risk Rating", value: business.riskRating?.toUpperCase() || "N/A",
                      color: business.riskRating === "low" ? "text-teal-400" : business.riskRating === "medium" ? "text-amber-400" : "text-red-400" },
                    { label: "Revenue Share", value: `${business.revenueSharePercentage || 0}%` },
                  ].map((s, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="text-xs text-gray-500">{s.label}</div>
                      <div className={`font-semibold mt-0.5 ${s.color || "text-white"}`}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <Link to={`/businesses/${business._id}`} className="text-xs text-primary-400 hover:text-primary-300">
                  View full business page →
                </Link>
              </div>
            )}

            <div className="glass rounded-xl p-5">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <FiShield className="text-primary-400" /> Oracle Attestations
              </h3>
              {attestations && attestations.length > 0 ? (
                <AttestationBadges attestations={attestations} />
              ) : (
                <p className="text-sm text-gray-500">No attestations recorded yet.</p>
              )}
              {verificationSummary && verificationSummary.total > 0 && (
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>Total checks: {verificationSummary.total}</span>
                  <span className="text-teal-400">Verified: {verificationSummary.verified}</span>
                  <span className="text-primary-400">ZK Proofs: {verificationSummary.rangeProofs}</span>
                </div>
              )}
            </div>

            {rangeProofs && rangeProofs.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h3 className="font-bold text-white mb-3">Zero-Knowledge Proofs</h3>
                <ZKProofBadge proofs={rangeProofs} />
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-4">
            {isVotingOpen && isConnected ? (
              <VotingPanel proposalId={proposal.proposalId} userVoteStatus={userVoteStatus} onVoteComplete={handleVoteComplete} />
            ) : isVotingOpen && !isConnected ? (
              <div className="glass rounded-xl p-5 text-center border border-amber-500/25">
                <p className="text-sm text-amber-200 font-medium">Connect your wallet to vote</p>
                <p className="text-xs text-amber-400/70 mt-1">You need a Stellar wallet (Freighter) to participate.</p>
              </div>
            ) : (
              <div className="glass rounded-xl p-5 text-center">
                <p className="text-sm text-gray-400 font-medium">Voting has ended</p>
                <p className="text-xs text-gray-500 mt-1">
                  Result: <strong className={status === "passed" || status === "executed" ? "text-teal-400" : "text-red-400"}>{status?.toUpperCase()}</strong>
                </p>
              </div>
            )}

            <div className="glass rounded-xl p-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Governance Rules</h4>
              <ul className="space-y-1.5 text-xs text-gray-500">
                <li>· 1 wallet = 1 vote (equal weight)</li>
                <li>· Min 3 voters required (quorum)</li>
                <li>· 60% approval to pass</li>
                <li>· 80% for emergency (5 voters)</li>
                <li>· Business approval: anyone can vote</li>
                <li>· Revenue verification: investors only</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalDetailPage;

const STATUS_COLORS = {
  active: "bg-green-100 text-green-800 border-green-200",
  passed: "bg-blue-100 text-blue-800 border-blue-200",
  executed: "bg-indigo-100 text-indigo-800 border-indigo-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  expired: "bg-gray-100 text-gray-600 border-gray-200",
};

