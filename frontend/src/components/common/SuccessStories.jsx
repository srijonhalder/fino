import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getSuccessStories } from "../../services/business.api";
import { formatCurrency, formatXLM } from "../../utils/formatters";
import { motion } from "framer-motion";
import AnimatedSection from "../ui/AnimatedSection";
import {
  FiUsers, FiTrendingUp, FiAward, FiStar, FiCheckCircle, FiArrowRight,
} from "react-icons/fi";

const RISK_CONFIG = {
  LOW:    'badge-success',
  MEDIUM: 'badge-warning',
  HIGH:   'bg-red-500/15 text-red-400 border border-red-500/25',
};

const SuccessStories = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getSuccessStories();
        setStories(res.data.data?.stories || []);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <section className="py-24 relative overflow-hidden" style={{ background: '#111827' }}>
        <div className="section-container text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 rounded-full w-48 mx-auto" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-4 rounded-full w-72 mx-auto" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
      </section>
    );
  }

  if (stories.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#111827' }}>
      <div className="section-container relative z-10">
        <AnimatedSection variant="fade-up" className="text-center mb-14">
          <div className="badge badge-success mb-4 inline-flex">
            <FiCheckCircle size={11} className="mr-1" /> Proven Track Record
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Successfully <span className="gradient-text-teal">Funded</span>
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            Real local businesses that reached their goals and are actively sharing profits on-chain.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story, i) => (
            <motion.div
              key={story._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="glass rounded-2xl overflow-hidden border border-white/8 hover:border-teal-400/25 hover:shadow-neon-teal transition-all duration-300"
            >
              {/* Header gradient */}
              <div
                className="p-5"
                style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(52,211,153,0.08))' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{story.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {story.category} &bull; {story.city}, {story.state}
                    </p>
                  </div>
                  {story.aiCreditScore && (
                    <div
                      className="rounded-xl px-2.5 py-1.5 text-center flex-shrink-0"
                      style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}
                    >
                      <div className="text-lg font-bold text-teal-400 leading-none">{story.aiCreditScore}</div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">AI</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">by {story.ownerName}</p>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox label="Raised" value={formatCurrency(story.raisedAmount)} sub={`of ${formatCurrency(story.fundingGoal)}`} />
                  <MetricBox
                    label="Investors"
                    value={<span className="flex items-center justify-center gap-1"><FiUsers size={13} />{story.investorCount}</span>}
                    sub={`${story.tokensSold || 0}/${story.totalTokens} tokens`}
                  />
                </div>

                {/* Returns */}
                <div
                  className="rounded-xl p-3.5 space-y-2"
                  style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}
                >
                  <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                    <FiTrendingUp size={11} /> Investor Returns
                  </h4>
                  <ReturnRow label="Total Dividends Paid" value={formatCurrency(story.totalDividendsPaidINR)} />
                  <ReturnRow label="On-chain (XLM)" value={formatXLM(story.totalDividendsPaidXLM || story.totalDividendsPaidCELO)} />
                  <ReturnRow label="Months Active" value={story.monthsActive} />
                  {story.avgMonthlyReturnPct > 0 && (
                    <div className="flex justify-between pt-2 border-t border-teal-400/15 text-sm">
                      <span className="text-gray-500">Avg Monthly Return</span>
                      <span className="font-bold text-teal-400">{story.avgMonthlyReturnPct}%</span>
                    </div>
                  )}
                </div>

                {/* Checks */}
                <div
                  className="rounded-xl p-3.5 space-y-2"
                  style={{ background: 'rgba(34,211,165,0.05)', border: '1px solid rgba(34,211,165,0.1)' }}
                >
                  <h4 className="text-xs font-semibold text-primary-400 uppercase tracking-wider flex items-center gap-1">
                    <FiStar size={11} /> Highlights
                  </h4>
                  <CheckItem text={`${Math.round((story.raisedAmount / story.fundingGoal) * 100)}% funded`} />
                  <CheckItem text={`${story.investorCount} investors earning ${story.revenueSharePercentage}% revenue share`} />
                  {story.totalDividendsPaidINR > 0 && <CheckItem text="Dividends paid on-chain via smart contract" />}
                  {story.riskRating && (
                    <div className="flex items-center gap-2">
                      <FiAward size={12} className="text-primary-400 flex-shrink-0" />
                      <span className="text-xs text-gray-400">Risk: <span className={`badge ${RISK_CONFIG[story.riskRating?.toUpperCase()] || 'badge-neon'} ml-1`}>{story.riskRating}</span></span>
                    </div>
                  )}
                </div>

                <Link
                  to={`/businesses/${story._id}`}
                  className="flex items-center justify-center space-x-1.5 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors pt-1"
                >
                  <span>View Business Details</span>
                  <FiArrowRight size={13} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const MetricBox = ({ label, value, sub }) => (
  <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
    <div className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wide">{label}</div>
    <div className="text-sm font-bold text-white">{value}</div>
    {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
  </div>
);

const ReturnRow = ({ label, value }) => (
  <div className="flex justify-between text-xs">
    <span className="text-gray-500">{label}</span>
    <span className="font-semibold text-gray-300">{value}</span>
  </div>
);

const CheckItem = ({ text }) => (
  <div className="flex items-center gap-2">
    <FiCheckCircle size={12} className="text-teal-400 flex-shrink-0" />
    <span className="text-xs text-gray-400">{text}</span>
  </div>
);

export default SuccessStories;
