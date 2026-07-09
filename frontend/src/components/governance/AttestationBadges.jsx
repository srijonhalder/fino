import React from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiCpu,
  FiExternalLink,
} from "react-icons/fi";

const STELLAR_EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

const statusConfig = {
  VERIFIED: {
    icon: FiCheckCircle,
    color: "text-green-500",
    bg: "bg-green-50",
    label: "✅",
  },
  FAILED: {
    icon: FiXCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    label: "❌",
  },
  WARNING: {
    icon: FiAlertTriangle,
    color: "text-yellow-500",
    bg: "bg-yellow-50",
    label: "⚠️",
  },
  AI: { icon: FiCpu, color: "text-blue-500", bg: "bg-blue-50", label: "🤖" },
  PENDING: {
    icon: FiAlertTriangle,
    color: "text-gray-400",
    bg: "bg-gray-50",
    label: "⏳",
  },
};

const AttestationBadges = ({ attestations = [], summary = {} }) => {
  if (!attestations.length) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
        No verification attestations available yet.
      </div>
    );
  }

  // Map Solidity enum (0=PENDING, 1=VERIFIED, 2=FAILED) to status strings
  const getStatusKey = (att) => {
    if (att.method === "ai_analysis") return "AI";
    const statusMap = { 0: "PENDING", 1: "VERIFIED", 2: "FAILED" };
    return statusMap[att.status] || "PENDING";
  };

  return (
    <div className="space-y-2">
      {attestations.map((att, idx) => {
        const statusKey = getStatusKey(att);
        const config = statusConfig[statusKey] || statusConfig.PENDING;
        const Icon = config.icon;

        return (
          <div
            key={idx}
            className={`flex items-center justify-between p-3 rounded-lg ${config.bg}`}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Icon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
              <span className="text-sm text-gray-700 truncate">
                {att.claim}
              </span>
            </div>
            <div className="flex items-center space-x-2 ml-2">
              <span className="text-xs text-gray-400 hidden sm:inline">
                {att.method}
              </span>
              {att.txHash && (
                <a
                  href={`${STELLAR_EXPLORER_BASE}/tx/${att.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-600"
                  title="View on Stellar Explorer"
                >
                  <FiExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        );
      })}

      {/* Summary bar */}
      {summary.total > 0 && (
        <div className="flex items-center space-x-3 pt-2 text-xs text-gray-500">
          <span className="text-green-600 font-medium">
            {summary.verified}/{summary.total} verified
          </span>
          {summary.rangeProofs > 0 && (
            <span className="text-purple-600 font-medium">
              {summary.rangeProofs} range proofs
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AttestationBadges;
