const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { uploadSelfie } = require('../middleware/upload.middleware');
const {
  submitKYC,
  getUserProfile,
  updateWalletAddress,
  getVotingPower,
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/user.controller');

// All routes require authentication
router.use(protect);

// GET /api/users/me/voting-power — Get voting power (1 per wallet)
router.get('/me/voting-power', getVotingPower);

// GET /api/users/profile — Get logged-in user's profile
router.get('/profile', getUserProfile);

// POST /api/users/kyc — Submit KYC documents (selfie + Aadhaar + PAN)
router.post('/kyc', uploadSelfie, submitKYC);

// PUT /api/users/wallet — Update wallet address (MetaMask)
router.put('/wallet', updateWalletAddress);

// Notification routes
// GET /api/users/me/notifications — Get user's notifications
router.get('/me/notifications', getMyNotifications);

// GET /api/users/me/notifications/count — Get unread count
router.get('/me/notifications/count', getUnreadCount);

// PUT /api/users/me/notifications/read-all — Mark all as read
router.put('/me/notifications/read-all', markAllNotificationsRead);

// PUT /api/users/me/notifications/:id — Mark one as read
router.put('/me/notifications/:id', markNotificationRead);

module.exports = router;
