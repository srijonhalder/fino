import React, { useState, useEffect } from "react";
import {
  getPendingRevenueReports,
  verifyRevenue,
  distributeDividends,
} from "../../services/admin.api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatCurrency, formatDate, formatXLM, getStellarExplorerUrl } from "../../utils/formatters";
import { toast } from "react-toastify";
import { FiCheckCircle, FiSend, FiExternalLink } from "react-icons/fi";

const RevenueVerificationPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyAmounts, setVerifyAmounts] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [distribResults, setDistribResults] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPendingRevenueReports();
        const data = res.data.data?.records || [];
        setReports(data);
        const initAmounts = {};
        data.forEach((r) => { initAmounts[r._id] = r.reportedRevenue || 0; });
        setVerifyAmounts(initAmounts);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleVerify = async (recordId) => {
    setActionLoading("verify-" + recordId);
    try {
      await verifyRevenue(recordId, Number(verifyAmounts[recordId]));
      setReports((p) => p.map((r) => r._id === recordId ? { ...r, status: "admin_verified", revenueVerified: verifyAmounts[recordId] } : r));
      toast.success("Revenue verified! Ready to distribute dividends.");
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  const handleDistribute = async (recordId) => {
    setActionLoading("distribute-" + recordId);
    try {
      const res = await distributeDividends(recordId);
      setDistribResults((p) => ({ ...p, [recordId]: res.data.data }));
      setReports((p) => p.map((r) => (r._id === recordId ? { ...r, status: "completed" } : r)));
    } catch (err) { toast.error(err.message); }
    finally { setActionLoading(null); }
  };

  if (loading) return <LoadingSpinner message="Loading revenue reports..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-teal-600 absolute -top-48 -left-24 opacity-10" />
      </div>
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Revenue Verification</h1>
          <p className="text-gray-400 mt-1">Verify revenue and distribute dividends to investors</p>
        </div>
        {Object.entries(distribResults).map(([id, data]) => data && (
          <div key={id} className="glass rounded-xl p-4 mb-4 border border-teal-500/25">
          </div>
        ))}
        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report._id} className="glass rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-white">{report.businessId?.name || "Business"}</h3>
                    <p className="text-sm text-gray-400 mt-0.5">Submitted: {formatDate(report.createdAt)}</p>
                  </div>
                  <span className={"badge " + (report.status === "completed" ? "badge-success" : report.status === "admin_verified" ? "badge-cyan" : "badge-warning")}>{report.status}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="text-xs text-gray-500">Reported Revenue</div>
                    <div className="font-bold text-white">{formatCurrency(report.reportedRevenue)}</div>
                  </div>
                  {report.revenueVerified != null && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="text-xs text-gray-500">Verified Revenue</div>
                      <div className="font-bold text-teal-300">{formatCurrency(report.revenueVerified)}</div>
                    </div>
                  )}
                  {report.totalDividendPool > 0 && (
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                      <div className="text-xs text-gray-500">Dividend Pool</div>
                      <div className="font-bold text-cyan-300">{formatCurrency(report.totalDividendPool)}</div>
                    </div>
                  )}
                </div>
                {report.dividendDepositTxHash && (
                  <a href={getStellarExplorerUrl("tx", report.dividendDepositTxHash)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mb-4">
                    <FiExternalLink /> View Deposit TX
                  </a>
                )}
                {report.status === "pending" && (
                  <div className="border-t border-white/10 pt-4 mt-4 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-300 mb-1">Verified Amount (INR)</label>
                      <input type="number" value={verifyAmounts[report._id] || ""} onChange={(e) => setVerifyAmounts((p) => ({ ...p, [report._id]: e.target.value }))} className="input-dark" />
                    </div>
                    <button onClick={() => handleVerify(report._id)} disabled={actionLoading === "verify-" + report._id} className="btn-secondary text-sm whitespace-nowrap disabled:opacity-50">
                      <FiCheckCircle className="mr-1.5" /> {actionLoading === "verify-" + report._id ? "Verifying..." : "Verify Revenue"}
                    </button>
                  </div>
                )}
                {report.status === "admin_verified" && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <button onClick={() => handleDistribute(report._id)} disabled={actionLoading === "distribute-" + report._id} className="btn-primary text-sm disabled:opacity-50">
                      <FiSend className="mr-1.5" /> {actionLoading === "distribute-" + report._id ? "Distributing..." : "Distribute Dividends"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl text-center py-16">
            <p className="text-gray-400">No pending revenue reports.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueVerificationPage;
