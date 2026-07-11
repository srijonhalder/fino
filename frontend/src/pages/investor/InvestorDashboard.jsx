import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyInvestments, getMyDividendEarnings, getOnChainPortfolio } from "../../services/investment.api";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatCurrency, formatDate, getStellarExplorerUrl } from "../../utils/formatters";
import {
  FiDollarSign, FiTrendingUp, FiPieChart, FiCalendar, FiExternalLink,
  FiAlertCircle, FiActivity, FiRefreshCw, FiShield, FiCheckCircle, FiSearch,
} from "react-icons/fi";

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card">
    <div className={`icon-box mb-3 ${color}`}>{icon}</div>
    <div className="label-xs mb-1">{label}</div>
    <div className="text-xl font-bold text-white tracking-tight">{value}</div>
  </div>
);

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
      active ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
    }`}
    style={active ? { background: 'linear-gradient(135deg,#22D3A5,#22D3EE)', boxShadow: '0 4px 14px rgba(34,211,165,0.35)' } : {}}
  >
    {children}
  </button>
);

const InvestorDashboard = () => {
  const { user } = useAuth();
  const { isConnected, connectWallet } = useWallet();
  const [investments, setInvestments] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [onChain, setOnChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onChainLoading, setOnChainLoading] = useState(false);
  const [tab, setTab] = useState("onchain");

  useEffect(() => {
    const load = async () => {
      try {
        const [invRes, earnRes] = await Promise.allSettled([getMyInvestments(), getMyDividendEarnings()]);
        if (invRes.status === "fulfilled") setInvestments(invRes.value.data.data?.investments || []);
        if (earnRes.status === "fulfilled") setEarnings(earnRes.value.data.data?.payoutHistory || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const fetchOnChain = async () => {
    setOnChainLoading(true);
    try {
      const res = await getOnChainPortfolio();
      setOnChain(res.data.data);
    } catch (err) { console.error("On-chain fetch failed:", err); }
    setOnChainLoading(false);
  };

  useEffect(() => {
    if (isConnected && user) fetchOnChain();
    // eslint-disable-next-line
  }, [isConnected, user]);

  const totalInvested = investments.reduce((s, i) => s + (i.totalAmountINR || 0), 0);
  const totalEarned = earnings.reduce((s, e) => s + (e.payoutAmountINR || 0), 0);
  const activeCount = investments.filter((i) => i.status === "confirmed" || i.status === "active").length;

  if (loading) return <LoadingSpinner message="Loading your portfolio..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
        <div className="glow-orb w-80 h-80 bg-cyan-500 absolute top-1/3 -right-20 opacity-8" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="label-xs mb-1">Portfolio</p>
            <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Poppins,sans-serif' }}>Investor Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm">Welcome back, {user?.name || "Investor"}</p>
          </div>
          <Link to="/explore" className="btn-secondary text-sm">
            <FiSearch size={14} /> Explore
          </Link>
        </div>

        {/* Wallet Banner */}
        {!isConnected && (
          <div className="info-box-cyan rounded-xl p-4 mb-6 flex items-center gap-3">
            <FiAlertCircle className="text-cyan-400 flex-shrink-0" size={16} />
            <span className="text-sm text-cyan-200 flex-1">Connect your Stellar wallet to see live on-chain holdings.</span>
            <button onClick={connectWallet} className="btn-primary text-xs py-1.5 px-4 flex-shrink-0">
              Connect Wallet
            </button>
          </div>
        )}

        {/* Governance + Portfolio Banners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="glass-card rounded-2xl p-6 border border-primary-500/15">
            <div className="flex items-center gap-2 mb-2">
              <div className="icon-box w-8 h-8 rounded-lg"><FiShield size={14} /></div>
              <h3 className="font-semibold text-white">Governance & Voting</h3>
            </div>
            <p className="body-md mb-4">Vote on business proposals. 1 wallet = 1 vote.</p>
            <div className="flex gap-2.5">
              <Link to="/governance" className="btn-primary text-xs py-2 px-4">
                <FiCheckCircle size={12} /> Vote Now
              </Link>
              <Link to="/governance/my-votes" className="btn-secondary text-xs py-2 px-4">My Votes</Link>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-teal-500/15">
            <div className="flex items-center gap-2 mb-2">
              <div className="icon-box icon-box-teal w-8 h-8 rounded-lg"><FiTrendingUp size={14} /></div>
              <h3 className="font-semibold text-white">Portfolio Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="label-xs mb-1">Total Invested</p>
                <p className="text-xl font-bold text-white tracking-tight">{formatCurrency(totalInvested)}</p>
              </div>
              <div>
                <p className="label-xs mb-1">Total Earned</p>
                <p className="text-xl font-bold text-teal-400 tracking-tight">{formatCurrency(onChain?.summary?.totalDividendsINR || totalEarned)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <StatCard icon={<FiDollarSign size={16}/>} label="Total Invested" value={formatCurrency(totalInvested)} color="icon-box-cyan" />
          <StatCard icon={<FiTrendingUp size={16}/>} label="Total Earned" value={formatCurrency(onChain?.summary?.totalDividendsINR || totalEarned)} color="icon-box-teal" />
          <StatCard icon={<FiPieChart size={16}/>} label="Active" value={activeCount} color="" />
          <StatCard icon={<FiActivity size={16}/>} label="XLM Balance" value={onChain ? `${parseFloat(onChain.xlmBalance || 0).toFixed(3)} XLM` : '—'} color="icon-box-amber" />
          <StatCard icon={<FiCalendar size={16}/>} label="Dividend Records" value={earnings.length} color="icon-box-success" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 p-1.5 mb-8 w-fit rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <TabBtn active={tab === 'onchain'} onClick={() => setTab('onchain')}>On-Chain</TabBtn>
          <TabBtn active={tab === 'investments'} onClick={() => setTab('investments')}>Investments</TabBtn>
          <TabBtn active={tab === 'dividends'} onClick={() => setTab('dividends')}>Dividends</TabBtn>
        </div>

        {/* On-Chain Tab */}
        {tab === "onchain" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center">
                <FiActivity className="mr-2 text-primary-400" /> Live On-Chain Data
              </h2>
              <button onClick={fetchOnChain} disabled={onChainLoading}
                className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1.5 disabled:opacity-50">
                <FiRefreshCw className={onChainLoading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {onChainLoading && !onChain ? (
              <div className="glass rounded-xl text-center py-16 text-gray-400">
                <FiRefreshCw className="animate-spin mx-auto text-3xl mb-3 text-primary-400" />
                <p>Reading blockchain data...</p>
              </div>
            ) : onChain && onChain.holdings.length > 0 ? (
              <div className="space-y-4">
                {/* Summary Banner */}
                <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg,#1a0533,#0a1a33,#001933)" }}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "XLM Balance", value: `${parseFloat(onChain.xlmBalance || 0).toFixed(4)} XLM`, accent: false },
                      { label: "Portfolio Value", value: formatCurrency(onChain.summary.totalHoldingValueINR), accent: false },
                      { label: "Total Dividends", value: formatCurrency(onChain.summary.totalDividendsINR), accent: true },
                      { label: "Dividends (XLM)", value: `${(onChain.summary.totalDividendsXLM || 0).toFixed(6)} XLM`, accent: true },
                    ].map((s, i) => (
                      <div key={i}>
                        <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                        <div className={`text-xl font-bold ${s.accent ? "text-teal-300" : "text-white"}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {onChain.holdings.map((h, i) => (
                  <div key={i} className="glass rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white">{h.businessName}</h3>
                        <span className="text-xs text-gray-500">{h.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge text-xs ${h.businessStatus === "active" ? "badge-success" : h.businessStatus === "fundraising" ? "badge-cyan" : "badge"}`}>
                          {h.businessStatus}
                        </span>
                        <a href={h.stellarExplorerUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-400">
                          <FiExternalLink />
                        </a>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      {[
                        { label: "On-Chain Tokens", value: h.onChainTokenBalance, note: h.onChainError ? "(from DB)" : null },
                        { label: "Ownership", value: `${parseFloat(h.ownershipPercentage) > 0 && parseFloat(h.ownershipPercentage) < 0.01 ? "< 0.01" : h.ownershipPercentage}%`, accent: "gradient-text" },
                        { label: "Holding Value", value: formatCurrency(h.holdingValueINR) },
                        { label: "Profit Earned", value: formatCurrency(h.totalDividendsEarned), accent: "text-teal-400" },
                        { label: "Revenue Share", value: `${h.revenueSharePercentage}%` },
                      ].map((s, j) => (
                        <div key={j} className="p-3 bg-white/[0.03] rounded-lg">
                          <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                          <div className={`font-bold ${s.accent || "text-white"}`}>{s.value}</div>
                          {s.note && <span className="text-xs text-amber-400">{s.note}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl text-center py-16 text-gray-400">
                <FiActivity className="mx-auto text-4xl mb-3 text-gray-600" />
                <p className="mb-2 text-white">No on-chain holdings found.</p>
                <p className="text-xs text-gray-500 mb-6">Invest in a business to see your live on-chain portfolio.</p>
                <Link to="/explore" className="btn-primary text-sm">Explore Businesses</Link>
              </div>
            )}
          </div>
        )}

        {/* Investments Tab */}
        {tab === "investments" && (
          investments.length > 0 ? (
            <div className="space-y-3">
              {investments.map((inv) => (
                <div key={inv._id} className="glass rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{inv.businessId?.name || "Business"}</h3>
                      <p className="text-xs text-gray-500">{inv.businessId?.category} · Invested {formatDate(inv.createdAt)}</p>
                    </div>
                    <span className={`badge text-xs ${inv.status === "confirmed" ? "badge-success" : inv.status === "pending" ? "badge-warning" : "badge"}`}>
                      {inv.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><div className="text-xs text-gray-500">Amount</div><div className="font-semibold text-white">{formatCurrency(inv.totalAmountINR)}</div></div>
                    <div><div className="text-xs text-gray-500">Tokens</div><div className="font-semibold text-white">{inv.tokensPurchased}</div></div>
                    <div><div className="text-xs text-gray-500">TX</div>
                      {inv.xlmTransactionHash ? (
                        <a href={getStellarExplorerUrl("tx", inv.xlmTransactionHash)} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 text-xs flex items-center">
                          View <FiExternalLink className="ml-1" />
                        </a>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl text-center py-16">
              <p className="text-gray-400 mb-6">You haven't made any investments yet.</p>
              <Link to="/explore" className="btn-primary text-sm">Explore Businesses</Link>
            </div>
          )
        )}

        {/* Dividends Tab */}
        {tab === "dividends" && (
          earnings.length > 0 ? (
            <>
              <div className="glass rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>
                      {["Date", "Business", "Amount", "TX"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((e, i) => (
                      <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-gray-400">{formatDate(e.distributedAt)}</td>
                        <td className="px-4 py-3 font-medium text-white">{typeof e.businessId === "object" ? e.businessId?.name : "Business"}</td>
                        <td className="px-4 py-3 text-teal-400 font-semibold">{formatCurrency(e.payoutAmountINR)}</td>
                        <td className="px-4 py-3">
                          {e.txHash ? (
                            <a href={getStellarExplorerUrl("tx", e.txHash)} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 flex items-center text-xs">
                              View <FiExternalLink className="ml-1" />
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 border-t border-white/10 text-right">
                  <span className="text-sm text-gray-400">Total Earned: </span>
                  <span className="text-lg font-bold text-teal-400">{formatCurrency(totalEarned)}</span>
                </div>
              </div>
              <div className="text-center mt-4">
                <Link to="/dividends" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                  View Detailed Dividend History →
                </Link>
              </div>
            </>
          ) : (
            <div className="glass rounded-xl text-center py-16">
              <p className="text-gray-400">No dividend records yet.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default InvestorDashboard;

