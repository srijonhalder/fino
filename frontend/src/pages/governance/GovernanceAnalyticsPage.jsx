import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getGovernanceStats, getLeaderboard, getProposals } from "../../services/governance.api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiActivity, FiUsers, FiCheckCircle, FiXCircle, FiAward,
  FiBarChart2, FiArrowLeft, FiTrendingUp,
} from "react-icons/fi";

const GovernanceAnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentProposals, setRecentProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, leaderRes, proposalsRes] = await Promise.all([
          getGovernanceStats(), getLeaderboard(), getProposals({ limit: 10 }),
        ]);
        setStats(statsRes.data?.data);
        setLeaderboard(leaderRes.data?.data?.leaderboard || []);
        setRecentProposals(proposalsRes.data?.data?.proposals || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Loading governance analytics..." />;

  const statCards = [
    { icon: <FiBarChart2 />, label: "Total Proposals", value: stats?.totalProposals || 0, color: "text-primary-400 bg-primary-500/15" },
    { icon: <FiActivity />, label: "Active", value: stats?.activeProposals || 0, color: "text-amber-400 bg-amber-500/15" },
    { icon: <FiCheckCircle />, label: "Passed", value: stats?.passedProposals || 0, color: "text-teal-400 bg-teal-500/15" },
    { icon: <FiXCircle />, label: "Rejected", value: stats?.rejectedProposals || 0, color: "text-red-400 bg-red-500/15" },
    { icon: <FiUsers />, label: "Unique Voters", value: stats?.uniqueVoters || 0, color: "text-cyan-400 bg-cyan-500/15" },
    { icon: <FiTrendingUp />, label: "Total Votes", value: stats?.totalVotes || 0, color: "text-primary-400 bg-primary-500/15" },
  ];

  const statusBadge = (status) => {
    if (status === "active") return "badge badge-warning";
    if (status === "passed" || status === "executed") return "badge badge-success";
    if (status === "rejected") return "badge bg-red-500/15 text-red-400 border border-red-500/25";
    return "badge bg-gray-500/15 text-gray-400 border border-gray-500/25";
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/governance" className="text-gray-500 hover:text-primary-400 transition-colors">
            <FiArrowLeft className="text-xl" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white">Governance Analytics</h1>
            <p className="text-gray-400 mt-1">Platform health, voter participation, and proposal history</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map((s, i) => (
            <div key={i} className="glass rounded-xl p-4 text-center">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${s.color}`}>{s.icon}</div>
              <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FiCheckCircle className="text-teal-400" />
              <h3 className="font-bold text-white">Approval Rate</h3>
            </div>
            <div className="text-3xl font-black gradient-text-teal">{stats?.approvalRate || 0}%</div>
            <p className="text-xs text-gray-500 mt-1">Of all finalized proposals that passed</p>
          </div>
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <FiBarChart2 className="text-primary-400" />
              <h3 className="font-bold text-white">Avg. Vote Approval</h3>
            </div>
            <div className="text-3xl font-black gradient-text">{stats?.avgApprovalPercent || 0}%</div>
            <p className="text-xs text-gray-500 mt-1">Average upvote percentage across proposals</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <FiAward className="text-amber-400" />
              <h2 className="font-bold text-white">Top Voters</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-dark-800 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3 text-center">Votes</th>
                  <th className="px-4 py-3 text-center">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-500">No votes recorded yet</td></tr>
                ) : leaderboard.map((v, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-bold text-white">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{v.walletAddress}</td>
                    <td className="px-4 py-3 text-center font-bold text-white">{v.totalVotes}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${v.accuracy >= 70 ? "badge-success" : v.accuracy >= 40 ? "badge-warning" : "bg-red-500/15 text-red-400 border border-red-500/25"}`}>
                        {v.accuracy}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Proposals */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <FiActivity className="text-primary-400" />
              <h2 className="font-bold text-white">Recent Proposals</h2>
            </div>
            {recentProposals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No proposals yet</div>
            ) : recentProposals.map((p) => (
              <Link key={p._id || p.proposalId} to={`/governance/proposals/${p.proposalId}`}
                className="flex items-center justify-between px-4 py-3 border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono text-gray-600">#{p.proposalId}</span>
                    <span className={`${statusBadge(p.status)} text-[10px] py-0.5`}>{p.status}</span>
                  </div>
                  <p className="text-sm text-gray-300 truncate">{p.businessId?.name || `Business proposal #${p.proposalId}`}</p>
                </div>
                {p.upvotePercent !== undefined && p.status !== "active" && (
                  <div className="text-right ml-4">
                    <div className="text-sm font-bold text-white">{p.upvotePercent}%</div>
                    <div className="text-[10px] text-gray-500">{p.totalVoters || 0} voters</div>
                  </div>
                )}
              </Link>
            ))}
            {recentProposals.length > 0 && (
              <div className="p-3 border-t border-white/5 text-center">
                <Link to="/governance" className="text-xs text-primary-400 hover:text-primary-300">View all proposals →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Governance Params */}
        {stats?.governanceParams && (
          <div className="mt-8 glass rounded-xl p-6">
            <h2 className="font-bold text-white mb-4">Governance Parameters</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: "Voting Duration", value: stats.governanceParams.VOTING_DURATION_MINUTES ? `${stats.governanceParams.VOTING_DURATION_MINUTES} min` : `${stats.governanceParams.VOTING_DURATION_DAYS} days` },
                { label: "Min. Quorum", value: `${stats.governanceParams.MIN_QUORUM_VOTERS} voters` },
                { label: "Approval Threshold", value: `${stats.governanceParams.APPROVAL_THRESHOLD_PERCENT}%` },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                  <div className="font-bold text-white">{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GovernanceAnalyticsPage;

