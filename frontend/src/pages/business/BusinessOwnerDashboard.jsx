import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getMyBusinesses, submitRevenueReport, getPublicConfig } from "../../services/business.api";
import { useWallet } from "../../hooks/useWallet";
import ProgressBar from "../../components/common/ProgressBar";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatCurrency, formatXLM, getStellarExplorerUrl } from "../../utils/formatters";
import {
  TransactionBuilder, BASE_FEE, Networks, Operation, Horizon, Asset, Memo,
} from "@stellar/stellar-sdk";
import { toast } from "react-toastify";
import {
  FiPlus, FiSend, FiCheckCircle, FiExternalLink, FiActivity,
  FiDollarSign, FiUsers,
} from "react-icons/fi";

const HORIZON_URL = "https://horizon-testnet.stellar.org";

const STATUS_BADGE = {
  pending: "badge badge-warning",
  verifying: "badge badge-cyan",
  vote_required: "badge badge-neon",
  voting: "badge badge-neon",
  under_review: "badge badge-cyan",
  fundraising: "badge badge-teal",
  funded: "badge badge-neon",
  active: "badge badge-success",
  rejected: "badge bg-red-500/15 text-red-400 border border-red-500/25",
  verification_failed: "badge bg-red-500/15 text-red-400 border border-red-500/25",
};

const STATUS_MESSAGES = {
  pending: "Your application is pending. Verification will begin shortly.",
  verifying: "Our oracle is verifying your business documents and credentials...",
  vote_required: "Verification complete! Creating governance proposal for community vote...",
  voting: "Community members are voting on your application.",
  under_review: "Admin is reviewing your application.",
  fundraising: "Your business is live and accepting investments!",
  funded: "Congratulations! Your funding goal has been reached.",
  active: "Your business is active and operational.",
  rejected: "Unfortunately, your application was not approved.",
  verification_failed: "Document verification failed. Please contact support.",
};

const BusinessOwnerDashboard = () => {
  const { signAndSendTransaction, isConnected, walletAddress } = useWallet();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenueForm, setRevenueForm] = useState({ businessId: null, amount: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(1);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [lastTxHash, setLastTxHash] = useState("");
  const [platformConfig, setPlatformConfig] = useState({ adminWalletAddress: "", dividendDistributorAddress: "", xlmInrRate: 40 });

  useEffect(() => {
    const load = async () => {
      try {
        const [bizRes, configRes] = await Promise.all([getMyBusinesses(), getPublicConfig()]);
        setBusinesses(bizRes.data.data?.businesses || []);
        if (configRes.data.data) setPlatformConfig(configRes.data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const getDividendCalc = (biz) => {
    const revenueAmount = Number(revenueForm.amount) || 0;
    if (revenueAmount <= 0) return null;
    const sharePercent = biz.revenueSharePercentage || 20;
    const dividendPoolINR = revenueAmount * (sharePercent / 100);
    const dividendPoolXLM = dividendPoolINR / (platformConfig.xlmInrRate || 40);
    return { dividendPoolINR, dividendPoolXLM: parseFloat(dividendPoolXLM.toFixed(6)), sharePercent };
  };

  const handleRevenueSubmit = async (biz) => {
    if (!revenueForm.amount || Number(revenueForm.amount) <= 0) { toast.error("Enter a valid revenue amount"); return; }
    if (!isConnected || !walletAddress) { toast.error("Please connect your Freighter wallet first"); return; }
    const calc = getDividendCalc(biz);
    if (!calc) return;
    const destinationAddress = platformConfig.adminWalletAddress;
    if (!destinationAddress) { toast.error("Platform destination address not configured"); return; }

    setSubmitting(true);
    setSubmitStep(2);
    try {
      const xlmAmountStr = Number(calc.dividendPoolXLM).toFixed(7);
      setLoadingMsg("Loading your Stellar account...");
      const horizonServer = new Horizon.Server(HORIZON_URL);
      let ownerAccount;
      try {
        ownerAccount = await horizonServer.loadAccount(walletAddress);
      } catch {
        throw new Error("Your Stellar account was not found on Testnet. Please fund it at: https://friendbot.stellar.org");
      }
      setLoadingMsg(`Building transaction for ${xlmAmountStr} XLM...`);
      const txXDR = new TransactionBuilder(ownerAccount, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.payment({ destination: destinationAddress, asset: Asset.native(), amount: xlmAmountStr }))
        .addMemo(Memo.text("Fino dividend")).setTimeout(30).build().toXDR();

      setLoadingMsg("Requesting Freighter signature...");
      const txRes = await signAndSendTransaction(txXDR);
      setLoadingMsg("Transaction confirmed! Submitting revenue report...");
      setLastTxHash(txRes.txHash);
      await submitRevenueReport(biz._id, { revenueAmount: Number(revenueForm.amount), txHash: txRes.txHash });
      setSubmitStep(3);
      toast.success("Revenue report submitted with dividend payment!");
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Transaction failed");
      setSubmitStep(1);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => { setRevenueForm({ businessId: null, amount: "", notes: "" }); setSubmitStep(1); setLastTxHash(""); setLoadingMsg(""); };

  if (loading) return <LoadingSpinner message="Loading your businesses..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">My Businesses</h1>
            <p className="text-gray-400 mt-1">Manage your funded businesses</p>
          </div>
          <Link to="/apply-funding" className="btn-primary text-sm">
            <FiPlus className="mr-2" /> Apply for Funding
          </Link>
        </div>

        {businesses.length > 0 ? (
          <div className="space-y-6">
            {businesses.map((biz) => {
              const calc = revenueForm.businessId === biz._id ? getDividendCalc(biz) : null;
              return (
                <div key={biz._id} className="glass rounded-2xl p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{biz.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">{biz.category} · {biz.location?.city}, {biz.location?.state}</p>
                    </div>
                    <span className={STATUS_BADGE[biz.status] || "badge badge-neon"}>{biz.status?.replace(/_/g, " ")}</span>
                  </div>

                  {/* Status Message */}
                  {STATUS_MESSAGES[biz.status] && (
                    <div className={`text-sm p-3 rounded-xl mb-4 flex items-center gap-2 ${
                      ["verifying","vote_required"].includes(biz.status) ? "bg-primary-500/10 border border-primary-500/20 text-primary-300" :
                      ["rejected","verification_failed"].includes(biz.status) ? "bg-red-500/10 border border-red-500/20 text-red-300" :
                      "bg-white/[0.04] border border-white/[0.08] text-gray-300"
                    }`}>
                      {["verifying","vote_required"].includes(biz.status) && (
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                      <span>{STATUS_MESSAGES[biz.status]}</span>
                      {biz.status === "voting" && biz.proposalId && (
                        <Link to="/governance" className="ml-2 text-primary-400 hover:text-primary-300 underline text-xs">
                          View Vote
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Fundraising Progress */}
                  {biz.status === "fundraising" && (
                    <div className="mb-4">
                      <ProgressBar raised={biz.raisedAmount} goal={biz.fundingGoal} />
                      <p className="text-xs text-gray-500 mt-1">{biz.investorCount || 0} investors</p>
                    </div>
                  )}

                  {/* Active Stats */}
                  {(biz.status === "active" || biz.status === "funded") && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { icon: FiUsers, label: "Investors", value: biz.investorCount || 0 },
                        { icon: FiDollarSign, label: "Raised", value: formatCurrency(biz.raisedAmount) },
                        { icon: FiActivity, label: "Goal", value: formatCurrency(biz.fundingGoal) },
                      ].map((s, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                            <s.icon className="text-primary-400" /> {s.label}
                          </div>
                          <div className="font-bold text-white">{s.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Revenue Report Section */}
                  {(biz.status === "active" || biz.status === "funded") && (
                    <div className="border-t border-white/10 pt-5 mt-4">
                      <h4 className="text-sm font-bold text-white mb-3">Submit Monthly Revenue & Pay Dividends</h4>
                      {revenueForm.businessId === biz._id ? (
                        <div className="space-y-4">
                          {submitStep === 1 && (
                            <>
                              <input
                                type="number"
                                value={revenueForm.amount}
                                onChange={(e) => setRevenueForm((p) => ({ ...p, amount: e.target.value }))}
                                className="input-dark"
                                placeholder="Revenue amount (INR)"
                              />
                              {calc && (
                                <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20 text-sm space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">Revenue Share ({calc.sharePercent}%)</span>
                                    <span className="font-bold text-white">{formatCurrency(calc.dividendPoolINR)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-300">XLM to Pay</span>
                                    <span className="font-bold text-primary-300">{formatXLM(calc.dividendPoolXLM)}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">This XLM will be sent from your Freighter wallet to the platform for investor distribution.</p>
                                </div>
                              )}
                              <div className="flex gap-3">
                                <button onClick={() => handleRevenueSubmit(biz)} disabled={submitting || !revenueForm.amount} className="btn-primary text-sm disabled:opacity-50">
                                  <FiSend className="mr-1.5" /> Pay & Submit Report
                                </button>
                                <button onClick={resetForm} className="btn-secondary text-sm">Cancel</button>
                              </div>
                            </>
                          )}

                          {submitStep === 2 && (
                            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                              <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
                              <p className="text-sm text-amber-200 font-medium">{loadingMsg}</p>
                              <p className="text-xs text-amber-400/70 mt-1">Please do not close this page.</p>
                            </div>
                          )}

                          {submitStep === 3 && (
                            <div className="p-5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center space-y-3">
                              <FiCheckCircle className="mx-auto text-teal-400 text-4xl" />
                              <p className="text-sm text-teal-200 font-bold">Revenue report submitted with dividend payment!</p>
                              <p className="text-sm text-teal-300">
                                Dividend: {formatCurrency(calc?.dividendPoolINR || 0)} ({formatXLM(calc?.dividendPoolXLM || 0)})
                              </p>
                              {lastTxHash && (
                                <a href={getStellarExplorerUrl("tx", lastTxHash)} target="_blank" rel="noopener noreferrer"
                                  className="text-primary-400 hover:text-primary-300 inline-flex items-center text-xs">
                                  View Transaction <FiExternalLink className="ml-1" />
                                </a>
                              )}
                              <p className="text-xs text-gray-500">Admin will verify and distribute to investors.</p>
                              <button onClick={resetForm} className="btn-primary text-sm">Done</button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => { setRevenueForm({ businessId: biz._id, amount: "", notes: "" }); setSubmitStep(1); }}
                          className="text-sm text-primary-400 hover:text-primary-300 font-medium">
                          Submit Revenue Report →
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <Link to={`/businesses/${biz._id}`} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                      View Public Page →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass rounded-2xl text-center py-20">
            <p className="text-gray-400 mb-6">You haven't listed any businesses yet.</p>
            <Link to="/apply-funding" className="btn-primary">Apply for Funding</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessOwnerDashboard;

