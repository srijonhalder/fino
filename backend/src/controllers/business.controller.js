const Business = require('../models/Business');
const DividendRecord = require('../models/DividendRecord');
const User = require('../models/User');
const stellarService = require('../services/stellar.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { BUSINESS_STATUS, FUNDING_DEADLINE_DAYS, XLM_INR_RATE } = require('../utils/constants');

/**
 * @desc    Submit a new business application
 * @route   POST /api/businesses/apply
 * @access  Private (business_owner)
 */
const submitApplication = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      address,
      city,
      state,
      pincode,
      gstNumber,
      yearsInOperation,
      averageMonthlyRevenue,
      profitMargin,
      fundingGoal,
      tokenPrice,
      tokenName,
      tokenSymbol,
      revenueSharePercentage,
      revenueSharingDuration,
    } = req.body;

    // Validate required fields
    if (!name || !description || !category || !city || !state || !fundingGoal || !tokenPrice) {
      return errorResponse(res, 'Missing required fields.', 400);
    }

    // Process uploaded photos from Cloudinary
    let photos = [];
    if (req.files && req.files.photos) {
      photos = req.files.photos.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));
    }

    // Process uploaded documents
    let documents = [];
    if (req.files && req.files.documents) {
      documents = req.files.documents.map((file) => ({
        name: file.originalname,
        url: file.path,
      }));
    }

    // Create business
    const business = await Business.create({
      ownerId: req.user._id,
      name,
      description,
      category,
      location: { address: address || '', city, state, pincode },
      gstNumber,
      yearsInOperation: Number(yearsInOperation) || 0,
      financials: {
        averageMonthlyRevenue: Number(averageMonthlyRevenue) || 0,
        profitMargin: Number(profitMargin) || 0,
      },
      fundingGoal: Number(fundingGoal),
      tokenDetails: {
        tokenName: tokenName || `${name} Token`,
        tokenSymbol: tokenSymbol || name.substring(0, 4).toUpperCase(),
        tokenPrice: Number(tokenPrice),
      },
      revenueSharePercentage: Number(revenueSharePercentage) || 20,
      revenueSharingDuration: Number(revenueSharingDuration) || 24,
      photos,
      documents,
      status: BUSINESS_STATUS.PENDING,
    });

    // ── Decentralized Verification Pipeline (async, non-blocking) ──
    // Hash documents and register on-chain, then trigger oracle
    setTimeout(async () => {
      try {
        const docHashService = require('../services/documentHash.service');
        const oracleService = require('../services/verificationOracle.service');

        // Hash and register each uploaded document on-chain
        if (documents.length > 0) {
          console.log(`📝 Registering ${documents.length} document hashes on-chain for ${business.name}...`);
          for (const doc of documents) {
            try {
              await docHashService.registerDocumentOnChain(
                business._id.toString(),
                doc.name || 'document',
                Buffer.from(doc.url || ''), // Use URL as content proxy for hashing
                doc.url
              );
            } catch (hashErr) {
              console.warn(`  Doc hash failed for ${doc.name}:`, hashErr.message);
            }
          }
        }

        // Update status to verifying
        business.status = 'verifying';
        business.attestationStatus = 'in_progress';
        await business.save();

        // Run oracle verification (GST, PAN, age, docs, AI, funding goal)
        console.log(`🔍 Starting oracle verification for ${business.name}...`);
        await oracleService.startVerification(business._id.toString());
        console.log(`✅ Oracle verification complete for ${business.name}`);

        // Notify business owner that verification is complete and vote is live
        try {
          const notificationService = require('../services/notification.service');
          const updatedBiz = await Business.findById(business._id);
          await notificationService.createNotification(
            business.ownerId,
            'verification_complete',
            '✅ Verification Complete',
            `"${business.name}" passed automated verification. A community governance vote has been created.`,
            `/governance`
          );
        } catch (notifErr) {
          console.error('Verification notification failed:', notifErr.message);
        }
      } catch (pipelineErr) {
        console.error(`Verification pipeline error for ${business.name}:`, pipelineErr.message);
      }
    }, 3000); // Start after 3 seconds

    return successResponse(
      res,
      { business },
      'Business application submitted! Automated verification starting...',
      201
    );
  } catch (error) {
    console.error('Submit application error:', error);
    if (error.name === 'ValidationError') {
      return errorResponse(res, error.message, 400);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get all businesses (public — only fundraising/funded/active)
 * @route   GET /api/businesses
 * @access  Public
 */
const getAllBusinesses = async (req, res) => {
  try {
    const { status, category, city, riskRating, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    // Build filter
    const filter = {};

    // Public can only see these statuses
    const publicStatuses = [
      BUSINESS_STATUS.FUNDRAISING,
      BUSINESS_STATUS.FUNDED,
      BUSINESS_STATUS.ACTIVE,
    ];

    if (status && publicStatuses.includes(status)) {
      filter.status = status;
    } else {
      filter.status = { $in: publicStatuses };
    }

    if (category) filter.category = category;
    if (city) filter['location.city'] = new RegExp(city, 'i');
    if (riskRating) filter.riskRating = riskRating;

    const skip = (Number(page) - 1) * Number(limit);

    const [businesses, total] = await Promise.all([
      Business.find(filter)
        .populate('ownerId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Business.countDocuments(filter),
    ]);

    return successResponse(
      res,
      {
        businesses,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
      'Businesses fetched successfully.'
    );
  } catch (error) {
    console.error('Get all businesses error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get single business by ID (public)
 * @route   GET /api/businesses/:id
 * @access  Public
 */
const getSingleBusiness = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('ownerId', 'name email');

    if (!business) {
      return errorResponse(res, 'Business not found.', 404);
    }

    // Calculate investor count from on-chain token holders
    let investorCount = 0;
    if (business.tokenDetails?.contractAddress) {
      try {
        const users = await User.find({ 
          walletAddress: { $exists: true, $ne: null } 
        }).lean();
        
        for (const user of users) {
          const isInvestor = await stellarService.isBusinessInvestor(
            business.tokenDetails.contractAddress,
            user.walletAddress
          );
          if (isInvestor) investorCount++;
        }
      } catch (err) {
        console.warn('Failed to count investors on-chain:', err.message);
      }
    }

    const data = business.toObject();
    data.investorCount = investorCount;
    data.fundingProgressPercent = business.fundingProgress;

    return successResponse(res, { business: data }, 'Business details fetched.');
  } catch (error) {
    console.error('Get single business error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get my businesses (business owner)
 * @route   GET /api/businesses/my-businesses
 * @access  Private (business_owner)
 */
const getMyBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ ownerId: req.user._id })
      .sort('-createdAt')
      .lean();

    return successResponse(res, { businesses }, 'Your businesses fetched successfully.');
  } catch (error) {
    console.error('Get my businesses error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Submit monthly revenue report
 * @route   POST /api/businesses/:id/revenue-report
 * @access  Private (business_owner of that business)
 */
const submitRevenueReport = async (req, res) => {
  try {
    const { revenueAmount, supportingDocumentHash, month, year, txHash } = req.body;
    const business = await Business.findById(req.params.id);

    if (!business) {
      return errorResponse(res, 'Business not found.', 404);
    }

    // Ensure the business owner is submitting
    if (business.ownerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'You can only submit reports for your own business.', 403);
    }

    // Business must be active
    if (business.status !== BUSINESS_STATUS.ACTIVE) {
      return errorResponse(res, 'Revenue reports can only be submitted for active businesses.', 400);
    }

    if (!revenueAmount || revenueAmount <= 0) {
      return errorResponse(res, 'Revenue amount must be a positive number.', 400);
    }

    if (!txHash) {
      return errorResponse(res, 'Transaction hash is required. You must pay the dividend XLM to the DividendDistributor contract.', 400);
    }

    // Calculate dividend pool and XLM amount
    const revenueSharePct = business.revenueSharePercentage || 20;
    const dividendPoolINR = Number(revenueAmount) * (revenueSharePct / 100);
    const dividendPoolXLM = parseFloat((dividendPoolINR / XLM_INR_RATE).toFixed(6));

    // Verify tx was confirmed on-chain
    const stellarService = require('../services/stellar.service');
    const dividendDistributorService = require('../services/dividendDistributor.service');
    const txStatus = await stellarService.checkTransactionStatus(txHash);
    if (txStatus.status !== 'success') {
      return errorResponse(res, 'Dividend deposit transaction not confirmed on-chain.', 400);
    }

    // Generate ZK range proof for revenue (simulated)
    const zkProofService = require('../services/zkProof.service');
    let zkResult = null;
    try {
      zkResult = await zkProofService.verifyRevenueWithZKProof(
        business._id.toString(),
        Number(revenueAmount),
        30000 // threshold: revenue > ₹30,000
      );
    } catch (err) {
      console.warn('ZK proof generation failed (non-blocking):', err.message);
    }

    // Get deposit index from on-chain
    let depositIndex = 0;
    try {
      depositIndex = await dividendDistributorService.getDepositCount(business._id.toString());
      depositIndex = Math.max(0, depositIndex - 1); // latest deposit
    } catch (err) {
      console.warn('Could not fetch deposit index:', err.message);
    }

    // Create a dividend record with pending status + deposit info
    const dividendRecord = await DividendRecord.create({
      businessId: business._id,
      reportedRevenue: Number(revenueAmount),
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      supportingDocumentHash: supportingDocumentHash || null,
      dividendDepositTxHash: txHash,
      dividendDepositAmountXLM: dividendPoolXLM,
      dividendDepositIndex: depositIndex,
      totalDividendPool: dividendPoolINR,
      totalDividendPoolXLM: dividendPoolXLM,
      status: 'pending',
    });

    // Auto-create REVENUE_VERIFICATION governance proposal
    try {
      const proposalCreator = require('../services/proposalCreator.service');
      await proposalCreator.createRevenueVerificationProposal(
        business._id.toString(),
        dividendRecord._id.toString()
      );
    } catch (err) {
      console.warn('Auto-proposal creation failed (non-blocking):', err.message);
    }

    return successResponse(
      res,
      {
        dividendRecord,
        dividendPoolINR,
        dividendPoolXLM,
        zkProof: zkResult ? { stored: true, isAboveThreshold: zkResult.isAbove } : null,
      },
      'Revenue report submitted. Community verification vote created automatically.',
      201
    );
  } catch (error) {
    console.error('Submit revenue report error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get success stories — active businesses with completed dividends
 * @route   GET /api/businesses/success-stories
 * @access  Public
 */
const getSuccessStories = async (req, res) => {
  try {
    // Find businesses that are active (successfully funded & operating)
    // Extra safety: ensure raised >= goal to avoid showing partially-funded businesses
    const businesses = await Business.find({
      status: { $in: [BUSINESS_STATUS.ACTIVE, BUSINESS_STATUS.FUNDED] },
      $expr: { $gte: ['$raisedAmount', '$fundingGoal'] },
    })
      .populate('ownerId', 'name')
      .sort('-raisedAmount')
      .limit(6)
      .lean();

    // Enrich each business with dividend & investor stats
    const stories = [];
    for (const biz of businesses) {
      // Count investors from on-chain token holders
      let investorCount = 0;
      if (biz.tokenDetails?.contractAddress) {
        try {
          const users = await User.find({ 
            walletAddress: { $exists: true, $ne: null } 
          }).lean();
          
          for (const user of users) {
            const isInvestor = await stellarService.isBusinessInvestor(
              biz.tokenDetails.contractAddress,
              user.walletAddress
            );
            if (isInvestor) investorCount++;
          }
        } catch (err) {
          // Use soldTokens as fallback estimate
          investorCount = biz.tokenDetails?.soldTokens > 0 ? 1 : 0;
        }
      }

      // Get dividend records for this business
      const dividendRecords = await DividendRecord.find({
        businessId: biz._id,
        status: { $in: ['completed', 'partially_failed'] },
      }).lean();

      const totalDividendsPaidINR = dividendRecords.reduce(
        (sum, r) => sum + (r.totalDividendPool || 0),
        0
      );
      const totalDividendsPaidXLM = dividendRecords.reduce(
        (sum, r) => sum + (r.totalDividendPoolXLM || 0),
        0
      );
      const monthsActive = dividendRecords.length;

      // Calculate average monthly return percentage for investors
      const avgMonthlyReturnPct =
        biz.raisedAmount > 0 && monthsActive > 0
          ? ((totalDividendsPaidINR / monthsActive / biz.raisedAmount) * 100).toFixed(1)
          : 0;

      stories.push({
        _id: biz._id,
        name: biz.name,
        category: biz.category,
        city: biz.location?.city,
        state: biz.location?.state,
        photo: biz.photos?.[0]?.url || null,
        ownerName: biz.ownerId?.name || 'Business Owner',
        fundingGoal: biz.fundingGoal,
        raisedAmount: biz.raisedAmount,
        revenueSharePercentage: biz.revenueSharePercentage,
        aiCreditScore: biz.aiCreditScore,
        riskRating: biz.riskRating,
        investorCount,
        totalDividendsPaidINR: parseFloat(totalDividendsPaidINR.toFixed(2)),
        totalDividendsPaidXLM: parseFloat(totalDividendsPaidXLM.toFixed(6)),
        monthsActive,
        avgMonthlyReturnPct: parseFloat(avgMonthlyReturnPct),
        tokenPrice: biz.tokenDetails?.tokenPrice,
        totalTokens: biz.tokenDetails?.totalTokens,
        tokensSold: biz.tokenDetails?.tokensSold,
      });
    }

    return successResponse(
      res,
      { stories, count: stories.length },
      'Success stories fetched.'
    );
  } catch (error) {
    console.error('Get success stories error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  submitApplication,
  getAllBusinesses,
  getSingleBusiness,
  getMyBusinesses,
  submitRevenueReport,
  getSuccessStories,
};
