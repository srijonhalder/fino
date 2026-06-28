const mongoose = require('mongoose');

const individualPayoutSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    tokensPurchased: {
      type: Number,
    },
    payoutAmountINR: {
      type: Number,
      required: true,
    },
    payoutAmountXLM: {
      type: Number,
      required: true,
    },
    txHash: {
      type: String,
    },
    success: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const dividendRecordSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: [true, 'Dividend record must reference a business'],
      index: true,
    },

    // Revenue details
    reportedRevenue: {
      type: Number,
      required: [true, 'Reported revenue is required'],
      min: 0,
    },
    revenueVerified: {
      type: Number, // Admin-verified amount (may differ from reported)
      min: 0,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },

    // Supporting documents
    supportingDocumentHash: {
      type: String, // IPFS hash of GST return / invoice
    },

    // Dividend deposit from business owner
    dividendDepositTxHash: {
      type: String, // On-chain tx where business owner paid dividend XLM to admin
    },
    dividendDepositAmountXLM: {
      type: Number, // How much XLM the business owner deposited
      default: 0,
    },
    dividendDepositIndex: {
      type: Number, // Index in DividendDistributor contract deposits array
      default: 0,
    },
    distributionTxHash: {
      type: String, // On-chain tx from DividendDistributor auto-distribution
    },
    rejectionReason: {
      type: String,
    },

    // Dividend pool
    totalDividendPool: {
      type: Number, // Calculated: verifiedRevenue * revenueSharePercentage / 100
      default: 0,
    },
    totalDividendPoolXLM: {
      type: Number,
      default: 0,
    },

    // Individual payouts
    individualPayouts: [individualPayoutSchema],

    // Status tracking
    status: {
      type: String,
      enum: ['pending', 'admin_verified', 'distributing', 'completed', 'partially_failed', 'failed', 'distributed', 'rejected'],
      default: 'pending',
      index: true,
    },

    // Admin fields
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    distributedAt: {
      type: Date,
    },
    adminNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

dividendRecordSchema.index({ businessId: 1, month: 1, year: 1 });

const DividendRecord = mongoose.model('DividendRecord', dividendRecordSchema);

module.exports = DividendRecord;
