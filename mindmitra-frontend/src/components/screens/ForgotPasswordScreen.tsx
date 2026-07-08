import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Leaf } from 'lucide-react';
import { requestPasswordReset } from '../../api/auth';
import { useAppContext } from '../../context/AppContext';

const MindMitraLogo: React.FC = () => (
  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-orange shadow-sm text-white">
    <Leaf size={24} strokeWidth={2.5} />
  </div>
);

const glassInputStyle = "border-none outline-none bg-transparent flex-1 min-w-0 py-3 text-theme-text-primary text-sm font-semibold w-full placeholder-gray-400 focus:ring-0";

const ForgotPasswordScreen: React.FC = () => {
  const { darkMode } = useAppContext();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
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
            Forgot Password
          </h1>
          <p className="mt-2 text-sm text-theme-text-secondary font-medium">
            {submitted
              ? 'Check your inbox for a reset link.'
              : 'Enter your email and we’ll send you a reset link.'}
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-theme-text-secondary leading-relaxed">
              If an account exists for <strong className="text-theme-text-primary">{email}</strong>, you will receive a password reset link shortly.
              The link expires in 15 minutes.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-theme-orange hover:text-theme-orange-hover hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
                Email address
              </label>
              <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-5 focus-within:border-theme-orange focus-within:ring-2 focus-within:ring-theme-orange/15 transition-all duration-200">
                <Mail className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className={glassInputStyle}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-center text-sm text-red-500 font-semibold">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full app-btn-pill-primary py-3.5 text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPasswordScreen;
