import api from './api';

export const getAllBusinesses = (params) => api.get('/api/businesses', { params });
export const getBusinessById = (id) => api.get(`/api/businesses/${id}`);
export const getMyBusinesses = () => api.get('/api/businesses/my-businesses');
export const submitBusinessApplication = (formData) =>
  api.post('/api/businesses/apply', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const submitRevenueReport = (businessId, formData) =>
  api.post(`/api/businesses/${businessId}/revenue-report`, formData);
export const getPublicConfig = () => api.get('/api/config/public');
export const getSuccessStories = () => api.get('/api/businesses/success-stories');
