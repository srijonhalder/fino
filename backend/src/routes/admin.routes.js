const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  getPlatformStats,
  getPendingApplications,
  getAllBusinessesAdmin,
  generateAIScore,
  getPendingRevenueReports,
  getAllUsers,
  updateUserKYC,
} = require('../controllers/admin.controller');

// verifyRevenue and triggerDistribution no longer used — governance handles these

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/stats', getPlatformStats);

// Business management
router.get('/businesses/pending', getPendingApplications);
router.get('/businesses', getAllBusinessesAdmin);
router.post('/businesses/:id/ai-score', generateAIScore);

// DEPRECATED: Business approval/rejection now handled by community governance vote
// These routes return 410 Gone to inform clients of the decentralized transition
router.post('/businesses/:id/approve', (req, res) => {
  res.status(410).json({ success: false, message: 'Business approval is now handled by community governance vote. See /api/governance/proposals' });
});
router.post('/businesses/:id/reject', (req, res) => {
  res.status(410).json({ success: false, message: 'Business rejection is now handled by community governance vote. See /api/governance/proposals' });
});

// Dividend management
router.get('/dividend-records/pending', getPendingRevenueReports);
// DEPRECATED: Revenue verification/distribution now handled by governance vote + DividendDistributor contract
router.put('/dividend-records/:id/verify', (req, res) => {
  res.status(410).json({ success: false, message: 'Revenue verification is now handled by community governance vote.' });
});
router.post('/dividend-records/:id/distribute', (req, res) => {
  res.status(410).json({ success: false, message: 'Dividend distribution is now automated via DividendDistributor smart contract after governance vote.' });
});

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/kyc', updateUserKYC);

// Manual deadline check (useful for demo)
const { checkExpiredCampaigns } = require('../services/deadlineChecker.service');
router.post('/check-deadlines', async (req, res) => {
  const result = await checkExpiredCampaigns();
  res.json({ success: true, message: 'Deadline check complete', data: result });
});

module.exports = router;
