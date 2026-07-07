import api from './api';

export const getPlatformStats = () => api.get('/api/admin/stats');
export const getPendingApplications = () => api.get('/api/admin/businesses/pending');
export const getAllBusinessesAdmin = () => api.get('/api/admin/businesses');
export const generateAIScore = (businessId) => api.post(`/api/admin/businesses/${businessId}/ai-score`, {}, { timeout: 120000 });
export const approveBusiness = (businessId) => api.post(`/api/admin/businesses/${businessId}/approve`, {}, { timeout: 120000 });
export const rejectBusiness = (businessId, reason) =>
  api.post(`/api/admin/businesses/${businessId}/reject`, { reason });
export const getPendingRevenueReports = () => api.get('/api/admin/dividend-records/pending');
export const verifyRevenue = (recordId, verifiedAmount) =>
  api.put(`/api/admin/dividend-records/${recordId}/verify`, { verifiedRevenueAmount: verifiedAmount });
export const distributeDividends = (recordId) =>
  api.post(`/api/admin/dividend-records/${recordId}/distribute`, {}, { timeout: 120000 });
export const getAllUsers = (params) => api.get('/api/admin/users', { params });
export const updateUserKYC = (userId, status) =>
  api.put(`/api/admin/users/${userId}/kyc`, { status });
