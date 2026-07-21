import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCachedPermission,
  getPermissionStatus,
} from '../api/notifications';

type Status = 'default' | 'granted' | 'denied' | 'unsupported';

interface Props {
  /**
   * Application server VAPID public key (base64url). When the backend
   * implements push notifications (separate issue), pass this in. Until then
   * we omit the key and the browser will still accept a no-VAPID subscription
   * for local pushes during testing.
   */
  vapidPublicKey?: string | null;
  /**
   * If true, the banner renders on mount unconditionally so notifications
   * can be requested early. Default behaviour: only render when the cached
   * permission is `default` (never asked) or `denied` but not yet
   * acknowledged.
   */
  alwaysOn?: boolean;
}

/**
 * Persistent bottom-of-screen banner asking the user to allow browser push
 * notifications. Once granted it collapses to a single "Disable alerts"
 * chip so the user can revoke later.
 *
 * Acceptance criterion #3 ("Permission flow is smooth for user"): no
 * jarring hard prompts, the bell never appears on top of critical alerts,
 * and the explanation text is right there so the user can decide before
 * the browser even opens its own modal.
 */
const NotificationPrompt: React.FC<Props> = ({ vapidPublicKey, alwaysOn = false }) => {
  const [status, setStatus] = useState<Status>('default');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cached = getCachedPermission();
    if (cached === 'default') {
      const persisted = localStorage.getItem('mindmitra_notif_dismissed');
      setDismissed(persisted === '1');
    }
    setStatus(getPermissionStatus());
  }, []);

  // Re-poll the permission in case the user toggled it in the browser mid-session.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!('Notification' in window)) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    if (status !== 'granted') {
      timer = setInterval(() => {
        setStatus(getPermissionStatus());
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  if (status === 'unsupported') return null;

  const enable = async () => {
    setBusy(true);
    try {
      const result = await requestPermission();
      setStatus(result as Status);
      if (result === 'granted') {
        await subscribeToPush({ vapidPublicKey });
        toast.success('Browser alerts enabled — you will see them even when the app is in the background.');
      } else if (result === 'denied') {
        toast.error('Notifications blocked. You can enable them later in your browser settings.');
      }
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setStatus('denied');
      toast.success('Notifications disabled.');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mindmitra_notif_dismissed', '1');
    }
  };

  if (status === 'granted') {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="text-xs px-3 py-2 rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow transition-colors"
          aria-label="Disable browser notifications"
        >
          🔕 Alerts enabled — toggle off
        </button>
      </div>
    );
  }

  if (!alwaysOn && dismissed) return null;

  return (
    <div
      role="region"
      aria-label="Allow browser alerts"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span aria-hidden="true">🔔</span>
          <span className="font-semibold text-sm">Background SOS alerts</span>
        </div>
        <p className="text-xs text-slate-200/90 leading-snug">
          Allow notifications so we can still surface an emergency alert when the
          app isn't open in front of you.
        </p>
      </div>
      <div className="flex gap-2 self-stretch sm:self-auto">
        <button
          type="button"
          onClick={dismiss}
          disabled={busy}
          className="flex-1 sm:flex-initial text-xs px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="flex-1 sm:flex-initial text-xs font-medium px-3 py-2 rounded-lg bg-emerald-400 text-emerald-950 hover:bg-emerald-300 transition-colors"
        >
          {busy ? 'Working…' : status === 'denied' ? 'Re-enable in browser' : 'Enable alerts'}
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
