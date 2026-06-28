const mongoose = require('mongoose');

/**
 * One row per XLM payment hash that has been used to confirm an investment.
 * The unique index is what actually prevents the same on-chain payment being
 * replayed against /api/investments/confirm to mint multiple investments.
 */
const investmentTxLogSchema = new mongoose.Schema(
  {
    xlmTransactionHash: { type: String, required: true, unique: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    investorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenAmount: { type: Number, required: true },
    totalAmountINR: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InvestmentTxLog', investmentTxLogSchema);
