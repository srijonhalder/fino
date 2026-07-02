const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/admin.middleware');
const {
  getProposals,
  getActiveProposals,
  getProposalById,
  prepareVoteTransaction,
  submitVote,
  triggerFinalize,
  getProposalResult,
  getMyVotes,
  getAttestations,
  getLeaderboard,
  getGovernanceStats,
  triggerVerification,
} = require('../controllers/governance.controller');

// ─── Public Routes ──────────────────────────────────────────
router.get('/stats', getGovernanceStats);
router.get('/leaderboard', getLeaderboard);
router.get('/proposals', getProposals);
router.get('/proposals/active', getActiveProposals);
router.get('/proposals/:id', getProposalById);
router.get('/proposals/:id/result', getProposalResult);
router.get('/business/:id/attestations', getAttestations);

// ─── Authenticated Routes ───────────────────────────────────
router.post('/proposals/:id/vote/prepare', protect, prepareVoteTransaction);
router.post('/proposals/:id/vote', protect, submitVote);
router.post('/proposals/:id/finalize', protect, triggerFinalize);
router.get('/my-votes', protect, getMyVotes);

// ─── Admin Routes ───────────────────────────────────────────
router.post('/verify/:businessId', protect, adminOnly, triggerVerification);

module.exports = router;
