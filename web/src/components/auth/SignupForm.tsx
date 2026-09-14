import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PasswordInput } from './PasswordInput';
import { PasswordStrength } from './PasswordStrength';
import { ShieldCheck, AlertCircle, ArrowRight, Loader2, User, Mail, AtSign, CheckCircle2 } from 'lucide-react';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { signUp, isSupabaseConfigured } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError('Please enter your full name.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, hyphens, and underscores.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agreed) {
      setError('Please accept the Security Protocol & Access Policy.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUp({
        full_name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      if (res.success) {
        if (res.needsEmailVerification) {
          setVerificationRequired(true);
        } else if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(res.error || 'Unable to register account. Please check your details.');
      }
    } catch {
      setError('An unexpected error occurred during account creation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationRequired) {
    return (
      <div className="w-full text-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 mb-4 shadow-2xs">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Verify Your Email
        </h2>
        <p className="text-xs text-slate-600 mt-2 max-w-sm mx-auto leading-relaxed">
          We've dispatched a confirmation link to <span className="font-semibold text-slate-900">{email}</span>. Please click the link to activate your LedgerSentinel analyst credentials.
        </p>
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-3 shadow-2xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Create Analyst Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Join the fraud intelligence network and access live operations
        </p>
      </div>

      {/* Unconfigured Demo Mode Notice (subtle) */}
      {!isSupabaseConfigured && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-start gap-2.5">
          <span className="font-semibold px-1.5 py-0.5 rounded bg-amber-200/70 text-[10px] uppercase tracking-wide flex-shrink-0 mt-0.5">
            Demo Mode
          </span>
          <p className="text-[11.5px] leading-relaxed">
            Live Supabase credentials not set. Creating an account will initialize a local session instantly.
          </p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <p className="text-xs font-medium leading-tight">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Full Name */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Full Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Yash Bohra"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-sm text-[#0F1B33] placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all pl-9"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Username & Email row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                placeholder="analyst_handle"
                autoComplete="username"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-sm text-[#0F1B33] placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all pl-9"
              />
              <AtSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Work Email
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@bank.com"
                autoComplete="email"
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-sm text-[#0F1B33] placeholder:text-slate-400 rounded-xl border border-slate-200 focus:border-blue-600 focus:outline-none transition-all pl-9"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Password
          </label>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          <PasswordStrength password={password} />
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-700">
            Confirm Password
          </label>
          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
            disabled={isSubmitting}
            error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
          />
        </div>

        {/* Terms agreement */}
        <div className="pt-1">
          <label className="flex items-start gap-2 cursor-pointer select-none text-[11.5px] text-slate-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>
              I agree to comply with enterprise banking security protocols and on-device privacy safeguards.
            </span>
          </label>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-5 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};
