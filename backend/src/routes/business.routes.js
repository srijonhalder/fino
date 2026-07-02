const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const { restrictTo } = require('../middleware/admin.middleware');
const { uploadBusinessFiles } = require('../middleware/upload.middleware');
const {
  submitApplication,
  getAllBusinesses,
  getSingleBusiness,
  getMyBusinesses,
  submitRevenueReport,
  getSuccessStories,
} = require('../controllers/business.controller');

// Public routes
router.get('/', getAllBusinesses);
router.get('/success-stories', getSuccessStories);

// Protected routes — must be BEFORE /:id to avoid route conflicts
router.get('/my-businesses', protect, restrictTo('business_owner'), getMyBusinesses);

// Public single business
router.get('/:id', getSingleBusiness);

// Business owner routes
router.post(
  '/apply',
  protect,
  restrictTo('business_owner'),
  uploadBusinessFiles,
  submitApplication
);

router.post(
  '/:id/revenue-report',
  protect,
  restrictTo('business_owner'),
  submitRevenueReport
);

module.exports = router;
