import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

/**
 * Shared axios instance with JWT auto-refresh and global error feedback.
 *
 * Issue #118: previously every api file called `axios` directly, which meant a
 * single 401 from a stale access token forced a manual logout. This module
 * installs a response interceptor that:
 *   1. Detects 401 responses on any request EXCEPT the refresh endpoint itself.
 *   2. Calls `POST /api/v1/auth/refresh` with the stored refresh_token.
 *   3. On success — persists the new pair, replays the original request once
 *      with the new access token, surfaces the result to the caller.
 *   4. On refresh failure (or no refresh token at all) — clears credentials
 *      and redirects to `/login` so `react-router` can render the auth screen.
 *
 * The request interceptor injects the `Authorization` header from
 * `localStorage` so callers no longer need to thread `token` through every
 * helper. Existing api files (`auth.ts`, `journal.ts`, `emotion.ts`,
 * `chat.ts`, `admin.ts`) continue to accept a `token` parameter for backwards
 * compatibility — the interceptor will overwrite the header if the caller
 * also passes one, which is safe (latest token wins).
 */

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REFRESH_URL = '/api/v1/auth/refresh';
const LOGIN_PATH = '/login';

export const ACCESS_TOKEN_KEY = TOKEN_KEY;
export const REFRESH_TOKEN_KEY_EXPORT = REFRESH_TOKEN_KEY;

export const getAccessToken = (): string => localStorage.getItem(TOKEN_KEY) || '';
export const getRefreshToken = (): string =>
  localStorage.getItem(REFRESH_TOKEN_KEY) || '';

export const setAuthTokens = (accessToken: string, refreshToken?: string): void => {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  else localStorage.removeItem(TOKEN_KEY);
  if (refreshToken !== undefined) {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/** Allow tests / apps without a `window` global to stub the redirect. */
const redirectToLogin = (): void => {
  if (typeof window !== 'undefined' && window.location) {
    // Preserve the path the user was trying to reach so login can bounce back.
    const next = window.location.pathname + window.location.search;
    if (window.location.pathname !== LOGIN_PATH) {
      window.location.href = `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
    }
  }
};

export const apiClient = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
});

// Mark used by the type below.
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retried?: boolean;
    _skipAuthRefresh?: boolean;
    _skipErrorToast?: boolean;
  }
}

// ---- request interceptor: attach bearer token -----------------------

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---- response interceptor: 401 → refresh → retry --------------------

let inflightRefresh: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (inflightRefresh) return inflightRefresh;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token'));
  }

  inflightRefresh = apiClient
    .post<{ access_token: string; refresh_token: string; token_type: string }>(
      REFRESH_URL,
      { refresh_token: refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        _skipAuthRefresh: true,
      },
    )
    .then((res) => {
      const { access_token, refresh_token } = res.data;
      setAuthTokens(access_token, refresh_token);
      return access_token;
    })
    .finally(() => {
      inflightRefresh = null;
    });
  return inflightRefresh;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !original._skipAuthRefresh &&
      // Don't try to refresh when the *refresh* endpoint itself 401'd.
      !(original.url || '').includes(REFRESH_URL)
    ) {
      try {
        const newToken = await refreshAccessToken();
        original._retried = true;
        original.headers = {
          ...(original.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient(original);
      } catch (refreshErr) {
        clearAuthTokens();
        redirectToLogin();
        return Promise.reject(refreshErr);
      }
    }

    // If the refresh endpoint itself 401'd, force re-login.
    if (status === 401 && original && (original.url || '').includes(REFRESH_URL)) {
      clearAuthTokens();
      redirectToLogin();
    }

    // Trigger error toast for unhandled 5xx server errors or network disconnects
    if (original && !original._skipErrorToast) {
      if (!error.response) {
        toast.error('Network error. Please check your connection.');
      } else if (status && status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
