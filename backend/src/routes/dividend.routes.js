const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  getDividendHistory,
  retryFailedPayouts,
  getMyDividendEarnings,
} = require('../controllers/dividend.controller');

// All routes require authentication
router.use(protect);

// Investor routes
router.get('/my-earnings', getMyDividendEarnings);

// Business dividend history (accessible by business owner and admin)
router.get('/business/:businessId', getDividendHistory);

// DEPRECATED: Revenue verification/distribution now handled by governance vote +
// DividendDistributor contract (see proposalFinalizer.service.js). Keeping these
// live alongside the governance path let the same DividendRecord be advanced
// through both flows independently, risking a double payout from the admin wallet.
router.put('/:id/verify', adminOnly, (req, res) => {
  res.status(410).json({ success: false, message: 'Revenue verification is now handled by community governance vote.' });
});
router.post('/:id/distribute', adminOnly, (req, res) => {
  res.status(410).json({ success: false, message: 'Dividend distribution is now automated via DividendDistributor smart contract after governance vote.' });
});
router.post('/:id/retry', adminOnly, retryFailedPayouts);

module.exports = router;
