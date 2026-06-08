import React, { useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface CooldownStatus {
  active: boolean;
  remaining_seconds: number;
  last_alert_at: string | null;
}

const SOSScreen: React.FC = () => {
  const { darkMode } = useContext(AppContext);
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');

  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<CooldownStatus | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const HOLD_DURATION = 2000; // 2 seconds to confirm

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Fetch cooldown status on mount
  const fetchCooldown = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/sos/cooldown-status`, { headers });
      if (res.ok) {
        const data: CooldownStatus = await res.json();
        setCooldown(data);
        if (data.active) {
          setCountdown(data.remaining_seconds);
        }
      }
    } catch {
      // Silently fail — button stays enabled
    }
  }, [token]);

  useEffect(() => {
    fetchCooldown();
  }, [fetchCooldown]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCooldown((c) => (c ? { ...c, active: false, remaining_seconds: 0 } : c));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Hold-to-send pattern
  const startHold = () => {
    if (cooldown?.active || loading) return;
    setHoldProgress(0);
    const startTime = Date.now();
    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        clearInterval(holdTimer.current!);
        holdTimer.current = null;
        sendSOS();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldProgress(0);
  };

  const sendSOS = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/sos/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'Manual SOS triggered from dashboard' }),
      });

      if (res.status === 201) {
        const data = await res.json();
        setResult({ type: 'success', message: data.message });
        await fetchCooldown();
      } else if (res.status === 429) {
        const data = await res.json();
        setResult({ type: 'error', message: data.detail });
        await fetchCooldown();
      } else {
        setResult({ type: 'error', message: 'Failed to send SOS. Please try again.' });
      }
    } catch {
      setResult({ type: 'error', message: 'Network error. Please check your connection.' });
    } finally {
      setLoading(false);
      setHoldProgress(0);
    }
  };

  const isCooldownActive = cooldown?.active && countdown > 0;

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900' : 'bg-red-50'
      }`}
    >
      {/* Header */}
      <div className="text-6xl mb-4 animate-pulse">🚨</div>
      <h2
        className={`text-3xl font-bold mb-2 ${
          darkMode ? 'text-red-400' : 'text-red-600'
        }`}
      >
        EMERGENCY SOS
      </h2>
      <p
        className={`text-sm mb-8 text-center max-w-xs ${
          darkMode ? 'text-gray-400' : 'text-gray-600'
        }`}
      >
        Hold the button for 2 seconds to send an emergency alert to your contacts
      </p>

      {/* SOS Button */}
      <div className="relative mb-8">
        {/* Progress ring */}
        <svg className="absolute inset-0 w-44 h-44 -rotate-90" viewBox="0 0 176 176">
          <circle
            cx="88"
            cy="88"
            r="80"
            fill="none"
            stroke={darkMode ? '#374151' : '#fecaca'}
            strokeWidth="8"
          />
          <circle
            cx="88"
            cy="88"
            r="80"
            fill="none"
            stroke={holdProgress > 0 ? '#22c55e' : 'transparent'}
            strokeWidth="8"
            strokeDasharray={`${holdProgress * 502.65} 502.65`}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          disabled={!!isCooldownActive || loading}
          className={`relative w-44 h-44 rounded-full shadow-2xl flex flex-col items-center justify-center font-bold text-lg transition-all duration-300 select-none ${
            isCooldownActive || loading
              ? 'bg-gray-400 cursor-not-allowed opacity-60'
              : 'bg-red-500 hover:bg-red-600 hover:scale-105 active:scale-95 text-white'
          }`}
        >
          {loading ? (
            <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
          ) : isCooldownActive ? (
            <>
              <span className="text-sm text-white/80">Cooldown</span>
              <span className="text-2xl text-white font-mono">{formatTime(countdown)}</span>
            </>
          ) : (
            <>
              <span className="text-white text-sm">Hold to</span>
              <span className="text-white text-xl">ALERT</span>
            </>
          )}
        </button>
      </div>

      {/* Result notification */}
      {result && (
        <div
          className={`max-w-sm w-full p-4 rounded-xl shadow-lg mb-6 text-center transition-all duration-300 ${
            result.type === 'success'
              ? darkMode
                ? 'bg-green-900/50 border border-green-700 text-green-300'
                : 'bg-green-100 border border-green-300 text-green-800'
              : darkMode
              ? 'bg-red-900/50 border border-red-700 text-red-300'
              : 'bg-red-100 border border-red-300 text-red-800'
          }`}
        >
          <span className="text-xl mr-2">{result.type === 'success' ? '✅' : '⚠️'}</span>
          <span className="text-sm">{result.message}</span>
        </div>
      )}

      {/* Cancel button */}
      <button
        onClick={() => navigate(-1)}
        className={`px-8 py-3 rounded-lg font-medium transition-colors duration-300 ${
          darkMode
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            : 'bg-gray-500 hover:bg-gray-600 text-white'
        }`}
      >
        Go Back
      </button>
    </div>
  );
};

export default SOSScreen;