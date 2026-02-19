import axios from 'axios';
import type {
  SignupRequest,
  LoginRequest,
  PasswordResetRequestRequest,
  PasswordResetConfirmRequest,
} from '../types/auth';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add JWT to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  signup: (data: SignupRequest) => api.post('/api/auth/signup', data),
  login: (data: LoginRequest) => api.post('/api/auth/login', data),
  passwordResetRequest: (data: PasswordResetRequestRequest) =>
    api.post('/api/auth/password-reset-request', data),
  passwordResetConfirm: (data: PasswordResetConfirmRequest) =>
    api.post('/api/auth/password-reset-confirm', data),
};