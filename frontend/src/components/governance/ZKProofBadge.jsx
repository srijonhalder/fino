import React from "react";
import {
  FiLock,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
} from "react-icons/fi";

const STELLAR_EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

const ZKProofBadge = ({ rangeProofs = [] }) => {
  if (!rangeProofs.length) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center space-x-1">
        <FiLock className="w-4 h-4 text-purple-500" />
        <span>Zero-Knowledge Proofs</span>
      </h4>

      {rangeProofs.map((proof, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <FiLock className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm text-gray-700 truncate">
              {proof.claim}
            </span>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {proof.isAbove ? (
              <span className="flex items-center space-x-1 text-green-600 text-xs font-medium">
                <FiCheckCircle className="w-3 h-3" />
                <span>TRUE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-red-600 text-xs font-medium">
                <FiXCircle className="w-3 h-3" />
                <span>FALSE</span>
              </span>
            )}
            {proof.txHash && (
              <a
                href={`${STELLAR_EXPLORER_BASE}/tx/${proof.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-600"
                title="Verify Proof on Stellar Explorer"
              >
                <FiExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ))}

      <div className="p-2 bg-purple-50 rounded text-xs text-purple-600">
        <strong>ℹ️</strong> These are zero-knowledge proofs. The exact values
        are private. Only the range claims are proven and verifiable on-chain.
      </div>
    </div>
  );
};

export default ZKProofBadge;
