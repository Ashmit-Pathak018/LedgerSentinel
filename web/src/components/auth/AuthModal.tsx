import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { X, CheckCircle2, Shield } from 'lucide-react';

interface AuthModalProps {
  onSuccessRedirect?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccessRedirect }) => {
  const {
    authModalOpen,
    authModalView,
    closeAuthModal,
    setAuthModalView,
    profile,
    user,
  } = useAuth();

  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '' });
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && authModalOpen) {
        closeAuthModal();
      }
    };

    if (authModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      setShowSuccessScreen(false);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [authModalOpen, closeAuthModal]);

  const handleAuthSuccess = () => {
    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Analyst';
    setSuccessMessage({
      title: authModalView === 'signup' ? `Welcome, ${displayName}!` : `Welcome back, ${displayName}!`,
      subtitle: 'Session authenticated. Initializing Operations Console...',
    });
    setShowSuccessScreen(true);

    setTimeout(() => {
      closeAuthModal();
      setShowSuccessScreen(false);
      if (onSuccessRedirect) {
        onSuccessRedirect();
      }
    }, 1200);
  };

  if (!authModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Dimmed & Blurred Backdrop - Keeps Three.js Hero subtly visible */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-md transition-opacity duration-300"
        onClick={closeAuthModal}
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-[440px] my-auto bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/10 p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200 transition-all border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {showSuccessScreen ? (
          /* Success Splash State */
          <div className="py-8 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8 animate-in zoom-in duration-200" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {successMessage.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
              {successMessage.subtitle}
            </p>
            <div className="mt-6 flex justify-center items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
              </span>
              <span className="text-xs font-mono font-medium text-slate-600">
                Opening Dashboard...
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* View Switcher Tabs (Only for login / signup) */}
            {(authModalView === 'login' || authModalView === 'signup') && (
              <div className="flex rounded-xl bg-slate-100/90 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setAuthModalView('login')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authModalView === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthModalView('signup')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    authModalView === 'signup'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Modal Content Body */}
            {authModalView === 'login' && (
              <LoginForm
                onSuccess={handleAuthSuccess}
                onSwitchToSignup={() => setAuthModalView('signup')}
                onForgotPassword={() => setAuthModalView('forgot_password')}
              />
            )}

            {authModalView === 'signup' && (
              <SignupForm
                onSuccess={handleAuthSuccess}
                onSwitchToLogin={() => setAuthModalView('login')}
              />
            )}

            {authModalView === 'forgot_password' && (
              <ForgotPasswordForm
                onBackToLogin={() => setAuthModalView('login')}
              />
            )}

            {authModalView === 'reset_password' && (
              <ResetPasswordForm
                onSuccess={handleAuthSuccess}
                onBackToLogin={() => setAuthModalView('login')}
              />
            )}

            {/* Bottom Security Badge */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-blue-500" />
              <span>Protected by Supabase Auth & LedgerSentinel Policy Gate</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
