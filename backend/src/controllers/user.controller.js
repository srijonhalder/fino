const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { KYC_AUTO_VERIFY_DELAY_MS } = require('../utils/constants');
const notificationService = require('../services/notification.service');
const { StrKey } = require('@stellar/stellar-sdk');

const normalizeWalletAddress = (walletAddress) => {
  if (typeof walletAddress !== 'string') return '';
  return walletAddress.trim();
};

const isValidWalletAddress = (walletAddress) => {
  const normalized = normalizeWalletAddress(walletAddress);
  if (!normalized) return false;
  const isEvm = /^0x[a-fA-F0-9]{40}$/.test(normalized);
  const isStellar = StrKey.isValidEd25519PublicKey(normalized);
  return isEvm || isStellar;
};

const canonicalWalletAddress = (walletAddress) => {
  const normalized = normalizeWalletAddress(walletAddress);
  return normalized.startsWith('0x') ? normalized.toLowerCase() : normalized;
};

/**
 * @desc    Submit KYC documents (Aadhaar + PAN + Selfie)
 * @route   POST /api/users/kyc
 * @access  Private
 */
const submitKYC = async (req, res) => {
  try {
    const { aadhaarNumber, panNumber } = req.body;
    const userId = req.user._id;

    // Validate Aadhaar number (exactly 12 digits)
    if (!aadhaarNumber || !/^\d{12}$/.test(aadhaarNumber)) {
      return errorResponse(res, 'Aadhaar number must be exactly 12 digits.', 400);
    }

    // Validate PAN number format
    if (!panNumber || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
      return errorResponse(res, 'Invalid PAN number format. Expected: ABCDE1234F', 400);
    }

    // Check if KYC already submitted
    const user = await User.findById(userId);
    if (user.kycStatus === 'verified') {
      return errorResponse(res, 'Your KYC is already verified.', 400);
    }

    // Hash the Aadhaar number (never store plain text)
    const aadhaarHash = await bcrypt.hash(aadhaarNumber, 10);
    const aadhaarLastFour = aadhaarNumber.slice(-4);

    // Get selfie URL from Cloudinary upload (via multer middleware)
    let selfieUrl = null;
    if (req.file && req.file.path) {
      selfieUrl = req.file.path;
    }

    // Update user with KYC data
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        aadhaarHash,
        aadhaarLastFour,
        panNumber: panNumber.toUpperCase(),
        selfieUrl,
        kycStatus: 'pending',
      },
      { new: true, runValidators: true }
    );

    // Hackathon demo: Auto-verify KYC after delay (simulates AI verification)
    setTimeout(async () => {
      try {
        await User.findByIdAndUpdate(userId, { kycStatus: 'verified' });
        console.log(`✅ KYC auto-verified for user ${userId}`);
      } catch (err) {
        console.error(`❌ KYC auto-verify failed for user ${userId}:`, err.message);
      }
    }, KYC_AUTO_VERIFY_DELAY_MS);

    return successResponse(
      res,
      { user: updatedUser.toSafeObject() },
      'KYC submitted successfully! Verification in progress.',
      200
    );
  } catch (error) {
    console.error('Submit KYC error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get current user's profile
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }
    return successResponse(res, { user: user.toSafeObject() }, 'Profile fetched successfully.');
  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Update user wallet address (MetaMask)
 * @route   PUT /api/users/wallet
 * @access  Private
 */
const updateWalletAddress = async (req, res) => {
  try {
    const walletAddress = normalizeWalletAddress(req.body?.walletAddress);

    // Validate wallet address format (Stellar public keys only)
    if (!isValidWalletAddress(walletAddress)) {
      return errorResponse(
        res,
        'Invalid wallet address. Must be a valid Stellar (G...) address.',
        400
      );
    }

    const normalizedWallet = canonicalWalletAddress(walletAddress);

    // Check if another user already has this wallet
    const existing = await User.findOne({
      walletAddress: normalizedWallet,
      _id: { $ne: req.user._id },
    });
    if (existing) {
      return errorResponse(res, 'This wallet address is already linked to another account.', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { walletAddress: normalizedWallet },
      { new: true, runValidators: true }
    );

    return successResponse(
      res,
      { user: user.toSafeObject() },
      'Wallet address updated successfully.'
    );
  } catch (error) {
    console.error('Update wallet error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get current user's voting power (always 1 in new system)
 * @route   GET /api/users/me/voting-power
 * @access  Private
 * @note    INVX token system removed - voting power is now 1 per wallet
 */
const getVotingPower = async (req, res) => {
  try {
    const user = req.user;
    
    // In the new 1-wallet-1-vote system, everyone has equal voting power
    return successResponse(res, {
      votingPower: user.walletAddress ? 1 : 0,
      message: 'Voting power is now 1 per connected wallet (INVX token system removed).',
    }, 'Voting power fetched.');
  } catch (error) {
    console.error('Get voting power error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get current user's notifications
 * @route   GET /api/users/me/notifications
 * @access  Private
 */
const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await notificationService.getUserNotifications(req.user._id, page, limit);
    return successResponse(res, result, 'Notifications fetched.');
  } catch (error) {
    console.error('Get notifications error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/users/me/notifications/count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    return successResponse(res, { count }, 'Unread count fetched.');
  } catch (error) {
    console.error('Unread count error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/users/me/notifications/:id
 * @access  Private
 */
const markNotificationRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id);
    return successResponse(res, { notification }, 'Notification marked as read.');
  } catch (error) {
    console.error('Mark read error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/users/me/notifications/read-all
 * @access  Private
 */
const markAllNotificationsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    return successResponse(res, {}, 'All notifications marked as read.');
  } catch (error) {
    console.error('Mark all read error:', error);
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  submitKYC,
  getUserProfile,
  updateWalletAddress,
  getVotingPower,
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
