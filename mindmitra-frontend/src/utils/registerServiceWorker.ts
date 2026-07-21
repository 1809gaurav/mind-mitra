/**
 * Registers the MindMitra service worker. Idempotent — calling more than once
 * is safe and a no-op after the first registration succeeds.
 *
 * Issue #119: a registered service worker is the host for any push
 * notifications we want to receive when the tab is backgrounded. The Web
 * Push API requires an active registration before `pushManager.subscribe()`
 * can be called — so this MUST run before any code tries to subscribe.
 */

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;

    return await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });
  } catch (err) {
    console.warn('[mindmitra] service worker registration failed:', err);
    return null;
  }
};
