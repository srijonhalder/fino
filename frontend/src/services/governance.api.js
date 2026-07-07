import api from './api';

// ── Proposals ──
export const getProposals = (params = {}) => api.get('/api/governance/proposals', { params });
export const getActiveProposals = () => api.get('/api/governance/proposals/active');
export const getProposalById = (id) => api.get(`/api/governance/proposals/${id}`);
export const finalizeProposal = (id) => api.post(`/api/governance/proposals/${id}/finalize`);
export const getProposalResult = (id) => api.get(`/api/governance/proposals/${id}/result`);

// ── Voting (Client-Side Signing) ──
export const prepareVoteTransaction = (proposalId, data) =>
  api.post(`/api/governance/proposals/${proposalId}/vote/prepare`, data, { timeout: 30000 });
export const submitSignedVote = (proposalId, data) =>
  api.post(`/api/governance/proposals/${proposalId}/vote`, data, { timeout: 120000 });
export const getMyVotes = () => api.get('/api/governance/my-votes');

// ── Attestations & Verification ──
export const getAttestations = (businessId) =>
  api.get(`/api/governance/business/${businessId}/attestations`);

// ── Analytics ──
export const getLeaderboard = () => api.get('/api/governance/leaderboard');
export const getGovernanceStats = () => api.get('/api/governance/stats');

// ── Notifications ──
export const getNotifications = (params = {}) => api.get('/api/users/me/notifications', { params });
export const markNotificationRead = (id) => api.put(`/api/users/me/notifications/${id}`);
export const markAllNotificationsRead = () => api.put('/api/users/me/notifications/read-all');
export const getUnreadNotificationCount = () => api.get('/api/users/me/notifications/count');
