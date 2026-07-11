import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getActiveProposals, getProposals, getGovernanceStats, getLeaderboard,
} from "../../services/governance.api";
import ProposalCard from "../../components/governance/ProposalCard";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { FiActivity, FiAward, FiBarChart2, FiCheckCircle, FiUsers, FiXCircle } from "react-icons/fi";

const GovernancePage = () => {
  const [tab, setTab] = useState("active");
  const [activeProposals, setActiveProposals] = useState([]);
  const [allProposals, setAllProposals] = useState([]);
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [activeRes, allRes, statsRes, lbRes] = await Promise.allSettled([
          getActiveProposals(), getProposals({ limit: 50 }), getGovernanceStats(), getLeaderboard(),
        ]);
        if (activeRes.status === "fulfilled") setActiveProposals(activeRes.value.data.data?.proposals || []);
        if (allRes.status === "fulfilled") setAllProposals(allRes.value.data.data?.proposals || []);
        if (statsRes.status === "fulfilled") setStats(statsRes.value.data.data);
        if (lbRes.status === "fulfilled") setLeaderboard(lbRes.value.data.data?.leaderboard || []);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  const passedProposals = allProposals.filter((p) => p.status === "passed" || p.status === "executed");
  const rejectedProposals = allProposals.filter((p) => p.status === "rejected");

  if (loading) return <LoadingSpinner message="Loading governance..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
        <div className="glow-orb w-80 h-80 bg-cyan-500 absolute bottom-0 right-16 opacity-8" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Governance</h1>
            <p className="text-gray-400 mt-1">Vote on business proposals and shape the platform. 1 wallet = 1 vote.</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <Link to="/governance/analytics" className="btn-secondary text-sm">
              <FiBarChart2 className="mr-1.5" /> Analytics
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: <FiActivity />, label: "Active Votes", value: stats.activeProposals, color: "text-teal-400 bg-teal-500/15" },
              { icon: <FiCheckCircle />, label: "Passed", value: stats.passedProposals, color: "text-cyan-400 bg-cyan-500/15" },
              { icon: <FiXCircle />, label: "Rejected", value: stats.rejectedProposals, color: "text-red-400 bg-red-500/15" },
              { icon: <FiUsers />, label: "Total Voters", value: stats.uniqueVoters, color: "text-primary-400 bg-primary-500/15" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>{s.icon}</div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-800 rounded-xl p-1 mb-6 w-fit border border-white/[0.06]">
          {[
            { key: "active", label: `Active (${activeProposals.length})` },
            { key: "results", label: "Results" },
            { key: "leaderboard", label: "Leaderboard" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? "bg-gradient-to-r from-primary-600 to-cyan-600 text-white shadow" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Active tab */}
        {tab === "active" && (
          activeProposals.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <FiActivity className="mx-auto text-4xl text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400">No Active Proposals</h3>
              <p className="text-sm text-gray-500 mt-1">New proposals appear when businesses complete verification.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProposals.map((p) => <ProposalCard key={p.proposalId} proposal={p} />)}
            </div>
          )
        )}

        {/* Results tab */}
        {tab === "results" && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FiCheckCircle className="text-teal-400" /> Approved
              </h3>
              {passedProposals.length === 0 ? (
                <p className="text-sm text-gray-500">No approved proposals yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {passedProposals.map((p) => <ProposalCard key={p.proposalId} proposal={p} />)}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FiXCircle className="text-red-400" /> Rejected
              </h3>
              {rejectedProposals.length === 0 ? (
                <p className="text-sm text-gray-500">No rejected proposals yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rejectedProposals.map((p) => <ProposalCard key={p.proposalId} proposal={p} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard tab */}
        {tab === "leaderboard" && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <FiAward className="text-primary-400" />
              <div>
                <h3 className="font-bold text-white">Top Governance Participants</h3>
                <p className="text-xs text-gray-500">1 wallet = 1 vote · Rankings based on participation and accuracy</p>
              </div>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No votes have been cast yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase bg-dark-800">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Wallet</th>
                    <th className="px-4 py-3">Votes</th>
                    <th className="px-4 py-3">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((v, i) => (
                    <tr key={i} className={`border-t border-white/5 hover:bg-white/[0.03] transition-colors ${i < 3 ? "bg-primary-500/5" : ""}`}>
                      <td className="px-4 py-3 font-bold text-white">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">
                        <a href={`https://stellar.expert/explorer/testnet/account/${v.fullWallet}`} target="_blank" rel="noopener noreferrer"
                          className="hover:text-primary-400">{v.walletAddress}</a>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{v.totalVotes}</td>
                      <td className="px-4 py-3">
                        <span className={v.accuracy >= 70 ? "text-teal-400 font-medium" : "text-gray-400"}>{v.accuracy}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/governance/my-votes" className="text-sm text-primary-400 hover:text-primary-300 font-medium inline-flex items-center gap-1">
            <FiBarChart2 /> View My Vote History
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GovernancePage;

