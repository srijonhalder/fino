import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import {
  initiateInvestment,
  confirmInvestment,
} from "../../services/investment.api";
import {
  formatCurrency,
  formatOwnership,
  getStellarExplorerUrl,
} from "../../utils/formatters";
import {
  TransactionBuilder,
  BASE_FEE,
  Networks,
  Operation,
  Horizon,
  Asset,
} from "@stellar/stellar-sdk";
import { toast } from "react-toastify";
import { FiX, FiCheckCircle, FiExternalLink } from "react-icons/fi";

const PRESET_AMOUNTS = [500, 1000, 5000, 10000];
const HORIZON_URL = "https://horizon-testnet.stellar.org";

const InvestmentModal = ({ business, onClose, onSuccess }) => {
  const { signAndSendTransaction, walletAddress } = useWallet();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [txHash, setTxHash] = useState("");
  const [investmentData, setInvestmentData] = useState(null);

  const tokenPrice = business.tokenDetails?.tokenPrice || 100;
  const tokenCount = amount ? Math.floor(Number(amount) / tokenPrice) : 0;
  const totalTokens =
    business.tokenDetails?.totalTokens ||
    (business.fundingGoal ? Math.floor(business.fundingGoal / tokenPrice) : 1);
  const ownershipRaw = totalTokens > 0 ? (tokenCount / totalTokens) * 100 : 0;
  const ownership = formatOwnership(ownershipRaw);

  const handleInitiate = async () => {
    if (!amount || Number(amount) < tokenPrice) {
      toast.error(`Minimum investment is ${formatCurrency(tokenPrice)}`);
      return;
    }
    setLoading(true);
    setLoadingMsg("Initiating investment...");
    try {
      const res = await initiateInvestment(business._id, tokenCount);
      setInvestmentData(res.data.data);
      setStep(2);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!investmentData) return;
    if (!walletAddress) {
      toast.error("Please connect your Freighter wallet first");
      return;
    }

    setLoading(true);
    try {
      setLoadingMsg("Loading your Stellar account...");
      const xlmAmount = String(
        Number(investmentData.totalAmountXLM || "0.01").toFixed(7),
      );
      const toAddress = investmentData.adminWalletAddress;

      // ── Step 1: Load investor's real account from Horizon (needed for sequence number) ──
      const horizonServer = new Horizon.Server(HORIZON_URL);
      let investorAccount;
      try {
        investorAccount = await horizonServer.loadAccount(walletAddress);
      } catch {
        throw new Error(
          `Your Stellar account (${walletAddress.slice(0, 6)}…) was not found on Testnet. ` +
            "Please fund it using Stellar Friendbot: https://friendbot.stellar.org",
        );
      }

      // ── Step 2: Build the XLM payment transaction ──
      setLoadingMsg("Building Stellar transaction...");
      const txBuilder = new TransactionBuilder(investorAccount, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: toAddress,
            asset: Asset.native(),
            amount: xlmAmount,
          }),
        )
        .addMemo(require("@stellar/stellar-sdk").Memo.text("Fino payment"))
        .setTimeout(30);

      const txXDR = txBuilder.build().toXDR();

      // ── Step 3: Sign via Freighter & submit to Horizon ──
      setLoadingMsg("Requesting Freighter signature…");
      const txRes = await signAndSendTransaction(txXDR);

      setLoadingMsg("Confirming investment on backend...");
      setTxHash(txRes.txHash);

      await confirmInvestment(
        business._id,
        investmentData.tokensPurchased,
        txRes.txHash,
      );

      setStep(3);
      toast.success("Investment successful!");
    } catch (err) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Invest in {business.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex px-6 pt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? "bg-primary-600 text-white" : "bg-gray-200 text-gray-500"}`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${step > s ? "bg-primary-600" : "bg-gray-200"}`}
                ></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex px-6 text-xs text-gray-500 mb-4">
          <span className="flex-1">Amount</span>
          <span className="flex-1 text-center">Payment</span>
          <span className="flex-1 text-right">Done</span>
        </div>

        <div className="p-6">
          {/* Step 1: Choose Amount */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`py-2 rounded-lg text-sm font-medium border ${String(a) === amount ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    {formatCurrency(a)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter custom amount (INR)"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              {amount && Number(amount) >= tokenPrice && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tokens</span>
                    <span className="font-semibold">{tokenCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ownership</span>
                    <span className="font-semibold">{ownership}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Token Price</span>
                    <span className="font-semibold">
                      {formatCurrency(tokenPrice)}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleInitiate}
                disabled={loading || !amount}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? loadingMsg : "Continue"}
              </button>
            </div>
          )}

          {/* Step 2: Wallet Approval */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Investment</span>
                  <span className="font-semibold">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tokens</span>
                  <span className="font-semibold">{tokenCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">XLM Amount</span>
                  <span className="font-semibold">
                    {investmentData?.totalAmountXLM} XLM
                  </span>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                ⭐ You will be asked to approve a payment in{" "}
                <strong>Freighter</strong>. Make sure you are on{" "}
                <strong>Stellar Testnet</strong>.
              </div>
              {loading && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full flex-shrink-0"></div>
                  {loadingMsg}
                </div>
              )}
              <button
                onClick={handlePayment}
                disabled={loading}
                className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Send Payment via Freighter"}
              </button>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center space-y-4">
              <FiCheckCircle className="mx-auto text-green-500 text-5xl" />
              <h3 className="text-xl font-bold text-gray-900">
                Investment Successful!
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tokens</span>
                  <span className="font-semibold">{tokenCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold">
                    {formatCurrency(amount)}
                  </span>
                </div>
                {txHash && (
                  <a
                    href={getStellarExplorerUrl("tx", txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline flex items-center text-xs"
                  >
                    View on Stellar Explorer <FiExternalLink className="ml-1" />
                  </a>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onSuccess();
                    navigate("/dashboard/investor");
                  }}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  View Portfolio
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 border py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestmentModal;

