const { XLM_INR_RATE } = require("./constants");

/**
 * Calculate an investor's dividend share
 * @param {number} investorTokens - tokens held by the investor
 * @param {number} totalTokens - total tokens issued for the business
 * @param {number} dividendPool - total dividend pool amount (INR)
 * @returns {number} investor's share in INR
 */
const calculateDividend = (investorTokens, totalTokens, dividendPool) => {
  if (totalTokens === 0) return 0;
  return (investorTokens / totalTokens) * dividendPool;
};

/**
 * Calculate how many tokens a given INR amount buys
 * @param {number} amountINR - investment amount in INR
 * @param {number} tokenPriceINR - price per token in INR
 * @returns {number} number of tokens
 */
const calculateTokensFromAmount = (amountINR, tokenPriceINR) => {
  if (tokenPriceINR === 0) return 0;
  return Math.floor(amountINR / tokenPriceINR);
};

/**
 * Calculate funding progress percentage
 * @param {number} raisedAmount - amount raised so far (INR)
 * @param {number} fundingGoal - target funding goal (INR)
 * @returns {number} percentage 0-100
 */
const calculateFundingProgress = (raisedAmount, fundingGoal) => {
  if (fundingGoal === 0) return 0;
  return Math.min(100, Math.round((raisedAmount / fundingGoal) * 100));
};

/**
 * Convert XLM amount to INR using fixed demo rate
 * @param {number} xlmAmount
 * @returns {number} INR amount
 */
const xlmToInr = (xlmAmount) => {
  return xlmAmount * XLM_INR_RATE;
};

/**
 * Convert INR amount to XLM using fixed demo rate
 * @param {number} inrAmount
 * @returns {number} XLM amount
 */
const inrToXlm = (inrAmount) => {
  return inrAmount / XLM_INR_RATE;
};

module.exports = {
  calculateDividend,
  calculateTokensFromAmount,
  calculateFundingProgress,
  xlmToInr,
  inrToXlm,
};
