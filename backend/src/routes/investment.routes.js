const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  initiateInvestment,
  confirmInvestment,
  getMyInvestments,
  getBusinessInvestors,
  getOnChainPortfolio,
} = require('../controllers/investment.controller');

// All routes require authentication
router.use(protect);

// Investor routes
router.post('/initiate', initiateInvestment);
router.post('/confirm', confirmInvestment);
router.get('/my-investments', getMyInvestments);
router.get('/on-chain-portfolio', getOnChainPortfolio);

// Admin route
router.get('/business/:businessId', adminOnly, getBusinessInvestors);

module.exports = router;
