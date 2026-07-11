import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getBusinessById } from "../../services/business.api";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import ProgressBar from "../../components/common/ProgressBar";
import RiskBadge from "../../components/common/RiskBadge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import InvestmentModal from "../../components/investor/InvestmentModal";
import {
  formatCurrency,
  calculateDaysRemaining,
  getStellarExplorerUrl,
} from "../../utils/formatters";
import {
  FiMapPin,
  FiUsers,
  FiCalendar,
  FiExternalLink,
  FiCheckCircle,
  FiAlertTriangle,
  FiLink,
  FiShield,
  FiTrendingUp,
  FiDollarSign,
} from "react-icons/fi";

const STATUS_BADGE = {
  verifying: "badge badge-cyan",
  vote_required: "badge badge-neon",
  voting: "badge badge-neon",
  approved: "badge badge-success",
  rejected: "badge bg-red-500/15 text-red-400 border border-red-500/25",
  fundraising: "badge badge-teal",
  active: "badge badge-success",
  funded: "badge badge-neon",
};

const BusinessDetailPage = () => {
  const { id } = useParams();
  useAuth();
  const { isConnected, connectWallet } = useWallet();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getBusinessById(id);
        setBusiness(res.data.data?.business || res.data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading business details..." />;
  if (!business)
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <p className="text-gray-400">Business not found</p>
      </div>
    );

  const {
    name, category, description, yearsInOperation, riskRating,
    aiCreditScore, aiAnalysis, raisedAmount = 0, fundingGoal = 0,
    revenueSharePercentage, fundingDeadline, photos, status,
    revenueSharingDuration, documents, location, financials, tokenDetails,
  } = business;

  const city = location?.city;
  const state = location?.state;
  const averageMonthlyRevenue = financials?.averageMonthlyRevenue;
  const profitMargin = financials?.profitMargin;
  const tokenPriceINR = tokenDetails?.tokenPrice;
  const tokenContractAddress = tokenDetails?.contractAddress;
  const daysLeft = calculateDaysRemaining(fundingDeadline);

  const renderInvestButton = () => {
    if (!isConnected)
      return (
        <button onClick={connectWallet} className="btn-primary w-full">
          <FiLink className="mr-2" /> Connect Wallet to Invest
        </button>
      );
    if (status !== "fundraising")
      return (
        <button disabled className="w-full py-3 rounded-xl font-semibold text-sm bg-white/5 text-gray-500 cursor-not-allowed border border-white/10">
          Fundraising Closed
        </button>
      );
    return (
      <button onClick={() => setShowModal(true)} className="btn-primary w-full">
        <FiTrendingUp className="mr-2" /> Invest Now
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
        <div className="glow-orb w-80 h-80 bg-cyan-500 absolute top-1/2 -right-20 opacity-8" />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            {/* Photo Gallery */}
            {photos?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
                <img src={photos[0]?.url || photos[0]} alt={name} className="col-span-2 h-72 w-full object-cover" />
                {photos.slice(1, 3).map((p, i) => (
                  <img key={i} src={p?.url || p} alt="" className="h-36 w-full object-cover" />
                ))}
              </div>
            )}

            {/* Header Card */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="badge badge-neon mb-2 inline-flex">{category}</span>
                  <h1 className="text-3xl font-bold text-white">{name}</h1>
                  <p className="text-gray-400 flex items-center mt-2 text-sm">
                    <FiMapPin className="mr-1.5 text-primary-400" /> {city}, {state}
                  </p>
                </div>
                <RiskBadge rating={riskRating} />
              </div>
              {description && <p className="text-gray-300 leading-relaxed">{description}</p>}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: "Years Operating", value: yearsInOperation || "N/A" },
                  { label: "Revenue Share", value: `${revenueSharePercentage || 0}%` },
                  { label: "AI Score", value: `${aiCreditScore || "N/A"}/100`, accent: true },
                  { label: "Investors", value: business.investorCount || 0 },
                ].map((s, i) => (
                  <div key={i} className="text-center p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                    <div className={`font-bold text-lg ${s.accent ? "gradient-text" : "text-white"}`}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Governance Status */}
            {["verifying","vote_required","voting","approved","rejected"].includes(status) && (
              <div className={`rounded-2xl border p-5 ${
                status === "approved" ? "bg-emerald-500/10 border-emerald-500/20" :
                status === "rejected" ? "bg-red-500/10 border-red-500/20" :
                "bg-primary-500/10 border-primary-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <FiShield className={`text-lg ${status === "approved" ? "text-emerald-400" : status === "rejected" ? "text-red-400" : "text-primary-400"}`} />
                  <h2 className="font-semibold text-white">Governance Status</h2>
                  <span className={STATUS_BADGE[status] || "badge badge-neon"}>{status.replace(/_/g, " ")}</span>
                </div>
                <p className="text-sm text-gray-300">
                  {status === "verifying" && "Documents are being verified by the oracle. A governance vote will be created automatically."}
                  {status === "vote_required" && "Oracle verification complete. A community governance vote is being created."}
                  {status === "voting" && "Community members are voting on your application. Connected wallets can vote (1 wallet = 1 vote)."}
                  {status === "approved" && "Approved by community governance vote. Fundraising is now active."}
                  {status === "rejected" && "This business was rejected by community governance vote."}
                </p>
                {(status === "voting" || status === "approved") && business.proposalId && (
                  <Link to={`/governance/proposals/${business.proposalId}`}
                    className="inline-flex items-center mt-3 text-sm text-primary-400 hover:text-primary-300 font-medium">
                    View Governance Proposal <FiExternalLink className="ml-1" />
                  </Link>
                )}
              </div>
            )}

            {/* Financial Overview */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center">
                <FiDollarSign className="mr-2 text-primary-400" /> Financial Overview
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {[
                  { label: "Avg Monthly Revenue", value: formatCurrency(averageMonthlyRevenue) },
                  { label: "Profit Margin", value: `${profitMargin || 0}%` },
                  { label: "Revenue Share", value: `${revenueSharePercentage || 0}%` },
                  { label: "Duration", value: `${revenueSharingDuration || 0} months` },
                  { label: "Token Price", value: formatCurrency(tokenPriceINR) },
                  { label: "Funding Goal", value: formatCurrency(fundingGoal) },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-gray-500 text-xs mb-1">{item.label}</div>
                    <div className="font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis */}
            {aiAnalysis && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">AI Analysis Report</h2>
                <div className="flex items-center justify-center mb-6">
                  <div className="w-28 h-28 rounded-full relative flex items-center justify-center"
                    style={{ background: "conic-gradient(from 0deg, #22D3A5, #22D3EE, #22D3A5)", padding: "3px" }}>
                    <div className="w-full h-full rounded-full bg-dark-800 flex items-center justify-center">
                      <span className="text-3xl font-black gradient-text">{aiCreditScore}</span>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {aiAnalysis.positiveFactors?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-400 mb-2">Positive Factors</h3>
                      {aiAnalysis.positiveFactors.map((f, i) => (
                        <div key={i} className="flex items-start space-x-2 text-sm text-gray-300 mb-1.5">
                          <FiCheckCircle className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.riskFactors?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-amber-400 mb-2">Risk Factors</h3>
                      {aiAnalysis.riskFactors.map((f, i) => (
                        <div key={i} className="flex items-start space-x-2 text-sm text-gray-300 mb-1.5">
                          <FiAlertTriangle className="text-amber-400 mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {aiAnalysis.recommendation && (
                  <div className="mt-4 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20">
                    <p className="text-sm text-gray-300">
                      <strong className="text-primary-400">Recommendation:</strong> {aiAnalysis.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Token Contract */}
            {tokenContractAddress && (
              <div className="glass rounded-2xl p-5">
                <h2 className="text-sm font-bold text-white mb-2">On-Chain Token</h2>
                <a href={getStellarExplorerUrl("token", tokenContractAddress)} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center">
                  View on Stellar Explorer <FiExternalLink className="ml-1.5" />
                </a>
              </div>
            )}

            {/* Documents */}
            {documents?.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h2 className="text-lg font-bold text-white mb-4">Legal Documents</h2>
                {documents.map((d, i) => (
                  <a key={i} href={d.url || d} target="_blank" rel="noopener noreferrer"
                    className="flex items-center text-sm text-primary-400 hover:text-primary-300 mb-2">
                    <FiExternalLink className="mr-1.5" /> Document {i + 1}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Sticky Investment Panel */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="glass-strong rounded-2xl p-6 sticky top-24">
              <h3 className="font-bold text-white mb-4">Investment Summary</h3>
              <ProgressBar raised={raisedAmount} goal={fundingGoal} />
              <div className="flex justify-between text-sm text-gray-400 mt-3 mb-5">
                <span className="flex items-center"><FiUsers className="mr-1 text-primary-400" />{business.investorCount || 0} investors</span>
                <span className="flex items-center"><FiCalendar className="mr-1 text-cyan-400" />{daysLeft} days left</span>
              </div>

              <div className="space-y-3 mb-5">
                {[
                  { label: "Token Price", value: formatCurrency(tokenPriceINR) },
                  { label: "Revenue Share", value: `${revenueSharePercentage}%` },
                  { label: "Duration", value: `${revenueSharingDuration} mo` },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-sm p-2.5 rounded-lg bg-white/[0.03]">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              {renderInvestButton()}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <InvestmentModal
          business={business}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            getBusinessById(id).then((res) => setBusiness(res.data.data?.business || res.data.data)).catch(() => {});
          }}
        />
      )}
    </div>
  );
};

export default BusinessDetailPage;

