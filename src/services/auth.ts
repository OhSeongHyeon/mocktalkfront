import { post, postJson } from '../lib/api';

export interface LoginRequest {
  loginId: string;
  password: string;
  rememberMe?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresInSec: number;
}

export interface RegisterRequest {
  loginId: string;
  email: string;
  password: string;
  confirmPassword: string;
  userName?: string;
  displayName?: string;
  handle?: string;
}

const login = (payload: LoginRequest) => postJson<TokenResponse>('/auth/login', payload);
const register = (payload: RegisterRequest) => postJson<void>('/auth/join', payload);
const refreshAccessToken = () => post<TokenResponse>('/auth/refresh');
const logout = () => post<void>('/auth/logout');

export { login, logout, refreshAccessToken, register };
