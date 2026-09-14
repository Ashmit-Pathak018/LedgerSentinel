import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronRight, ChevronDown, LogOut, Shield } from 'lucide-react';
import { useFraud } from '../../context/FraudContext';
import { useAuth } from '../../context/AuthContext';

interface TopBarProps {
  onBackToLanding?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onBackToLanding }) => {
  const { currentScreen, activeTransaction } = useFraud();
  const { profile, user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Fraud Analyst';
  const displayRole = profile?.role || user?.user_metadata?.role || 'Fraud Operations Lead';
  const displayUsername = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'analyst';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('') || 'AN';

  // Compute breadcrumb title based on screen
  const screenTitleMap: Record<string, string> = {
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    cases: 'Case Management',
    investigation: 'Investigation',
    communications: 'Communication Analysis',
    stepup: 'Step-up Verification',
    privacy: 'Consent & Privacy',
    audit: 'Audit Trail',
    prism: 'PRISM Observability',
  };

  const currentTitle = screenTitleMap[currentScreen] || 'Overview';

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    if (onBackToLanding) {
      onBackToLanding();
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center justify-between px-8">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-3">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            title="Return to Product Landing Page"
          >
            ← Product Page
          </button>
        )}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="text-slate-400">LedgerSentinel</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-600">{currentTitle}</span>
        {(currentScreen === 'investigation' || currentScreen === 'communications') && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
              {activeTransaction.id}
            </span>
          </>
        )}
        </nav>
      </div>

      {/* Center: Global Search */}
      <div className="w-full max-w-md mx-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search transactions, cases or customers..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-9 pr-4 py-2 rounded-lg border border-slate-200/90 focus:border-blue-500 focus:outline-none transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Right: Notifications, Date & Analyst Menu */}
      <div className="flex items-center gap-4 text-xs">
        {/* Timestamp */}
        <div className="text-slate-500 hidden md:block">
          <span className="font-medium text-slate-700">26 Aug 2026</span>
          <span className="text-slate-400 ml-1.5 font-mono">10:24 AM IST</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />

        {/* Notifications */}
        <button 
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="3 Unread Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Analyst Avatar & Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1 py-1 pr-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-expanded={menuOpen}
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-xs ring-1 ring-slate-200">
              {initials}
            </div>
            <span className="font-semibold text-slate-800 text-xs hidden lg:inline max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden lg:inline" />
          </button>

          {/* User Menu Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  @{displayUsername}
                </p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {displayRole}
                </span>
              </div>

              {onBackToLanding && (
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onBackToLanding();
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    Product Landing Page
                  </button>
                </div>
              )}

              <div className="border-t border-slate-100 pt-1">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

