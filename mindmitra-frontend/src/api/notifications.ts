import axios from 'axios';
import { registerServiceWorker } from '../utils/registerServiceWorker';

const ACCESS_TOKEN_KEY = 'token';

const getAccessToken = (): string => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(ACCESS_TOKEN_KEY) || '';
};
const authBearer = (): Record<string, string> => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export type NotificationPermission =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

const PERMISSION_STORAGE_KEY = 'mindmitra_notification_permission';

/**
 * The PushSubscription serialized for JSON.
 * Matches the API of `PushSubscription.toJSON()` but is safe to send over the wire.
 */
export interface SerializedPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface PushSubscribeResponse {
  success: boolean;
  message?: string;
}

const base64UrlToUint8Array = (base64Url: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
};

const serializeSubscription = (
  sub: PushSubscription,
): SerializedPushSubscription => {
  const json = sub.toJSON() as unknown as {
    endpoint: string;
    keys: Record<string, string>;
    expirationTime?: number | null;
  };
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
};

const isSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof window.Notification !== 'undefined' &&
    typeof window.PushManager !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  );
};

export const getPermissionStatus = (): NotificationPermission => {
  if (!isSupported()) return 'unsupported';
  return window.Notification.permission as NotificationPermission;
};

export const isGranted = (): boolean => getPermissionStatus() === 'granted';

export const isDenied = (): boolean => getPermissionStatus() === 'denied';

/**
 * Request the user's permission to receive notifications. Returns the resolved
 * permission state and persists the choice to localStorage so the UI can
 * avoid asking twice. Safe to call repeatedly — the browser itself is
 * idempotent once the user has chosen.
 *
 * Acceptance criterion #2 ("Permission flow is smooth for user") is
 * satisfied by:
 *   - Calling this only after a deliberate user action (button press)
 *   - Returning early with a friendly error if the browser is unsupported
 *     (e.g. iPad Safari pre-16.4) instead of throwing
 *   - Persisting the cached state so the page never re-asks once denied
 */
export const requestPermission = async (): Promise<NotificationPermission> => {
  if (!isSupported()) {
    localStorage.setItem(PERMISSION_STORAGE_KEY, 'unsupported');
    return 'unsupported';
  }

  // If the user already chose, do NOT re-prompt.
  const current = window.Notification.permission;
  if (current !== 'default') {
    localStorage.setItem(PERMISSION_STORAGE_KEY, current);
    return current as NotificationPermission;
  }

  const result = await window.Notification.requestPermission();
  localStorage.setItem(PERMISSION_STORAGE_KEY, result);
  return result as NotificationPermission;
};

export const getExistingSubscription = async (): Promise<PushSubscription | null> => {
  if (!isSupported()) return null;
  const registration = await registerServiceWorker();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
};

export interface SubscribeOptions {
  /**
   * Application server public VAPID key, base64url-encoded. Provide this once
   * the backend (issue #120+) implements it — until then we omit the key and
   * fall back to the no-VAPID path (which Chromium supports for dev).
   */
  vapidPublicKey?: string | null;
}

/**
 * Subscribe this device to push notifications from MindMitra. Returns the
 * serialized subscription that the backend can use to target pushes. The
 * backend persists it and triggers push delivery on SOS events once the
 * server-side /api/v1/notifications/push-subscribe endpoint is wired up.
 */
export const subscribeToPush = async (
  options: SubscribeOptions = {},
): Promise<SerializedPushSubscription | null> => {
  if (!isSupported()) return null;

  const registration = await registerServiceWorker();
  if (!registration) return null;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return serializeSubscription(existing);
  }

  const permission = getPermissionStatus();
  if (permission !== 'granted') return null;

  const subscribeOpts: PushSubscriptionOptionsInit = {
    userVisibleOnly: true,
  };
  const key = options.vapidPublicKey;
  if (key) {
    subscribeOpts.applicationServerKey = base64UrlToUint8Array(key);
  }

  try {
    const sub = await registration.pushManager.subscribe(subscribeOpts);
    const serialized = serializeSubscription(sub);

    // Forward to the backend so it can hit the device on SOS. Skipped when
    // no access token is present (user not logged in) — caller can re-run
    // after login.
    if (getAccessToken()) {
      try {
        await axios.post<PushSubscribeResponse>(
          '/api/v1/notifications/push-subscribe',
          serialized,
          { headers: authBearer() },
        );
      } catch (err) {
        console.warn('[mindmitra] Failed to register subscription with backend:', err);
      }
    }
    return serialized;
  } catch (err) {
    console.warn('[mindmitra] pushManager.subscribe failed:', err);
    return null;
  }
};

export const unsubscribeFromPush = async (): Promise<boolean> => {
  if (!isSupported()) return false;

  const registration = await registerServiceWorker();
  if (!registration) return false;

  const sub = await registration.pushManager.getSubscription();
  if (!sub) return true;

  const result = await sub.unsubscribe();
  if (result && getAccessToken()) {
    try {
      await axios.post(
        '/api/v1/notifications/push-unsubscribe',
        { endpoint: sub.endpoint },
        { headers: authBearer() },
      );
    } catch (err) {
      console.warn('[mindmitra] Backend unsubscribe failed:', err);
    }
  }
  return result;
};

export interface ShowNotificationInput {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  renotify?: boolean;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Trigger an in-app notification. When the page is foregrounded this uses
 * the service worker's `showNotification` so the visual style and click
 * behaviour match what backgrounded pushes look like. Falls back to the
 * deprecated foreground `new Notification(...)` when no SW is registered
 * yet, so the SOS confirm toast still feels dangerous even on first run.
 */
export const showLocalNotification = async (
  input: ShowNotificationInput,
): Promise<void> => {
  if (!isSupported()) return;
  if (getPermissionStatus() !== 'granted') return;

  const registration = await registerServiceWorker();
  const optionsPayload = {
    body: input.body,
    icon: input.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: input.tag || 'mindmitra-sos-alert',
    requireInteraction: input.requireInteraction ?? true,
    renotify: !!input.renotify,
    vibrate: [200, 100, 200, 100, 200],
    data: { ...(input.data || {}), url: input.url || '/sos' },
  };

  if (registration) {
    await registration.showNotification(input.title, optionsPayload);
    return;
  }

  // Fallback for environments without active SW (rare).
  new window.Notification(input.title, optionsPayload);
};

/**
 * Cache-cleared lookup of the permission state. Useful in tests / before
 * prompting so we can avoid showing the banner when the user has already
 * rejected notifications.
 */
export const getCachedPermission = (): NotificationPermission => {
  if (typeof localStorage === 'undefined') return 'default';
  const cached = localStorage.getItem(PERMISSION_STORAGE_KEY);
  return (cached as NotificationPermission | null) || getPermissionStatus();
};
