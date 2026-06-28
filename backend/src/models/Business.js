const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    // Owner reference
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Business must have an owner"],
      index: true,
    },

    // Basic information
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: [200, "Business name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Business description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "food_beverage",
        "retail",
        "services",
        "manufacturing",
        "agriculture",
        "technology",
        "healthcare",
        "education",
        "other",
      ],
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String },
    },

    // Legal & verification
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    yearsInOperation: {
      type: Number,
      required: [true, "Years in operation is required"],
      min: 0,
    },

    // Financial information
    financials: {
      averageMonthlyRevenue: {
        type: Number,
        required: [true, "Average monthly revenue is required"],
        min: 0,
      },
      profitMargin: {
        type: Number, // percentage
        min: 0,
        max: 100,
      },
    },

    // Funding details
    fundingGoal: {
      type: Number,
      required: [true, "Funding goal is required"],
      min: [100, "Minimum funding goal is ₹100"],
    },
    raisedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    fundingDeadline: {
      type: Date,
    },

    // Token details
    tokenDetails: {
      tokenName: { type: String },
      tokenSymbol: { type: String, uppercase: true },
      tokenPrice: {
        type: Number,
        required: [true, "Token price is required"],
        min: [1, "Minimum token price is ₹1"],
      },
      totalTokens: {
        type: Number, // Auto-calculated: fundingGoal / tokenPrice
      },
      soldTokens: {
        type: Number,
        default: 0,
      },
      contractAddress: {
        type: String, // Soroban contract address on Stellar
      },
    },

    // Revenue sharing
    revenueSharePercentage: {
      type: Number,
      required: [true, "Revenue share percentage is required"],
      min: [1, "Minimum revenue share is 1%"],
      max: [50, "Maximum revenue share is 50%"],
    },
    revenueSharingDuration: {
      type: Number, // months
      default: 24,
      min: 6,
      max: 60,
    },

    // Escrow
    escrowAddress: {
      type: String, // Admin wallet for MVP
    },

    // Media & documents
    photos: [
      {
        url: { type: String },
        publicId: { type: String }, // Cloudinary public ID
      },
    ],
    documents: [
      {
        name: { type: String },
        ipfsHash: { type: String },
        url: { type: String },
      },
    ],

    // Status tracking
    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "verifying", // oracle verification in progress
        "vote_required", // attestations done, awaiting proposal
        "voting", // governance proposal active
        "approved",
        "fundraising",
        "funded",
        "active",
        "expired",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    // AI Analysis
    aiCreditScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    riskRating: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
    },
    aiAnalysisSummary: {
      type: String,
    },
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed, // Full AI response object
    },

    // Admin fields
    rejectionReason: { type: String },
    adminNotes: { type: String },

    // ── Governance Fields ──
    documentHashes: {
      gst: { hash: String, txHash: String, registeredAt: Date },
      pan: { hash: String, txHash: String, registeredAt: Date },
      bankStatement: { hash: String, txHash: String, registeredAt: Date },
      registration: { hash: String, txHash: String, registeredAt: Date },
      businessPhoto: { hash: String, txHash: String, registeredAt: Date },
    },
    attestationStatus: {
      type: String,
      enum: ["pending", "in_progress", "complete", "failed"],
      default: "pending",
    },
    attestationTxHashes: [String],
    proposalId: { type: Number }, // on-chain governance proposal ID
  },
  {
    timestamps: true,
  },
);

// ──────────────────────────────────────────
// Pre-save: Calculate totalTokens
// ──────────────────────────────────────────
businessSchema.pre("save", function () {
  if (this.fundingGoal && this.tokenDetails && this.tokenDetails.tokenPrice) {
    this.tokenDetails.totalTokens = Math.floor(
      this.fundingGoal / this.tokenDetails.tokenPrice,
    );
  }
});

// ──────────────────────────────────────────
// Virtual: Funding progress percentage
// ──────────────────────────────────────────
businessSchema.virtual("fundingProgress").get(function () {
  if (!this.fundingGoal || this.fundingGoal === 0) return 0;
  return Math.min(
    100,
    ((this.raisedAmount / this.fundingGoal) * 100).toFixed(2),
  );
});

businessSchema.virtual("remainingTokens").get(function () {
  if (!this.tokenDetails) return 0;
  return (
    (this.tokenDetails.totalTokens || 0) - (this.tokenDetails.soldTokens || 0)
  );
});

// Include virtuals in JSON/Object output
businessSchema.set("toJSON", { virtuals: true });
businessSchema.set("toObject", { virtuals: true });

// Indexes
businessSchema.index({ status: 1, createdAt: -1 });
businessSchema.index({ category: 1 });
businessSchema.index({ "location.city": 1 });

const Business = mongoose.model("Business", businessSchema);

module.exports = Business;
