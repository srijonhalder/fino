import api from './api';

export const registerUser = (formData) => api.post('/api/auth/register', formData);
export const loginUser = (email, password) => api.post('/api/auth/login', { email, password });
export const walletConnectApi = (walletAddress) => api.post('/api/auth/wallet-connect', { walletAddress });
export const walletSignupApi = (walletAddress, name, email) => api.post('/api/auth/wallet-signup', { walletAddress, name, email });
export const getCurrentUser = () => api.get('/api/auth/me');
export const submitKYC = (formData) => api.post('/api/users/kyc', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateWalletAddress = (walletAddress) => api.put('/api/users/wallet', { walletAddress });
export const getUserProfile = () => api.get('/api/users/profile');
