import apiClient from './client';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  email?: string;
  relationship: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  emergency_contacts: EmergencyContact[];
  profile_picture_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdatePayload {
  name?: string;
  emergency_contacts?: EmergencyContact[];
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface MessageResponse {
  message: string;
}

export interface TokenValidationResponse {
  valid: boolean;
}

/**
 * Authenticate against the existing FastAPI backend.
 * Uses OAuth2PasswordRequestForm (application/x-www-form-urlencoded).
 * The backend field is named `username` per the OAuth2 spec — we pass the email there.
 *
 * Tags the request with `_skipAuthRefresh` so a bad login (401) doesn't trigger
 * the refresh interceptor — there's no session to refresh yet.
 */
export const loginUser = (email: string, password: string) =>
  apiClient.post<LoginResponse>(
    '/api/v1/auth/login',
    new URLSearchParams({ username: email, password }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      _skipAuthRefresh: true,
    },
  );

export const registerUser = (data: {
  email: string;
  name: string;
  password: string;
  role?: string;
}) => apiClient.post<UserProfile>('/api/v1/auth/register', { ...data, role: data.role ?? 'user' }, { _skipAuthRefresh: true });

export const getProfile = (token: string) =>
  apiClient.get<UserProfile>('/api/v1/auth/profile', { headers: authHeader(token) });

export const updateProfile = (payload: ProfileUpdatePayload, token: string) =>
  apiClient.put<UserProfile>('/api/v1/auth/profile', payload, { headers: authHeader(token) });

export const uploadProfilePicture = (file: File, token: string) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<UserProfile>('/api/v1/auth/profile/picture', formData, {
    headers: {
      ...authHeader(token),
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const requestPasswordReset = (email: string) =>
  apiClient.post<MessageResponse>('/api/v1/auth/forgot-password', { email }, { _skipAuthRefresh: true });

export const validateResetToken = (token: string) =>
  apiClient.get<TokenValidationResponse>('/api/v1/auth/reset-password/validate', {
    params: { token },
    _skipAuthRefresh: true,
  });

export const resetPassword = (token: string, new_password: string) =>
  apiClient.post<MessageResponse>('/api/v1/auth/reset-password', {
    token,
    new_password,
  }, { _skipAuthRefresh: true });
