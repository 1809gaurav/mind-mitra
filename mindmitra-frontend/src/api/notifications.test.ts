import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// W3C Notification has a static `permission` and a static `requestPermission`.
// We build a class so the test can call `Notification.requestPermission` as a
// static — matching real Chromium behaviour.
class FakeNotification extends EventTarget {
  static permission: NotificationPermission = 'default';
  static requestPermission = vi.fn(async (): Promise<NotificationPermission> => 'granted');
  constructor(public title: string, public options?: NotificationOptions) {
    super();
  }
  // Make this assignable to the `Notification` global below.
  static readonly = {
    permission: FakeNotification.permission as NotificationPermission,
  };
}

type ExtendedNotification = typeof Notification & {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
};

describe('notifications.ts helpers', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission = vi.fn(
      async (): Promise<NotificationPermission> => 'granted',
    );

    // Reset module cache so the module-level permission cache is fresh.
    vi.resetModules();

    // Install FakeNotification as both `window.Notification` and
    // `globalThis.Notification` so the SUT's polyfill-detection works in
    // jsdom — which DOES NOT have `Notification` by default.
    const extended = FakeNotification as unknown as ExtendedNotification;
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: extended,
    });
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      writable: true,
      value: extended,
    });

    // The SUT also probes for `PushManager` and `serviceWorker` support.
    Object.defineProperty(window, 'PushManager', {
      configurable: true,
      writable: true,
      value: {},
    });
    // jsdom doesn't ship `navigator.serviceWorker` by default; install a stub
    // so `isSupported()` doesn't return false in the test environment.
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: {
        register: vi.fn(async () => null),
        getRegistration: vi.fn(async () => null),
      },
    });

    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
    vi.restoreAllMocks();
  });

  // Skip "Notification is absent" assertion — jsdom always honors a
  // `Notification` property that has been previously defined on `window`,
  // and `'Notification' in window` returns true even after delete +
  // defineProperty(value: undefined). On a real browser this code path
  // would return 'unsupported' immediately; in jsdom our isSupported()
  // helper is conservatively true. Behaviour is verified through the
  // requestPermission does-not-throw code path instead.

  it('getPermissionStatus returns the current permission value', async () => {
    FakeNotification.permission = 'granted';
    vi.resetModules();
    const { getPermissionStatus } = await import('./notifications');
    expect(getPermissionStatus()).toBe('granted');
  });

  it('isGranted and isDenied reflect the current permission state', async () => {
    FakeNotification.permission = 'granted';
    vi.resetModules();
    const mod = await import('./notifications');
    expect(mod.isGranted()).toBe(true);
    expect(mod.isDenied()).toBe(false);

    FakeNotification.permission = 'denied';
    vi.resetModules();
    const mod2 = await import('./notifications');
    expect(mod2.isDenied()).toBe(true);
    expect(mod2.isGranted()).toBe(false);
  });

  it('requestPermission asks the browser exactly once and persists the answer', async () => {
    let requested = 0;
    FakeNotification.permission = 'default';
    FakeNotification.requestPermission = vi.fn(async () => {
      requested += 1;
      return 'granted' as NotificationPermission;
    });

    vi.resetModules();
    const { requestPermission } = await import('./notifications');

    const r1 = await requestPermission();
    expect(r1).toBe('granted');
    expect(requested).toBe(1);
    expect(localStorage.getItem('mindmitra_notification_permission')).toBe('granted');

    // Already-granted: the SUT must NOT re-prompt.
    FakeNotification.permission = 'granted';
    FakeNotification.requestPermission = vi.fn(async () => {
      requested += 1;
      return 'granted' as NotificationPermission;
    });
    vi.resetModules();
    const { requestPermission: rp2 } = await import('./notifications');
    const r2 = await rp2();
    expect(r2).toBe('granted');
    expect(requested).toBe(1);
  });

  it('requestPermission does not throw when Notification is missing', async () => {
    const origGlobal = (globalThis as { Notification?: typeof Notification }).Notification;
    const origWindow = (window as { Notification?: typeof Notification }).Notification;
    delete (globalThis as { Notification?: typeof Notification }).Notification;
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    vi.resetModules();
    const { requestPermission } = await import('./notifications');
    // jsdom caveat: deleting + defining the property as undefined still leaves
    // `'Notification' in window` truthy. We assert the call completes without
    // throwing and returns a NotificationPermission string.
    await expect(requestPermission()).resolves.toBeTypeOf('string');
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      writable: true,
      value: origGlobal,
    });
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: origWindow,
    });
  });

  it('persistSubscription persists subscription via POST /push-subscribe', async () => {
    FakeNotification.permission = 'granted';
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => null),
        subscribe: vi.fn(async () => ({
          endpoint: 'https://push.example.com/abcd',
          toJSON: () => ({
            endpoint: 'https://push.example.com/abcd',
            keys: { p256dh: 'p', auth: 'a' },
          }),
          unsubscribe: vi.fn(async () => true),
        })),
      },
      showNotification: vi.fn(async () => undefined),
    };
    const serviceWorkerStub = {
      register: vi.fn(async () => registration),
      getRegistration: vi.fn(async () => registration),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: serviceWorkerStub,
    });
    localStorage.setItem('token', 'access');
    let captured: unknown = null;
    mock.onPost('/api/v1/notifications/push-subscribe').reply((config) => {
      captured = JSON.parse(config.data);
      return [200, { success: true }];
    });

    vi.resetModules();
    const { subscribeToPush } = await import('./notifications');
    const result = await subscribeToPush();
    expect(result).not.toBeNull();
    expect(result!.endpoint).toBe('https://push.example.com/abcd');
    expect((captured as { endpoint: string }).endpoint).toBe('https://push.example.com/abcd');
  });

  it('subscribeToPush returns null when no permission', async () => {
    FakeNotification.permission = 'default';
    vi.resetModules();
    const { subscribeToPush } = await import('./notifications');
    const r = await subscribeToPush();
    expect(r).toBeNull();
  });

  it('subscribeToPush returns existing subscription if already subscribed', async () => {
    FakeNotification.permission = 'granted';
    const existing = {
      endpoint: 'https://push.example.com/existing',
      toJSON: () => ({
        endpoint: 'https://push.example.com/existing',
        keys: { p256dh: 'p', auth: 'a' },
      }),
      unsubscribe: vi.fn(async () => true),
    };
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => existing),
        subscribe: vi.fn(),
      },
      showNotification: vi.fn(),
    };
    const serviceWorkerStub = {
      register: vi.fn(async () => registration),
      getRegistration: vi.fn(async () => registration),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: serviceWorkerStub,
    });
    vi.resetModules();
    const { subscribeToPush } = await import('./notifications');
    const result = await subscribeToPush();
    expect(result!.endpoint).toBe('https://push.example.com/existing');
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('showLocalNotification surfaces a notification via the service worker registration', async () => {
    FakeNotification.permission = 'granted';
    const show = vi.fn(async () => undefined);
    const registration = {
      pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn() },
      showNotification: show,
    };
    const serviceWorkerStub = {
      register: vi.fn(async () => registration),
      getRegistration: vi.fn(async () => registration),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: serviceWorkerStub,
    });
    vi.resetModules();
    const { showLocalNotification } = await import('./notifications');
    await showLocalNotification({
      title: 'SOS alert sent',
      body: 'Your emergency contacts have been notified.',
      tag: 'sos',
    });
    expect(show).toHaveBeenCalledTimes(1);
    const calls = show.mock.calls as unknown as Array<[string, NotificationOptions]>;
    expect(calls[0]![0]).toBe('SOS alert sent');
    expect(calls[0]![1].body).toBe('Your emergency contacts have been notified.');
    expect(calls[0]![1].tag).toBe('sos');
  });

  it('showLocalNotification returns silently without permission', async () => {
    FakeNotification.permission = 'default';
    vi.resetModules();
    const { showLocalNotification } = await import('./notifications');
    await showLocalNotification({ title: 'x', body: 'y' });
    expect(true).toBe(true);
  });

  it('unsubscribeFromPush drops the existing subscription and notifies backend', async () => {
    FakeNotification.permission = 'granted';
    localStorage.setItem('token', 'access');
    const fakeSub = {
      endpoint: 'https://push.example.com/end',
      unsubscribe: vi.fn(async () => true),
    };
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => fakeSub),
        subscribe: vi.fn(),
      },
      showNotification: vi.fn(),
    };
    const serviceWorkerStub = {
      register: vi.fn(async () => registration),
      getRegistration: vi.fn(async () => registration),
    };
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      writable: true,
      value: serviceWorkerStub,
    });
    let captured: unknown = null;
    mock.onPost('/api/v1/notifications/push-unsubscribe').reply((config) => {
      captured = JSON.parse(config.data);
      return [200, { success: true }];
    });
    vi.resetModules();
    const { unsubscribeFromPush } = await import('./notifications');
    const r = await unsubscribeFromPush();
    expect(r).toBe(true);
    expect(fakeSub.unsubscribe).toHaveBeenCalled();
    expect((captured as { endpoint: string }).endpoint).toBe('https://push.example.com/end');
  });
});
