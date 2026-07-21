import { describe, it, expect, beforeEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

// Import the client LAST so axios-mock-adapter can wrap it correctly.
import {
  apiClient,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY_EXPORT,
} from './client';

const STALE_ACCESS = 'stale-access-token';
const NEW_ACCESS = 'fresh-access-token';
const OLD_REFRESH = 'old-refresh-token';
const NEW_REFRESH = 'fresh-refresh-token';

describe('client.ts — token helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exports ACCESS_TOKEN_KEY and REFRESH_TOKEN_KEY constants', () => {
    expect(ACCESS_TOKEN_KEY).toBe('token');
    expect(REFRESH_TOKEN_KEY_EXPORT).toBe('refresh_token');
  });

  it('setAuthTokens writes both tokens', () => {
    setAuthTokens('acc', 'ref');
    expect(getAccessToken()).toBe('acc');
    expect(getRefreshToken()).toBe('ref');
  });

  it('clearAuthTokens removes both tokens', () => {
    setAuthTokens('acc', 'ref');
    clearAuthTokens();
    expect(getAccessToken()).toBe('');
    expect(getRefreshToken()).toBe('');
  });

  it('setAuthTokens with empty string removes entries', () => {
    setAuthTokens('a', 'r');
    setAuthTokens('', '');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('setAuthTokens preserves existing refresh token when refreshToken arg undefined', () => {
    setAuthTokens('a', 'r');
    setAuthTokens('a2'); // no refreshToken arg
    expect(getRefreshToken()).toBe('r');
    expect(getAccessToken()).toBe('a2');
  });

  it('getAccessToken / getRefreshToken return empty string when missing', () => {
    expect(getAccessToken()).toBe('');
    expect(getRefreshToken()).toBe('');
  });
});

describe('client.ts — autosave via response interceptor', () => {
  // We don't intercept window.location by jsdom; mock the function used
  // internally instead. Simpler: spy on the cleanup path by checking
  // localStorage.
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    mock = new MockAdapter(apiClient);
  });

  it('request interceptor attaches Authorization header from stored access token', async () => {
    setAuthTokens('STORED-TOK');
    let capturedHeaders: Record<string, unknown> = {};
    mock.onGet('/api/v1/auth/profile').reply((config) => {
      capturedHeaders = config.headers as Record<string, unknown>;
      return [200, { ok: true }];
    });
    await apiClient.get('/api/v1/auth/profile');
    expect(capturedHeaders.Authorization).toBe('Bearer STORED-TOK');
  });

  it('intercepts 401, refreshes the token, and replays the original request', async () => {
    setAuthTokens(STALE_ACCESS, OLD_REFRESH);
    let observedAuthOnSecondHit: string | null = null;
    let firstHit = true;

    mock.onPost('/api/v1/auth/refresh').reply((config) => {
      // The refresh request itself should NOT carry a stale bearer header for
      // other clients — but our `apiClient.post` is the *bare* axios here, not
      // the client instance, so no header is sent.
      const body = JSON.parse(config.data);
      expect(body.refresh_token).toBe(OLD_REFRESH);
      return [
        200,
        {
          access_token: NEW_ACCESS,
          refresh_token: NEW_REFRESH,
          token_type: 'bearer',
        },
      ];
    });

    mock.onGet('/api/v1/journal').reply((config) => {
      const auth = config.headers?.Authorization;
      if (firstHit) {
        firstHit = false;
        // request 1 carries stale token — fail it
        return [401, { detail: 'token expired' }];
      }
      observedAuthOnSecondHit = auth as string;
      return [200, { data: [{ id: '1' }] }];
    });

    const res = await apiClient.get('/api/v1/journal');
    expect(res.status).toBe(200);
    expect(observedAuthOnSecondHit).toBe(`Bearer ${NEW_ACCESS}`);
    expect(getAccessToken()).toBe(NEW_ACCESS);
    expect(getRefreshToken()).toBe(NEW_REFRESH);
  });

  it('only retries once — _retried:true stops infinite loops', async () => {
    setAuthTokens('T', 'R');
    let hitCount = 0;
    mock.onPost('/api/v1/auth/refresh').reply(200, {
      access_token: 'second-access',
      refresh_token: 'second-refresh',
      token_type: 'bearer',
    });
    mock.onGet('/api/v1/anything').reply((config) => {
      hitCount += 1;
      const cfg = config as unknown as { _retried?: boolean; headers?: Record<string, unknown> };
      // Read the `_retried` flag the interceptor set — the second hit MUST
      // see it true, otherwise we'd loop forever.
      if (hitCount === 1) {
        expect(cfg._retried).toBeFalsy();
        return [401, { detail: 'still expired' }];
      }
      expect(cfg._retried).toBe(true);
      return [401, { detail: 'still expired after retry' }];
    });

    await expect(apiClient.get('/api/v1/anything')).rejects.toBeTruthy();
    // 1 original hit + 1 retry = 2; no further loops.
    expect(hitCount).toBe(2);
    // Tokens were still updated from the successful refresh even though
    // the subsequent retry failed.
    expect(getAccessToken()).toBe('second-access');
  });

  it('clears tokens and propagates error when refresh itself 401s', async () => {
    setAuthTokens(STALE_ACCESS, OLD_REFRESH);
    mock.onPost('/api/v1/auth/refresh').reply(401, { detail: 'invalid' });
    mock.onGet('/api/v1/journal').reply(401, { detail: 'expired' });
    await expect(apiClient.get('/api/v1/journal')).rejects.toBeTruthy();
    expect(getAccessToken()).toBe('');
    expect(getRefreshToken()).toBe('');
  });

  it('does NOT trigger refresh on auth endpoints with _skipAuthRefresh:true', async () => {
    setAuthTokens(STALE_ACCESS, OLD_REFRESH);
    // Track if refresh endpoint was ever hit
    let refreshHitCount = 0;
    mock.onPost('/api/v1/auth/refresh').reply(() => {
      refreshHitCount += 1;
      return [200, { access_token: 'X', refresh_token: 'Y', token_type: 'bearer' }];
    });
    let loginHit = 0;
    mock.onPost('/api/v1/auth/login').reply(() => {
      loginHit += 1;
      return [401, { detail: 'bad creds' }];
    });
    await expect(apiClient.post(
      '/api/v1/auth/login',
      new URLSearchParams({}),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, _skipAuthRefresh: true as unknown as boolean },
    )).rejects.toBeTruthy();
    expect(loginHit).toBe(1);
    expect(refreshHitCount).toBe(0);
  });

  it('shares one refresh call when concurrent 401s collide', async () => {
    setAuthTokens('A', 'R');
    let refreshHits = 0;

    mock.onPost('/api/v1/auth/refresh').reply(() => {
      refreshHits += 1;
      return [200, { access_token: 'NEW', refresh_token: 'NEW-R', token_type: 'bearer' }];
    });
    let protectedFirst = true;
    mock.onGet('/api/v1/auth/profile').reply(() => {
      if (protectedFirst) {
        protectedFirst = false;
        return [401, { detail: 'expired' }];
      }
      return [200, { ok: true }];
    });

    // Two concurrent requests to the SAME protected endpoint simulate the
    // race — the interceptor should issue exactly one refresh and replay both.
    const [res1, res2] = await Promise.all([
      apiClient.get('/api/v1/auth/profile'),
      apiClient.get('/api/v1/auth/profile'),
    ]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(refreshHits).toBe(1);
  });

  it('skips refresh when no refresh token is available', async () => {
    setAuthTokens('A'); // no refresh token
    let profileHits = 0;
    mock.onGet('/api/v1/auth/profile').reply(() => {
      profileHits += 1;
      return [401, { detail: 'expired' }];
    });
    let refreshHits = 0;
    mock.onPost('/api/v1/auth/refresh').reply(() => {
      refreshHits += 1;
      return [401, { detail: 'no' }];
    });
    await expect(apiClient.get('/api/v1/auth/profile')).rejects.toBeTruthy();
    expect(refreshHits).toBe(0);   // never even tried — no refresh token
    // The interceptor bails out before retry, so the protected endpoint is hit
    // once — caller receives the 401 directly.
    expect(profileHits).toBe(1);
    // Tokens cleared via the catch path because refresh rejection propagates
    // through the .catch block in the interceptor.
    expect(getAccessToken()).toBe('');
  });
});
