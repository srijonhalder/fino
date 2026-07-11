import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyVotes } from "../../services/governance.api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  FiArrowLeft, FiCheckCircle, FiXCircle, FiThumbsUp, FiThumbsDown, FiExternalLink, FiAward,
} from "react-icons/fi";

const MyVotesPage = () => {
  const [votes, setVotes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMyVotes();
        setVotes(res.data.data?.votes || []);
        setStats(res.data.data?.stats || {});
      } catch (err) { setError(err.response?.data?.message || "Failed to load votes"); }
      setLoading(false);
    };
    load();
  }, []);

  const getStatusLabel = (status) => ({ 0: "Active", 1: "Passed", 2: "Rejected", 3: "Executed" }[status] ?? "Unknown");

  const getVoteCorrectness = (vote) => {
    const { support, proposalStatus } = vote;
    if (proposalStatus === 0) return null;
    return (support && (proposalStatus === 1 || proposalStatus === 3)) || (!support && proposalStatus === 2);
  };

  if (loading) return <LoadingSpinner message="Loading your votes..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <Link to="/governance" className="inline-flex items-center text-sm text-gray-500 hover:text-primary-400 mb-6 transition-colors">
          <FiArrowLeft className="mr-1" /> Back to Governance
        </Link>

        <h1 className="text-3xl font-black text-white mb-8">My Vote History</h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Total Votes", value: stats.totalVotes || 0, color: "text-primary-400 bg-primary-500/15" },
              { label: "Votes FOR", value: stats.votesFor || 0, color: "text-teal-400 bg-teal-500/15" },
              { label: "Votes AGAINST", value: stats.votesAgainst || 0, color: "text-red-400 bg-red-500/15" },
              { label: "Success Rate", value: `${stats.successRate || 0}%`, color: "text-cyan-400 bg-cyan-500/15" },
            ].map((s, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className={`text-xs px-2 py-0.5 rounded-full mb-2 inline-block ${s.color}`}>{s.label}</div>
                <p className="text-2xl font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {votes.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <FiAward className="mx-auto text-4xl text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-400">No Votes Yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              Head to <Link to="/governance" className="text-primary-400 hover:text-primary-300">active proposals</Link> to cast your first vote!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {votes.map((vote, i) => {
              const isCorrect = getVoteCorrectness(vote);
              return (
                <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vote.support ? "bg-teal-500/15 text-teal-400" : "bg-red-500/15 text-red-400"}`}>
                      {vote.support ? <FiThumbsUp /> : <FiThumbsDown />}
                    </div>
                    <div>
                      <Link to={`/governance/proposals/${vote.proposalId}`}
                        className="font-medium text-white hover:text-primary-300 transition-colors">
                        {vote.businessName || `Proposal #${vote.proposalId}`}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {vote.proposalType?.replace("_", " ")} · {vote.votedAt ? new Date(vote.votedAt).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isCorrect === null ? (
                      <span className="badge badge-warning text-xs">Pending</span>
                    ) : isCorrect ? (
                      <span className="badge badge-success text-xs flex items-center gap-1"><FiCheckCircle /> Majority</span>
                    ) : (
                      <span className="badge bg-red-500/15 text-red-400 border border-red-500/25 text-xs flex items-center gap-1"><FiXCircle /> Minority</span>
                    )}

                    <span className={`badge text-xs ${vote.proposalStatus === 1 || vote.proposalStatus === 3 ? "badge-cyan" : vote.proposalStatus === 2 ? "bg-red-500/15 text-red-400 border border-red-500/25" : "bg-gray-500/15 text-gray-400 border border-gray-500/25"}`}>
                      {getStatusLabel(vote.proposalStatus)}
                    </span>

                    {vote.txHash && (
                      <a href={`https://stellar.expert/explorer/testnet/tx/${vote.txHash}`} target="_blank" rel="noopener noreferrer"
                        className="text-gray-600 hover:text-primary-400 transition-colors">
                        <FiExternalLink />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyVotesPage;

