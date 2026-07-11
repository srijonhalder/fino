import React, { useState, useEffect } from "react";
import { getMyDividendEarnings } from "../../services/investment.api";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatCurrency, formatDate, getStellarExplorerUrl } from "../../utils/formatters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FiExternalLink, FiDownload, FiTrendingUp } from "react-icons/fi";

const DividendHistoryPage = () => {
  const [earnings, setEarnings] = useState([]);
  const [totalEarnedINR, setTotalEarnedINR] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getMyDividendEarnings();
        const data = res.data.data;
        setEarnings(data?.payoutHistory || []);
        setTotalEarnedINR(data?.totalEarnedINR || 0);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const monthlyData = {};
  earnings.forEach((e) => {
    const key = `${e.year}-${String(e.month).padStart(2, "0")}`;
    monthlyData[key] = (monthlyData[key] || 0) + (e.payoutAmountINR || 0);
  });
  const chartData = Object.entries(monthlyData).sort().map(([month, amount]) => ({ month, amount }));

  const exportCSV = () => {
    const headers = "Date,Month,Year,Amount,TX Hash\n";
    const rows = earnings.map((e) => `${formatDate(e.distributedAt)},${e.month},${e.year},${e.payoutAmountINR || 0},${e.txHash || ""}`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dividend-history.csv";
    a.click();
  };

  if (loading) return <LoadingSpinner message="Loading dividend history..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-teal-500 absolute -top-48 -right-24 opacity-10" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">My Dividend Earnings</h1>
            <div className="flex items-center gap-2 mt-2">
              <FiTrendingUp className="text-teal-400" />
              <p className="text-gray-400">Total Lifetime: <span className="text-teal-400 font-bold text-lg">{formatCurrency(totalEarnedINR)}</span></p>
            </div>
          </div>
          {earnings.length > 0 && (
            <button onClick={exportCSV} className="btn-secondary text-sm">
              <FiDownload className="mr-2" /> Download CSV
            </button>
          )}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">Monthly Earnings</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" fontSize={11} stroke="#6B7280" tick={{ fill: "#6B7280" }} />
                <YAxis fontSize={11} stroke="#6B7280" tick={{ fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{ background: "#1A2235", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#E5E7EB" }}
                  formatter={(v) => [formatCurrency(v), "Earnings"]}
                />
                <Bar dataKey="amount" fill="url(#tealGrad)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Table */}
        {earnings.length > 0 ? (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr>
                  {["Date", "Period", "Amount (INR)", "XLM", "TX ID"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {earnings.map((e, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{formatDate(e.distributedAt)}</td>
                    <td className="px-4 py-3 font-medium text-white">{e.month}/{e.year}</td>
                    <td className="px-4 py-3 text-teal-400 font-semibold">{formatCurrency(e.payoutAmountINR)}</td>
                    <td className="px-4 py-3 text-gray-400">{(e.payoutAmountXLM || e.payoutAmountCELO)?.toFixed(4)}</td>
                    <td className="px-4 py-3">
                      {e.txHash ? (
                        <a href={getStellarExplorerUrl("tx", e.txHash)} target="_blank" rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300 flex items-center text-xs">
                          {e.txHash.slice(0, 8)}... <FiExternalLink className="ml-1" />
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="glass rounded-2xl text-center py-16">
            <p className="text-gray-400">No dividend records yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DividendHistoryPage;
