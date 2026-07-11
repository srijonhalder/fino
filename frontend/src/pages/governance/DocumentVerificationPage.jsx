import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FiShield, FiCheckCircle, FiXCircle, FiExternalLink, FiArrowLeft } from "react-icons/fi";
import { getAttestations } from "../../services/governance.api";
import api from "../../services/api";

const STELLAR_EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

const DOC_TYPES = [
  { key: "gst", label: "GST Certificate" },
  { key: "pan", label: "PAN Card" },
  { key: "bankStatement", label: "Bank Statement" },
  { key: "registration", label: "Registration Document" },
  { key: "businessPhoto", label: "Business Photo" },
];

const DocumentVerificationPage = () => {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [attestationData, setAttestationData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bizRes, attRes] = await Promise.all([
          api.get(`/api/businesses/${businessId}`),
          getAttestations(businessId).catch(() => null),
        ]);
        setBusiness(bizRes.data.data.business || bizRes.data.data);
        if (attRes?.data?.data) setAttestationData(attRes.data.data);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, [businessId]);

  if (loading) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
    </div>
  );

  if (!business) return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="glass rounded-xl p-8 text-center max-w-sm w-full">
        <p className="text-gray-400">Business not found.</p>
        <Link to="/explore" className="btn-primary mt-4 text-sm">Browse Businesses</Link>
      </div>
    </div>
  );

  const docHashes = business.documentHashes || {};
  const registeredDocs = DOC_TYPES.filter((d) => docHashes[d.key]?.hash);

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">
        <Link to={`/businesses/${businessId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-primary-400 mb-6 transition-colors">
          <FiArrowLeft className="mr-1" /> Back to Business
        </Link>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-teal-500/15 flex items-center justify-center">
              <FiShield className="text-teal-400 text-xl" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{business.name}</h1>
              <p className="text-sm text-gray-400">Document Verification Record</p>
            </div>
          </div>

          {/* Document Hashes Table */}
          <div className="glass rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-dark-800 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Document Type</th>
                  <th className="px-4 py-3">On-chain Hash</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {DOC_TYPES.map(({ key, label }) => {
                  const doc = docHashes[key];
                  const isRegistered = doc?.hash;
                  return (
                    <tr key={key} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-300">{label}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {isRegistered ? `0x${doc.hash.slice(0, 8)}...${doc.hash.slice(-6)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {doc?.registeredAt ? new Date(doc.registeredAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isRegistered ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <FiCheckCircle className="text-teal-400" />
                            {doc.txHash && (
                              <a href={`${STELLAR_EXPLORER_BASE}/tx/${doc.txHash}`} target="_blank" rel="noopener noreferrer"
                                className="text-primary-400 hover:text-primary-300">
                                <FiExternalLink className="text-xs" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <FiXCircle className="text-gray-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl mb-6 ${
            registeredDocs.length === DOC_TYPES.length
              ? "bg-teal-500/10 border border-teal-500/20 text-teal-300"
              : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
          }`}>
            {registeredDocs.length === DOC_TYPES.length ? <FiCheckCircle /> : <FiShield />}
            <span>
              {registeredDocs.length === DOC_TYPES.length
                ? "All documents on-chain verified"
                : `${registeredDocs.length}/${DOC_TYPES.length} documents registered on-chain`}
            </span>
          </div>

          {/* Attestations */}
          {attestationData?.attestations?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-white mb-3">Verification Attestations</h3>
              <div className="space-y-2">
                {attestationData.attestations.map((att, idx) => (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${att.status === "VERIFIED" ? "bg-teal-500/10 border border-teal-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                    <div className="flex items-center gap-2">
                      {att.status === "VERIFIED"
                        ? <FiCheckCircle className="text-teal-400 flex-shrink-0" />
                        : <FiXCircle className="text-red-400 flex-shrink-0" />}
                      <span className="text-sm text-gray-300">{att.claim}</span>
                    </div>
                    <span className="text-xs text-gray-500">{att.method}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/20">
            <p className="text-xs text-primary-300">
              <strong className="text-primary-200">Privacy Notice:</strong> Document contents are private.
              These hashes prove documents exist and haven't been tampered with since registration.
              Anyone can verify integrity by comparing the hash of the original file against the on-chain record.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentVerificationPage;

