import axios from 'axios';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const configuredApiUrl = (process.env.REACT_APP_API_URL || '').trim();

const inferDevelopmentApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  const host = window.location.hostname || 'localhost';
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  return `${protocol}//${host}:5000`;
};

const API_BASE = trimTrailingSlash(
  configuredApiUrl ||
    (process.env.NODE_ENV === 'development'
      ? inferDevelopmentApiUrl()
      : ''),
);

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor — attach JWT & log for debugging
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fino_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${API_BASE}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and extract errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log full error for debugging
    console.error('[API Error]', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code,
    });

    if (error.response?.status === 401) {
      // Only redirect to login if the user had a token (was logged in)
      // This prevents public pages from redirecting when calling admin-only endpoints
      const hadToken = localStorage.getItem('fino_token');
      localStorage.removeItem('fino_token');
      localStorage.removeItem('fino_user');
      if (hadToken && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (!error.response && (error.code === 'ERR_NETWORK' || error.message === 'Network Error')) {
      const target = API_BASE || '/api';
      return Promise.reject(new Error(`Unable to reach backend (${target}). Check API URL and backend availability.`));
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0] ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
