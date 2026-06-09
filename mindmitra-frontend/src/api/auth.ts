import axios from 'axios';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
}

/**
 * Authenticate against the existing FastAPI backend.
 * Uses OAuth2PasswordRequestForm (application/x-www-form-urlencoded).
 * The backend field is named `username` per the OAuth2 spec — we pass the email there.
 */
export const loginUser = (email: string, password: string) =>
  axios.post<LoginResponse>(
    '/api/v1/auth/login',
    new URLSearchParams({ username: email, password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
