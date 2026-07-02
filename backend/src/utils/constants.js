/**
 * Constants used across the application
 */

// Fixed XLM/INR conversion rate for hackathon demo
// 1 XLM ≈ ₹40 (approximate real rate — change if needed)
const XLM_INR_RATE = 40;

// Investment limits
const MIN_INVESTMENT_INR = 25; // ₹25 minimum
const MAX_INVESTMENT_INR = 100000; // ₹1,00,000 maximum per business

// Token defaults
const DEFAULT_TOKEN_PRICE_INR = 100; // ₹100 per token

// Business funding
const FUNDING_DEADLINE_DAYS = 60; // 60 days to reach funding goal
const REVENUE_SHARE_PERCENTAGE = 20; // 20% of revenue goes to dividend pool

// KYC
const KYC_AUTO_VERIFY_DELAY_MS = 5000; // 5 seconds for mock auto-verify

// Rate limiting
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX = 50; // 50 attempts per window (generous for dev)
const GENERAL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const GENERAL_RATE_LIMIT_MAX = 1000; // 1000 per 15 min (generous for dev)

// Roles
const ROLES = {
  INVESTOR: 'investor',
  BUSINESS_OWNER: 'business_owner',
  ADMIN: 'admin',
};

// Business statuses
const BUSINESS_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  VERIFYING: 'verifying',
  VOTE_REQUIRED: 'vote_required',
  VOTING: 'voting',
  APPROVED: 'approved',
  FUNDRAISING: 'fundraising',
  FUNDED: 'funded',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
};

// Investment statuses
const INVESTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ACTIVE: 'active',
  EXITED: 'exited',
  REFUNDED: 'refunded',
};

// KYC statuses
const KYC_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

module.exports = {
  XLM_INR_RATE,
  MIN_INVESTMENT_INR,
  MAX_INVESTMENT_INR,
  DEFAULT_TOKEN_PRICE_INR,
  FUNDING_DEADLINE_DAYS,
  REVENUE_SHARE_PERCENTAGE,
  KYC_AUTO_VERIFY_DELAY_MS,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX,
  GENERAL_RATE_LIMIT_WINDOW_MS,
  GENERAL_RATE_LIMIT_MAX,
  ROLES,
  BUSINESS_STATUS,
  INVESTMENT_STATUS,
  KYC_STATUS,
};
