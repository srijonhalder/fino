import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPlatformStats } from '../../services/admin.api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/formatters';
import { FiUsers, FiFileText, FiActivity, FiDollarSign, FiArrowRight, FiShield, FiCheckCircle } from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getPlatformStats();
        setStats(res.data.data);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingSpinner message="Loading admin panel..." />;

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="glow-orb w-96 h-96 bg-primary-600 absolute -top-48 -left-24 opacity-10" />
        <div className="glow-orb w-80 h-80 bg-teal-500 absolute bottom-0 right-0 opacity-8" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">System monitoring — governance decisions are handled by the community</p>
        </div>

        {/* Governance Notice */}
        <div className="glass rounded-xl p-5 mb-8 border border-teal-500/20 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center flex-shrink-0">
            <FiShield className="text-teal-400 text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-white">Decentralized Governance Active</h3>
            <p className="text-sm text-gray-400 mt-1">
              Business approvals and revenue verification are handled by community voting (1 wallet = 1 vote). Admin manual approve/reject has been retired.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <FiUsers />, label: 'Total Users', value: stats?.totalUsers || 0, color: 'text-cyan-400 bg-cyan-500/15' },
            { icon: <FiFileText />, label: 'Pending Applications', value: stats?.businessesByStatus?.pending || 0, color: 'text-amber-400 bg-amber-500/15' },
            { icon: <FiActivity />, label: 'Active Campaigns', value: stats?.totalActiveCampaigns || 0, color: 'text-teal-400 bg-teal-500/15' },
            { icon: <FiDollarSign />, label: 'Total Dividends', value: formatCurrency(stats?.totalDividendsDistributedINR || 0), color: 'text-primary-400 bg-primary-500/15' },
          ].map((s, i) => (
            <div key={i} className="glass rounded-xl p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { to: "/governance", title: "Governance Proposals", desc: "View active community votes and proposal history" },
            { to: "/governance/analytics", title: "Governance Analytics", desc: "Voter participation and platform health metrics" },
            { to: "/admin", title: "User Management", desc: "View users and manage KYC" },
          ].map((card, i) => (
            <Link key={i} to={card.to} className="glass rounded-xl p-6 group hover:border-primary-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white group-hover:text-primary-300 transition-colors">{card.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{card.desc}</p>
                </div>
                <FiArrowRight className="text-gray-600 group-hover:text-primary-400 transition-colors mt-0.5 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* Deprecated Notice */}
        <div className="mt-8 glass rounded-xl p-4 text-center">
          <FiCheckCircle className="inline text-gray-600 mr-2" />
          <span className="text-sm text-gray-500">
            Manual business approvals and revenue verification have been replaced by on-chain governance.
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

