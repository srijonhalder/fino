import React, { useState, useEffect } from 'react';
import { getAllBusinesses } from '../../services/business.api';
import BusinessCard from '../../components/business/BusinessCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AnimatedSection from '../../components/ui/AnimatedSection';
import BackgroundOrbs from '../../components/ui/BackgroundOrbs';
import { FiFilter, FiX, FiSearch, FiChevronDown } from 'react-icons/fi';

const CATEGORIES = [
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'retail', label: 'Retail' },
  { value: 'services', label: 'Services' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'education', label: 'Education' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'other', label: 'Other' },
];
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest' },
  { value: '-raisedAmount', label: 'Most Funded' },
  { value: '-revenueSharePercentage', label: 'Highest Yield' },
];

const ExplorePage = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ category: '', riskRating: '', sort: '-createdAt', status: 'fundraising' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 12, ...filters };
        Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
        const res = await getAllBusinesses(params);
        setBusinesses(res.data.data?.businesses || []);
        setTotalPages(res.data.data?.pagination?.pages || 1);
      } catch { }
      setLoading(false);
    };
    load();
  }, [page, filters]);

  const updateFilter = (key, value) => {
    setFilters((p) => ({ ...p, [key]: p[key] === value ? '' : value }));
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-20">
      {/* Page header */}
      <div className="relative py-16 overflow-hidden" style={{ background: 'linear-gradient(180deg, #111827 0%, transparent 100%)' }}>
        <BackgroundOrbs variant="subtle" />
        <div className="section-container relative z-10">
          <AnimatedSection variant="fade-up">
            <span className="badge badge-neon mb-4 inline-flex">
              <FiSearch size={11} className="mr-1" /> Marketplace
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              Explore <span className="gradient-text">Businesses</span>
            </h1>
            <p className="text-gray-400 max-w-lg">
              Browse AI-scored, verified businesses actively raising capital on the Stellar blockchain.
            </p>
          </AnimatedSection>
        </div>
        <div className="divider-glow absolute bottom-0 inset-x-0" />
      </div>

      <div className="section-container py-10">
        <div className="flex justify-between items-center mb-6 md:hidden">
          <span className="text-gray-400 text-sm">{businesses.length} businesses found</span>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1.5 btn-secondary text-sm py-2 px-3"
          >
            {showFilters ? <FiX size={14} /> : <FiFilter size={14} />}
            <span>Filters</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* ── Filter Sidebar ── */}
          <div className={`md:block md:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden'}`}>
            <div className="glass rounded-2xl p-5 space-y-6 sticky top-24">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-300 flex items-center">
                  <FiFilter size={13} className="mr-2 text-primary-400" /> Filters
                </span>
                <button
                  onClick={() => setFilters({ category: '', riskRating: '', sort: '-createdAt', status: 'fundraising' })}
                  className="text-xs text-gray-500 hover:text-primary-400 transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Status */}
              <FilterSection title="Status">
                {['fundraising', 'active'].map((s) => (
                  <RadioRow
                    key={s}
                    label={s.charAt(0).toUpperCase() + s.slice(1)}
                    checked={filters.status === s}
                    onChange={() => updateFilter('status', s)}
                  />
                ))}
              </FilterSection>

              {/* Category */}
              <FilterSection title="Category">
                {CATEGORIES.map((c) => (
                  <CheckRow
                    key={c.value}
                    label={c.label}
                    checked={filters.category === c.value}
                    onChange={() => updateFilter('category', c.value)}
                  />
                ))}
              </FilterSection>

              {/* Risk */}
              <FilterSection title="Risk Rating">
                {['LOW', 'MEDIUM', 'HIGH'].map((r) => (
                  <CheckRow
                    key={r}
                    label={r}
                    checked={filters.riskRating === r}
                    onChange={() => updateFilter('riskRating', r)}
                  />
                ))}
              </FilterSection>

              {/* Sort */}
              <FilterSection title="Sort By">
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}
                    className="input-dark text-sm appearance-none pr-8 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value} className="bg-dark-800">
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <FiChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </FilterSection>
            </div>
          </div>

          {/* ── Business Grid ── */}
          <div className="flex-1">
            {loading ? (
              <LoadingSpinner />
            ) : businesses.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {businesses.map((b) => <BusinessCard key={b._id} business={b} />)}
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center mt-10 gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                          page === i + 1
                            ? 'text-white shadow-neon'
                            : 'glass text-gray-400 hover:text-white'
                        }`}
                        style={page === i + 1 ? { background: 'linear-gradient(135deg, #22D3A5, #22D3EE)' } : {}}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="glass rounded-2xl p-16 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-gray-400">No businesses found matching your filters.</p>
                <button
                  onClick={() => setFilters({ category: '', riskRating: '', sort: '-createdAt', status: 'fundraising' })}
                  className="btn-secondary text-sm py-2 px-5 mt-4"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Filter helper components ── */
const FilterSection = ({ title, children }) => (
  <div>
    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
    <div className="space-y-0.5">{children}</div>
  </div>
);

const RadioRow = ({ label, checked, onChange }) => (
  <label className="flex items-center space-x-2.5 py-1.5 cursor-pointer group">
    <div
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        checked ? 'border-primary-500' : 'border-gray-600 group-hover:border-gray-400'
      }`}
    >
      {checked && <div className="w-2 h-2 rounded-full bg-primary-500" />}
    </div>
    <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
    <span className={`text-sm ${checked ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>{label}</span>
  </label>
);

const CheckRow = ({ label, checked, onChange }) => (
  <label className="flex items-center space-x-2.5 py-1.5 cursor-pointer group">
    <div
      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
        checked ? 'border-primary-500 bg-primary-500/20' : 'border-gray-600 group-hover:border-gray-400'
      }`}
    >
      {checked && (
        <svg width="9" height="7" fill="none" viewBox="0 0 9 7">
          <path d="M1 3.5L3.5 6L8 1" stroke="#22D3A5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <span className={`text-sm ${checked ? 'text-gray-200' : 'text-gray-500 group-hover:text-gray-300'} transition-colors`}>{label}</span>
  </label>
);

export default ExplorePage;
