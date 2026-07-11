import React, { useState, useEffect } from "react";
import {
  getPendingApplications, generateAIScore, approveBusiness, rejectBusiness,
} from "../../services/admin.api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import RiskBadge from "../../components/common/RiskBadge";
import { formatCurrency, formatDate, getStellarExplorerUrl } from "../../utils/formatters";
import { toast } from "react-toastify";
import { FiCheckCircle, FiXCircle, FiCpu, FiAlertTriangle, FiExternalLink, FiChevronDown, FiChevronUp } from "react-icons/fi";

const BusinessApprovalPage = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [aiLoading, setAiLoading] = useState(null);
  const [approveLoading, setApproveLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [aiReport, setAiReport] = useState({});
  const [approveResult, setApproveResult] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPendingApplications();
        setApplications(res.data.data?.businesses || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleAIScore = async (bizId) => {
    setAiLoading(bizId);
    try {
      const res = await generateAIScore(bizId);
      setAiReport((p) => ({ ...p, [bizId]: res.data.data?.aiAnalysis || res.data.data }));
      toast.success("AI report generated!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "AI analysis failed");
    } finally { setAiLoading(null); }
  };

  const handleApprove = async (bizId) => {
    setApproveLoading(bizId);
    try {
      const res = await approveBusiness(bizId);
      setApproveResult((p) => ({ ...p, [bizId]: res.data.data }));
      setApplications((p) => p.filter((a) => a._id !== bizId));
      toast.success("Business approved! Token deployed on Stellar.");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Approval failed");
    } finally { setApproveLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await rejectBusiness(rejectModal, rejectReason);
      setApplications((p) => p.filter((a) => a._id !== rejectModal));
      toast.info("Application rejected");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Rejection failed");
    } finally { setRejectModal(null); setRejectReason(""); }
  };

  if (loading) return <LoadingSpinner message="Loading applications..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Pending Business Applications</h1>
          <p className="text-gray-400 mt-1">{applications.length} application{applications.length !== 1 ? "s" : ""} awaiting review</p>
        </div>

        {/* Approve success messages */}
        {Object.entries(approveResult).map(([bizId, data]) => (
          <div key={bizId} className="glass rounded-xl p-4 mb-4 border border-teal-500/25">
            <p className="text-sm text-teal-300 font-medium">Business Approved! Token created on Stellar Testnet.</p>
            {data?.contractAddress && (
              <a href={getStellarExplorerUrl("token", data.contractAddress)} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center mt-1">
                View Token on Stellar Explorer <FiExternalLink className="ml-1" />
              </a>
            )}
          </div>
        ))}

        {applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app._id} className="glass rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
                  onClick={() => setExpanded(expanded === app._id ? null : app._id)}>
                  <div>
                    <h3 className="font-bold text-white">{app.name}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {app.category} · {app.location?.city}, {app.location?.state} · Submitted {formatDate(app.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Owner: {app.ownerId?.name || "N/A"} · Goal: {formatCurrency(app.fundingGoal)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-warning text-xs">Pending</span>
                    {expanded === app._id ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded */}
                {expanded === app._id && (
                  <div className="border-t border-white/10 p-6 space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      {[
                        { label: "Monthly Revenue", value: formatCurrency(app.financials?.averageMonthlyRevenue) },
                        { label: "Profit Margin", value: `${app.financials?.profitMargin}%` },
                        { label: "Revenue Share", value: `${app.revenueSharePercentage}%` },
                        { label: "Duration", value: `${app.revenueSharingDuration} months` },
                        { label: "Token Price", value: formatCurrency(app.tokenDetails?.tokenPrice) },
                        { label: "Years Operating", value: app.yearsInOperation || "N/A" },
                      ].map((s, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          <div className="text-xs text-gray-500">{s.label}</div>
                          <div className="font-semibold text-white mt-1">{s.value}</div>
                        </div>
                      ))}
                    </div>

                    {app.description && (
                      <div className="text-sm text-gray-300 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] leading-relaxed">
                        {app.description}
                      </div>
                    )}

                    {/* AI Report */}
                    {aiReport[app._id] && (
                      <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          <FiCpu className="text-primary-400" /> AI Analysis Report
                        </h4>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
                            style={{ background: "linear-gradient(135deg,#22D3A5,#22D3EE)" }}>
                            {aiReport[app._id].creditScore || aiReport[app._id].score || "N/A"}
                          </div>
                          <div>
                            <RiskBadge rating={aiReport[app._id].riskRating} />
                            <p className="text-sm text-primary-300 mt-1 font-medium">{aiReport[app._id].recommendation}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          {aiReport[app._id].positiveFactors?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-teal-400 mb-2">Positive Factors</p>
                              {aiReport[app._id].positiveFactors.map((f, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-gray-300 mb-1">
                                  <FiCheckCircle className="text-teal-400 mt-0.5 flex-shrink-0 text-xs" /> <span className="text-xs">{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {aiReport[app._id].riskFactors?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-400 mb-2">Risk Factors</p>
                              {aiReport[app._id].riskFactors.map((f, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-gray-300 mb-1">
                                  <FiAlertTriangle className="text-amber-400 mt-0.5 flex-shrink-0 text-xs" /> <span className="text-xs">{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => handleAIScore(app._id)} disabled={aiLoading === app._id}
                        className="btn-secondary text-sm disabled:opacity-50">
                        <FiCpu className="mr-1.5" /> {aiLoading === app._id ? "Analyzing..." : "Generate AI Report"}
                      </button>
                      <button onClick={() => handleApprove(app._id)} disabled={approveLoading === app._id}
                        className="text-sm inline-flex items-center px-4 py-2.5 rounded-xl font-semibold transition-all bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 disabled:opacity-50">
                        <FiCheckCircle className="mr-1.5" /> {approveLoading === app._id ? "Creating Tokens..." : "Approve & Create Tokens"}
                      </button>
                      <button onClick={() => setRejectModal(app._id)}
                        className="text-sm inline-flex items-center px-4 py-2.5 rounded-xl font-semibold transition-all bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20">
                        <FiXCircle className="mr-1.5" /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl text-center py-16">
            <p className="text-gray-400">No pending applications.</p>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-2xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-white mb-4">Reject Application</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input-dark mb-4"
                rows={3}
                placeholder="Reason for rejection..."
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setRejectModal(null)} className="btn-secondary text-sm">Cancel</button>
                <button onClick={handleReject}
                  className="text-sm inline-flex items-center px-4 py-2.5 rounded-xl font-semibold bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-all">
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessApprovalPage;

