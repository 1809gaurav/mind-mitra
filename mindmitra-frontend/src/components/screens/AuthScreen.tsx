import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, User, Lock, Leaf } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppContext } from '../../context/AppContext';

type AuthMode = 'signin' | 'register';

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => void | Promise<void>;
  onRegister?: (email: string, password: string, name: string) => void | Promise<void>;
  loading?: boolean;
}

const MindMitraLogo: React.FC = () => (
  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-theme-orange shadow-sm text-white">
    <Leaf size={24} strokeWidth={2.5} />
  </div>
);

const GlassField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="space-y-2 text-left mb-4">
    <label className="block text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
      {label}
    </label>
    <div className="flex min-h-[50px] items-center gap-3 rounded-2xl border border-theme-border bg-theme-surface px-5 focus-within:border-theme-orange focus-within:ring-2 focus-within:ring-theme-orange/15 transition-all duration-200">
      {children}
    </div>
  </div>
);

const glassInputStyle = "border-none outline-none bg-transparent flex-1 min-w-0 py-3 text-theme-text-primary text-sm font-semibold w-full placeholder-gray-400 focus:ring-0";

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onRegister, loading = false }) => {
  const { darkMode } = useAppContext();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength calculation
  const getPasswordStrength = () => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /[0-9]/.test(password);
    const hasUpperLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let noPersonalInfo = true;
    if (name.trim() && password.toLowerCase().includes(name.trim().toLowerCase())) {
      noPersonalInfo = false;
    }
    const emailPrefix = email.split('@')[0];
    if (emailPrefix.trim() && password.toLowerCase().includes(emailPrefix.trim().toLowerCase())) {
      noPersonalInfo = false;
    }

    // Common sequences
    let noSequences = true;
    const sequentialPatterns = ["12345", "54321", "abcde", "qwerty"];
    for (const pattern of sequentialPatterns) {
      if (password.toLowerCase().includes(pattern)) {
        noSequences = false;
      }
    }

    // Repeated characters
    let noRepeats = true;
    if (/(.)\1{4,}/.test(password)) {
      noRepeats = false;
    }

    const criteria = {
      minLength: hasMinLength,
      number: hasNumber,
      upperLower: hasUpperLower,
      special: hasSpecial,
      personalInfo: noPersonalInfo && noSequences && noRepeats && password.length > 0
    };

    let score = 0;
    if (hasMinLength) score++;
    if (hasNumber) score++;
    if (hasUpperLower) score++;
    if (hasSpecial) score++;
    if (criteria.personalInfo) score++;

    return { criteria, score };
  };

  const { criteria, score } = getPasswordStrength();
  const isPasswordValid = score === 5;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      onRegister?.(email, password, name);
      return;
    }
    onSignIn(email, password);
  };

  return (
    <div className="min-h-screen bg-theme-bg transition-colors duration-300 flex items-center justify-center p-6 w-full">
      <div className="relative z-10 w-full max-w-[400px] app-card p-8 md:p-10 transition-colors duration-300">
        <div className="mb-8 text-center">
          <MindMitraLogo />
          <h1 className="text-3xl font-extrabold tracking-tight text-theme-blue dark:text-white">
            MindMitra
          </h1>
          <p className="mt-2 text-sm text-theme-text-secondary font-medium">
            Your gentle companion for emotional wellness
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <GlassField label="Name">
              <User className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" style={{ color: '#94a3b8', flexShrink: 0, height: '20px', width: '20px' }} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Doe"
                className={glassInputStyle}
                autoComplete="name"
                required
              />
            </GlassField>
          )}

          <GlassField label="Email address">
            <Mail className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" style={{ color: '#94a3b8', flexShrink: 0, height: '20px', width: '20px' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              className={glassInputStyle}
              autoComplete="email"
              required
            />
          </GlassField>

          <GlassField label="Password">
            <Lock className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" style={{ color: '#94a3b8', flexShrink: 0, height: '20px', width: '20px' }} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={glassInputStyle}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="shrink-0 border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-theme-orange transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" style={{ height: '20px', width: '20px' }} /> : <Eye className="h-5 w-5" style={{ height: '20px', width: '20px' }} />}
            </button>
          </GlassField>

          {mode === 'register' && password.length > 0 && (
            <div style={{ marginTop: '4px', textAlign: 'left' }}>
              {/* Strength Bar */}
              <div style={{ display: 'flex', height: '6px', width: '100%', gap: '4px', borderRadius: '3px', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '3px',
                    transition: 'all 0.3s ease',
                    width: `${(score / 5) * 100}%`,
                    backgroundColor: score <= 2 ? '#ef4444' : score <= 4 ? '#eab308' : '#22c55e'
                  }}
                />
              </div>
              {/* Strength Label */}
              <p style={{ fontSize: '12px', marginTop: '6px', fontWeight: 'bold', color: score <= 2 ? '#ef4444' : score <= 4 ? '#ca8a04' : '#16a34a', margin: '4px 0 0' }}>
                Password Strength: {score <= 2 ? 'Weak' : score <= 4 ? 'Medium' : 'Strong (Valid)'}
              </p>
              {/* Checklist */}
              <div className="mt-3 flex flex-col gap-1.5 text-xs text-theme-text-secondary">
                <div className="flex items-center gap-2">
                  <span style={{ color: criteria.minLength ? '#22c55e' : '#94a3b8', fontWeight: 'bold' }}>
                    {criteria.minLength ? '✓' : '○'}
                  </span>
                  <span style={{ color: criteria.minLength ? 'var(--color-text-primary)' : 'inherit' }}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: criteria.number ? '#22c55e' : '#94a3b8', fontWeight: 'bold' }}>
                    {criteria.number ? '✓' : '○'}
                  </span>
                  <span style={{ color: criteria.number ? 'var(--color-text-primary)' : 'inherit' }}>At least one number (0-9)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: criteria.upperLower ? '#22c55e' : '#94a3b8', fontWeight: 'bold' }}>
                    {criteria.upperLower ? '✓' : '○'}
                  </span>
                  <span style={{ color: criteria.upperLower ? 'var(--color-text-primary)' : 'inherit' }}>Uppercase & lowercase letters</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: criteria.special ? '#22c55e' : '#94a3b8', fontWeight: 'bold' }}>
                    {criteria.special ? '✓' : '○'}
                  </span>
                  <span style={{ color: criteria.special ? 'var(--color-text-primary)' : 'inherit' }}>At least one special character</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: criteria.personalInfo ? '#22c55e' : '#94a3b8', fontWeight: 'bold' }}>
                    {criteria.personalInfo ? '✓' : '○'}
                  </span>
                  <span style={{ color: criteria.personalInfo ? 'var(--color-text-primary)' : 'inherit' }}>No name, email prefix, sequences or repeats</span>
                </div>
              </div>
            </div>
          )}

          {mode === 'signin' && (
            <p className="text-right text-sm font-semibold" style={{ margin: '-8px 0 0' }}>
              <Link
                to="/forgot-password"
                className="font-bold text-theme-orange hover:text-theme-orange-hover hover:underline transition-colors"
                style={{ textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </p>
          )}

          {mode === 'register' && isPasswordValid && (
            <GlassField label="Confirm password">
              <Lock className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" style={{ color: '#94a3b8', flexShrink: 0, height: '20px', width: '20px' }} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={glassInputStyle}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="shrink-0 border-0 bg-transparent p-0 text-slate-400 shadow-none hover:text-theme-orange transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" style={{ height: '20px', width: '20px' }} /> : <Eye className="h-5 w-5" style={{ height: '20px', width: '20px' }} />}
              </button>
            </GlassField>
          )}

          {mode === 'register' && isPasswordValid && password !== confirmPassword && confirmPassword.length > 0 && (
            <p className="text-center text-sm text-red-500 font-semibold" style={{ margin: 0 }}>Passwords do not match</p>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              (mode === 'register' &&
                (!name.trim() || !email.trim() || !isPasswordValid || password !== confirmPassword))
            }
            className="mt-2 w-full app-btn-pill-primary py-3.5 text-base font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading
              ? mode === 'register'
                ? 'Creating account...'
                : 'Signing in...'
              : mode === 'register'
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-theme-text-secondary" style={{ margin: 0 }}>
          {mode === 'signin' ? (
            <>
              <span>Don&apos;t have an account? </span>
              <button
                type="button"
                onClick={() => setMode('register')}
                className="inline border-none bg-transparent p-0 font-bold text-theme-orange hover:text-theme-orange-hover hover:underline shadow-none cursor-pointer text-sm"
              >
                Register here
              </button>
            </>
          ) : (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="inline border-none bg-transparent p-0 font-bold text-theme-orange hover:text-theme-orange-hover hover:underline shadow-none cursor-pointer text-sm"
              >
                Sign in here
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
