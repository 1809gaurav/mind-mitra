import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import { resetPassword, validateResetToken } from '../../api/auth';
import { useAppContext } from '../../context/AppContext';

const MindMitraLogo: React.FC = () => (
  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-orange shadow-sm text-white">
    <Leaf size={24} strokeWidth={2.5} />
  </div>
);

const glassInputStyle = "border-none outline-none bg-transparent flex-1 min-w-0 py-3 text-theme-text-primary text-sm font-semibold w-full placeholder-gray-400 focus:ring-0";

const ResetPasswordScreen: React.FC = () => {
  const { darkMode } = useAppContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Dynamic background toggle to prevent Safari flex container portal bugs
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;

    document.documentElement.style.backgroundColor = darkMode ? '#0f172a' : '#fffbf7';
    document.body.style.backgroundColor = darkMode ? '#0f172a' : '#fffbf7';

    return () => {
      document.documentElement.style.backgroundColor = originalHtmlBg;
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, [darkMode]);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }

    validateResetToken(token)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/'), 3000);
    } catch {
      const errMsg = 'Failed to reset password. The link may have expired.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg transition-colors duration-300 flex items-center justify-center p-6 w-full">
      <div className="relative z-10 w-full max-w-[400px] app-card p-8 md:p-10 transition-colors duration-300">
        <div className="mb-8 text-center">
          <MindMitraLogo />
          <h1 className="text-3xl font-extrabold tracking-tight text-theme-blue dark:text-white">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-theme-text-secondary font-medium">
            Choose a new password for your account.
          </p>
        </div>

        {validating ? (
          <p className="text-center text-sm text-theme-text-secondary font-semibold">
            Validating reset link...
          </p>
        ) : !tokenValid ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-red-500 font-semibold">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block text-sm font-bold text-theme-orange hover:text-theme-orange-hover hover:underline"
            >
              Request new reset link
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-green-600 font-semibold">
              Your password has been reset successfully. Redirecting to sign in...
            </p>
            <Link to="/" className="text-sm font-bold text-theme-orange hover:text-theme-orange-hover hover:underline">
              Sign in now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
                New password
              </label>
              <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-5 focus-within:border-theme-orange focus-within:ring-2 focus-within:ring-theme-orange/15 transition-all duration-200">
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={glassInputStyle}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="shrink-0 border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-theme-orange transition-colors cursor-pointer" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
                Confirm password
              </label>
              <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-5 focus-within:border-theme-orange focus-within:ring-2 focus-within:ring-theme-orange/15 transition-all duration-200">
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={glassInputStyle}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="shrink-0 border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-theme-orange transition-colors cursor-pointer" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {password !== confirmPassword && confirmPassword.length > 0 && (
              <p className="text-center text-sm text-red-500 font-semibold" style={{ margin: 0 }}>
                Passwords do not match
              </p>
            )}

            {error && (
              <p className="text-center text-sm text-red-500 font-semibold" style={{ margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              className="w-full app-btn-pill-primary py-3.5 text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <p className="text-center text-sm text-theme-text-secondary" style={{ margin: 0 }}>
              <Link to="/" className="inline-flex items-center gap-1.5 font-bold text-theme-orange hover:text-theme-orange-hover hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
