import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from '../common/ProgressBar';
import RiskBadge from '../common/RiskBadge';
import { formatCurrency, calculateDaysRemaining } from '../../utils/formatters';
import { FiMapPin, FiClock, FiCheckCircle, FiTrendingUp, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';

const STATUS_CONFIG = {
  fundraising: { label: 'Fundraising', className: 'badge-warning' },
  funded:      { label: 'Funded',      className: 'badge-cyan' },
  active:      { label: 'Active',      className: 'badge-success' },
  completed:   { label: 'Completed',   className: 'badge badge-neon' },
};

const BusinessCard = ({ business }) => {
  const {
    _id, name, category, status,
    riskRating, aiCreditScore, raisedAmount = 0, fundingGoal = 0,
    revenueSharePercentage, fundingDeadline, photos,
    location, tokenDetails,
  } = business;

  const city = location?.city;
  const state = location?.state;
  const tokenPriceINR = tokenDetails?.tokenPrice;
  const daysLeft = calculateDaysRemaining(fundingDeadline);
  const imgSrc = photos?.[0]?.url || photos?.[0] || 'https://via.placeholder.com/400x200?text=Business';
  const statusCfg = STATUS_CONFIG[status] || { label: status || 'Unknown', className: 'badge-neon' };
  const isFundraising = status === 'fundraising';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="glass rounded-2xl overflow-hidden border border-white/8 hover:border-primary-500/30 hover:shadow-card-hover transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={imgSrc}
          alt={name}
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.75) saturate(0.9)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(11,15,26,0.8) 100%)' }} />
        <span className={`absolute top-3 right-3 badge ${statusCfg.className}`}>
          {statusCfg.label}
        </span>
        <span className="absolute top-3 left-3 badge badge-neon text-xs uppercase tracking-wider">
          {category?.replace('_', ' ')}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1 gap-2">
          <h3 className="font-semibold text-white text-base leading-snug truncate">{name}</h3>
          <RiskBadge rating={riskRating} />
        </div>
        <p className="text-xs text-gray-500 flex items-center mb-4">
          <FiMapPin size={11} className="mr-1 flex-shrink-0" />
          {city}, {state}
        </p>

        {/* Progress */}
        <ProgressBar raised={raisedAmount} goal={fundingGoal} />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs">
          <StatItem label="AI Score" value={`${aiCreditScore || 'N/A'}/100`} highlight />
          <StatItem label="Yield" value={`${revenueSharePercentage || 0}%`} highlight />
          <StatItem label="Min. Invest" value={formatCurrency(tokenPriceINR || 50)} />
          <div className="flex items-center text-gray-400">
            {isFundraising ? (
              <><FiClock size={11} className="mr-1 text-yellow-400" /><span>{daysLeft}d left</span></>
            ) : status === 'funded' ? (
              <><FiCheckCircle size={11} className="mr-1 text-cyan-400" /><span className="text-cyan-400">Fully Funded</span></>
            ) : (
              <><FiTrendingUp size={11} className="mr-1 text-teal-400" /><span className="text-teal-400">Operating</span></>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/businesses/${_id}`}
          className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold btn-secondary hover:bg-primary-500/15 hover:border-primary-500/35 transition-all duration-200"
        >
          <span>View Details</span>
          <FiArrowRight size={13} />
        </Link>
      </div>
    </motion.div>
  );
};

const StatItem = ({ label, value, highlight }) => (
  <div>
    <span className="text-gray-500">{label}: </span>
    <span className={`font-semibold ${highlight ? 'gradient-text' : 'text-gray-300'}`}>{value}</span>
  </div>
);

export default BusinessCard;
