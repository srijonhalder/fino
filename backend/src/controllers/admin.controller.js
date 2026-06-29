const Business = require("../models/Business");
const DividendRecord = require("../models/DividendRecord");
const User = require("../models/User");
const stellarService = require("../services/stellar.service");
const geminiService = require("../services/gemini.service");
const emailService = require("../services/email.service");
const { successResponse, errorResponse } = require("../utils/apiResponse");
const {
  BUSINESS_STATUS,
  FUNDING_DEADLINE_DAYS,
} = require("../utils/constants");

/**
 * @desc    Get platform statistics
 * @route   GET /api/admin/stats
 * @access  Private (Admin)
 */
const getPlatformStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalInvestors,
      totalBusinessOwners,
      businessesByStatus,
      totalDividendsAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "investor" }),
      User.countDocuments({ role: "business_owner" }),
      Business.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      DividendRecord.aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: null, total: { $sum: "$totalDividendPool" } } },
      ]),
    ]);

    const statusMap = {};
    businessesByStatus.forEach((b) => (statusMap[b._id] = b.count));

    // Calculate total invested from business raisedAmount (on-chain source of truth)
    const totalInvestedAgg = await Business.aggregate([
      { $match: { status: { $in: ['fundraising', 'funded', 'active'] } } },
      { $group: { _id: null, total: { $sum: '$raisedAmount' } } },
    ]);

    return successResponse(
      res,
      {
        totalUsers,
        totalInvestors,
        totalBusinessOwners,
        businessesByStatus: statusMap,
        totalActiveCampaigns: statusMap.fundraising || 0,
        totalAmountInvestedINR: totalInvestedAgg[0]?.total || 0,
        totalDividendsDistributedINR: totalDividendsAgg[0]?.total || 0,
      },
      "Platform statistics fetched.",
    );
  } catch (error) {
    console.error("Get platform stats error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get all pending business applications
 * @route   GET /api/admin/businesses/pending
 * @access  Private (Admin)
 */
const getPendingApplications = async (req, res) => {
  try {
    const businesses = await Business.find({
      status: { $in: [BUSINESS_STATUS.PENDING, BUSINESS_STATUS.UNDER_REVIEW] },
    })
      .populate("ownerId", "name email phone")
      .sort("createdAt")
      .lean();

    // Add days since submission
    const now = new Date();
    businesses.forEach((b) => {
      b.daysSinceSubmission = Math.floor(
        (now - new Date(b.createdAt)) / (1000 * 60 * 60 * 24),
      );
    });

    return successResponse(
      res,
      { businesses, count: businesses.length },
      "Pending applications fetched.",
    );
  } catch (error) {
    console.error("Get pending applications error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get all businesses (admin — any status)
 * @route   GET /api/admin/businesses
 * @access  Private (Admin)
 */
const getAllBusinessesAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [businesses, total] = await Promise.all([
      Business.find(filter)
        .populate("ownerId", "name email")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Business.countDocuments(filter),
    ]);

    return successResponse(res, {
      businesses,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin get all businesses error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Generate AI credit score for a business
 * @route   POST /api/admin/businesses/:id/ai-score
 * @access  Private (Admin)
 */
const generateAIScore = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return errorResponse(res, "Business not found.", 404);
    }

    if (!["pending", "under_review"].includes(business.status)) {
      return errorResponse(
        res,
        "AI scoring is only available for pending/under-review businesses.",
        400,
      );
    }

    // Update status to under_review
    business.status = BUSINESS_STATUS.UNDER_REVIEW;

    const analysis = await geminiService.analyzeBusinessForCredit(business);

    business.aiCreditScore = analysis.creditScore;
    business.riskRating = analysis.riskRating;
    business.aiAnalysisSummary = analysis.analysisNotes;
    business.aiAnalysis = analysis;
    await business.save();

    return successResponse(
      res,
      { business, aiAnalysis: analysis },
      "AI credit score generated.",
    );
  } catch (error) {
    console.error("Generate AI score error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Approve a business application
 * @route   POST /api/admin/businesses/:id/approve
 * @access  Private (Admin)
 */
const approveBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id).populate(
      "ownerId",
      "name email",
    );
    if (!business) {
      return errorResponse(res, "Business not found.", 404);
    }

    if (!["pending", "under_review"].includes(business.status)) {
      return errorResponse(
        res,
        `Cannot approve a business with status "${business.status}".`,
        400,
      );
    }

    // Generate AI score if not already done
    if (!business.aiCreditScore) {
      const analysis = await geminiService.analyzeBusinessForCredit(business);
      business.aiCreditScore = analysis.creditScore;
      business.riskRating = analysis.riskRating;
      business.aiAnalysisSummary = analysis.analysisNotes;
      business.aiAnalysis = analysis;
    }

    // Deploy token on Stellar (Soroban)
    const tokenName =
      business.tokenDetails.tokenName || `${business.name} Token`;
    const tokenSymbol =
      business.tokenDetails.tokenSymbol ||
      business.name.substring(0, 4).toUpperCase();
    const totalTokens = business.tokenDetails.totalTokens;

    console.log(`🚀 Deploying token for business: ${business.name}`);
    const deployment = await stellarService.deployBusinessToken(
      tokenName,
      tokenSymbol,
      totalTokens,
      business._id.toString(),
      business.tokenDetails.tokenPrice,
      business.fundingGoal,
    );

    // Update business
    business.tokenDetails.contractAddress = deployment.contractAddress;
    business.escrowAddress = process.env.ESCROW_CONTRACT_ADDRESS || "";
    business.status = BUSINESS_STATUS.FUNDRAISING;
    business.fundingDeadline = new Date(
      Date.now() + FUNDING_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
    );
    business.adminNotes = req.body?.adminNotes || "";
    await business.save();

    // Send approval email
    if (business.ownerId?.email) {
      emailService.sendFundingGoalReachedEmail(
        business.ownerId.email,
        business.ownerId.name,
        business.name,
        "approved for fundraising",
      );
    }

    return successResponse(
      res,
      {
        business,
        contractAddress: deployment.contractAddress,
        deploymentTxHash: deployment.txHash,
      },
      "Business approved! ERC-20 token deployed and fundraising has started.",
    );
  } catch (error) {
    console.error("Approve business error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Reject a business application
 * @route   POST /api/admin/businesses/:id/reject
 * @access  Private (Admin)
 */
const rejectBusiness = async (req, res) => {
  try {
    const { reason } = req.body;
    const business = await Business.findById(req.params.id).populate(
      "ownerId",
      "name email",
    );
    if (!business) {
      return errorResponse(res, "Business not found.", 404);
    }

    business.status = BUSINESS_STATUS.REJECTED;
    business.rejectionReason =
      reason || "Application does not meet platform requirements.";
    await business.save();

    return successResponse(res, { business }, "Business application rejected.");
  } catch (error) {
    console.error("Reject business error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get pending revenue reports
 * @route   GET /api/admin/dividend-records/pending
 * @access  Private (Admin)
 */
const getPendingRevenueReports = async (req, res) => {
  try {
    const records = await DividendRecord.find({
      status: { $in: ["pending", "admin_verified"] },
    })
      .populate("businessId", "name category revenueSharePercentage")
      .sort("createdAt")
      .lean();

    return successResponse(
      res,
      { records, count: records.length },
      "Revenue reports fetched.",
    );
  } catch (error) {
    console.error("Get pending reports error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get all users (with optional KYC status filter)
 * @route   GET /api/admin/users
 * @access  Private (Admin)
 */
const getAllUsers = async (req, res) => {
  try {
    const { kycStatus, role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (kycStatus) filter.kycStatus = kycStatus;
    if (role) filter.role = role;

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return successResponse(res, {
      users: users.map((u) => {
        delete u.password;
        delete u.aadhaarHash;
        return u;
      }),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Update user KYC status
 * @route   PUT /api/admin/users/:id/kyc
 * @access  Private (Admin)
 */
const updateUserKYC = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "verified", "rejected"].includes(status)) {
      return errorResponse(
        res,
        "Invalid KYC status. Use: pending, verified, rejected",
        400,
      );
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus: status },
      { new: true },
    );

    if (!user) {
      return errorResponse(res, "User not found.", 404);
    }

    // Send KYC approved email
    if (status === "verified") {
      emailService.sendKYCApprovedEmail(user.email, user.name);
    }

    return successResponse(
      res,
      { user: user.toSafeObject() },
      `KYC status updated to ${status}.`,
    );
  } catch (error) {
    console.error("Update KYC error:", error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getPlatformStats,
  getPendingApplications,
  getAllBusinessesAdmin,
  generateAIScore,
  approveBusiness,
  rejectBusiness,
  getPendingRevenueReports,
  getAllUsers,
  updateUserKYC,
};
