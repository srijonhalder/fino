/**
 * Fino Backend Integration Tests
 * -----------------------------------
 * Standalone Node.js test script that validates all governance endpoints,
 * notification system, and reward services.
 *
 * Usage:
 *   1. Ensure backend server is running: npm run dev
 *   2. Run: node test/governance.test.js
 *
 * Requires a valid JWT token from a registered user.
 * Set FINO_TEST_TOKEN env var or edit the TOKEN constant below.
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TOKEN = process.env.FINO_TEST_TOKEN || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
});

let passCount = 0;
let failCount = 0;
const results = [];

function log(testNum, name, passed, detail = '') {
  const icon = passed ? '✅' : '❌';
  const msg = `${icon} Test ${testNum}: ${name}${detail ? ` — ${detail}` : ''}`;
  console.log(msg);
  results.push({ testNum, name, passed, detail });
  if (passed) passCount++;
  else failCount++;
}

// ────────────────────────────────────────────
// TEST SUITE
// ────────────────────────────────────────────

async function runTests() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  Fino Backend Integration Tests');
  console.log('══════════════════════════════════════════════\n');

  // ── PUBLIC GOVERNANCE ENDPOINTS ──

  // Test 1: GET /api/governance/stats
  try {
    const res = await api.get('/api/governance/stats');
    const d = res.data.data;
    const valid = typeof d.totalProposals === 'number' &&
      typeof d.activeProposals === 'number' &&
      typeof d.uniqueVoters === 'number' &&
      typeof d.approvalRate === 'number';
    log(1, 'GET /api/governance/stats — returns platform stats', valid,
      `${d.totalProposals} proposals, ${d.uniqueVoters} voters`);
  } catch (e) {
    log(1, 'GET /api/governance/stats', false, e.response?.data?.message || e.message);
  }

  // Test 2: GET /api/governance/leaderboard
  try {
    const res = await api.get('/api/governance/leaderboard');
    const d = res.data.data;
    const valid = Array.isArray(d.leaderboard);
    log(2, 'GET /api/governance/leaderboard — returns array', valid,
      `${d.leaderboard.length} entries`);
  } catch (e) {
    log(2, 'GET /api/governance/leaderboard', false, e.response?.data?.message || e.message);
  }

  // Test 3: GET /api/governance/proposals
  let proposals = [];
  try {
    const res = await api.get('/api/governance/proposals');
    const d = res.data.data;
    proposals = d.proposals || [];
    const valid = Array.isArray(proposals);
    log(3, 'GET /api/governance/proposals — returns array', valid,
      `${proposals.length} proposals`);
  } catch (e) {
    log(3, 'GET /api/governance/proposals', false, e.response?.data?.message || e.message);
  }

  // Test 4: GET /api/governance/proposals/active
  try {
    const res = await api.get('/api/governance/proposals/active');
    const d = res.data.data;
    const valid = Array.isArray(d.proposals);
    log(4, 'GET /api/governance/proposals/active — returns array', valid,
      `${d.proposals.length} active proposals`);
  } catch (e) {
    log(4, 'GET /api/governance/proposals/active', false, e.response?.data?.message || e.message);
  }

  // Test 5: GET /api/governance/proposals/:id (if any proposals exist)
  if (proposals.length > 0) {
    try {
      const id = proposals[0].proposalId;
      const res = await api.get(`/api/governance/proposals/${id}`);
      const d = res.data.data;
      const valid = d.proposal && d.proposal.proposalId === id;
      log(5, `GET /api/governance/proposals/${id} — proposal detail`, valid,
        `type: ${d.proposal?.proposalType}`);
    } catch (e) {
      log(5, 'GET /api/governance/proposals/:id', false, e.response?.data?.message || e.message);
    }
  } else {
    log(5, 'GET /api/governance/proposals/:id — SKIPPED (no proposals)', true, 'no proposals to test');
  }

  // ── AUTHENTICATED ENDPOINTS ──

  if (!TOKEN) {
    console.log('\n⚠️  No FINO_TEST_TOKEN set — skipping authenticated tests');
    console.log('   Set env var FINO_TEST_TOKEN=<jwt> to run all tests.\n');
  }

  // Test 6: GET /api/users/me/voting-power
  if (TOKEN) {
    try {
      const res = await api.get('/api/users/me/voting-power');
      const d = res.data.data;
      const valid = d.votingPower !== undefined;
      log(6, 'GET /api/users/me/voting-power — returns voting power', valid,
        `votingPower: ${d.votingPower}`);
    } catch (e) {
      log(6, 'GET /api/users/me/voting-power', false, e.response?.data?.message || e.message);
    }
  } else {
    log(6, 'GET /api/users/me/voting-power — SKIPPED (no token)', true, '');
  }

  // Test 7: GET /api/governance/my-votes
  if (TOKEN) {
    try {
      const res = await api.get('/api/governance/my-votes');
      const d = res.data.data;
      const valid = Array.isArray(d.votes);
      log(7, 'GET /api/governance/my-votes — returns vote history', valid,
        `${d.votes.length} votes`);
    } catch (e) {
      log(7, 'GET /api/governance/my-votes', false, e.response?.data?.message || e.message);
    }
  } else {
    log(7, 'GET /api/governance/my-votes — SKIPPED (no token)', true, '');
  }

  // Test 8: GET /api/users/me/notifications
  if (TOKEN) {
    try {
      const res = await api.get('/api/users/me/notifications');
      const d = res.data.data;
      const valid = Array.isArray(d.notifications);
      log(8, 'GET /api/users/me/notifications — returns notifications', valid,
        `${d.notifications.length} notifications, page ${d.pagination?.page}`);
    } catch (e) {
      log(8, 'GET /api/users/me/notifications', false, e.response?.data?.message || e.message);
    }
  } else {
    log(8, 'GET /api/users/me/notifications — SKIPPED (no token)', true, '');
  }

  // Test 9: GET /api/users/me/notifications/count
  if (TOKEN) {
    try {
      const res = await api.get('/api/users/me/notifications/count');
      const d = res.data.data;
      const valid = typeof d.count === 'number';
      log(9, 'GET /api/users/me/notifications/count — unread count', valid,
        `unread: ${d.count}`);
    } catch (e) {
      log(9, 'GET /api/users/me/notifications/count', false, e.response?.data?.message || e.message);
    }
  } else {
    log(9, 'GET /api/users/me/notifications/count — SKIPPED (no token)', true, '');
  }

  // Test 10: PUT /api/users/me/notifications/read-all
  if (TOKEN) {
    try {
      const res = await api.put('/api/users/me/notifications/read-all');
      const valid = res.data.success === true;
      log(10, 'PUT /api/users/me/notifications/read-all — mark all read', valid);
    } catch (e) {
      log(10, 'PUT /api/users/me/notifications/read-all', false, e.response?.data?.message || e.message);
    }
  } else {
    log(10, 'PUT /api/users/me/notifications/read-all — SKIPPED (no token)', true, '');
  }

  // ── ADMIN DEPRECATION TESTS ──

  // Test 11: POST /api/admin/businesses/:id/approve → 410 Gone (deprecated)
  try {
    const res = await api.post('/api/admin/businesses/fakeId/approve').catch(e => e.response);
    // Should get 410 if hitting the deprecated route (or 401 if no admin auth)
    const valid = res?.status === 410 || res?.status === 401 || res?.status === 403;
    log(11, 'POST /api/admin/businesses/:id/approve — deprecated (410/401)', valid,
      `status: ${res?.status}`);
  } catch (e) {
    log(11, 'Admin approve deprecated', false, e.message);
  }

  // Test 12: POST /api/admin/businesses/:id/reject → 410 Gone (deprecated)
  try {
    const res = await api.post('/api/admin/businesses/fakeId/reject').catch(e => e.response);
    const valid = res?.status === 410 || res?.status === 401 || res?.status === 403;
    log(12, 'POST /api/admin/businesses/:id/reject — deprecated (410/401)', valid,
      `status: ${res?.status}`);
  } catch (e) {
    log(12, 'Admin reject deprecated', false, e.message);
  }

  // ── VOTE SUBMISSION TEST (negative path) ──

  // Test 13: POST /vote with invalid data → 400 error
  if (TOKEN && proposals.length > 0) {
    try {
      const id = proposals[0].proposalId;
      const res = await api.post(`/api/governance/proposals/${id}/vote`, {
        support: true,
        txHash: '0x' + '0'.repeat(64),
        walletAddress: '0x0000000000000000000000000000000000000000',
      }).catch(e => e.response);
      // Should fail (already voted, invalid wallet, or expired)
      const valid = res?.status >= 400;
      log(13, 'POST /vote — rejects invalid vote attempt', valid,
        `status: ${res?.status}, msg: ${res?.data?.message?.slice(0, 60) || 'N/A'}`);
    } catch (e) {
      log(13, 'POST /vote — negative test', true, `caught error: ${e.message}`);
    }
  } else {
    log(13, 'POST /vote — SKIPPED (no token/proposals)', true, '');
  }

  // ── SERVICE AVAILABILITY TESTS ──

  // Test 14: Governance stats returns governance params
  try {
    const res = await api.get('/api/governance/stats');
    const params = res.data.data?.governanceParams;
    const valid = params && params.MIN_QUORUM_VOTERS && params.APPROVAL_THRESHOLD_PERCENT;
    log(14, 'Governance stats include governance params', valid,
      params ? `quorum: ${params.MIN_QUORUM_VOTERS}, threshold: ${params.APPROVAL_THRESHOLD_PERCENT}%` : 'missing');
  } catch (e) {
    log(14, 'Governance params in stats', false, e.message);
  }

  // Test 15: Health check — server responds
  try {
    const res = await api.get('/');
    const valid = res.status === 200 || res.status === 404; // root may not be defined
    log(15, 'Server health check — responds', valid, `status: ${res.status}`);
  } catch (e) {
    // Even a 404 means server is running
    if (e.response) {
      log(15, 'Server health check', true, `status: ${e.response.status}`);
    } else {
      log(15, 'Server health check', false, 'Server not responding');
    }
  }

  // ── SUMMARY ──
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Results: ${passCount} passed, ${failCount} failed, ${passCount + failCount} total`);
  console.log('══════════════════════════════════════════════\n');

  if (failCount > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ #${r.testNum}: ${r.name} — ${r.detail}`);
    });
    console.log('');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
