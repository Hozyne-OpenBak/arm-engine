// User object
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

// Signup
export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
}

export interface SignupResponse {
  message: string;
}

// Login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

// Password reset request
export interface PasswordResetRequestRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  message: string;
}

// Password reset confirm
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface PasswordResetConfirmResponse {
  message: string;
}

// Auth context
export interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Validation errors
export interface ValidationErrors {
  [field: string]: string;
}