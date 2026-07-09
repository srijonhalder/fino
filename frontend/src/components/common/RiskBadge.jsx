import React from 'react';

const RISK_CONFIG = {
  LOW:    { cls: 'badge-success', dot: '#34d399' },
  MEDIUM: { cls: 'badge-warning', dot: '#fbbf24' },
  HIGH:   { cls: 'bg-red-500/15 text-red-400 border border-red-500/25', dot: '#f87171' },
};

const RiskBadge = ({ rating }) => {
  const cfg = RISK_CONFIG[rating] || { cls: 'badge-neon', dot: '#9ca3af' };
  return (
    <span className={`badge ${cfg.cls} flex items-center space-x-1`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      <span>{rating || 'N/A'}</span>
    </span>
  );
};

export default RiskBadge;
