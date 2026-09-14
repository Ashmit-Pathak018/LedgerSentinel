import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Briefcase, 
  SearchCode, 
  MessageSquareShare, 
  ShieldCheck, 
  FileLock2, 
  History,
  Activity
} from 'lucide-react';
import { useFraud } from '../../context/FraudContext';
import { useAuth } from '../../context/AuthContext';
import type { NavScreen } from '../../types/fraud';

interface NavItem {
  id: NavScreen;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
      { id: 'cases', label: 'Cases', icon: Briefcase },
    ],
  },
  {
    title: 'ANALYSIS',
    items: [
      { id: 'investigation', label: 'Investigation', icon: SearchCode },
      { id: 'communications', label: 'Communications', icon: MessageSquareShare },
      { id: 'stepup', label: 'Step-up Verification', icon: ShieldCheck },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { id: 'privacy', label: 'Consent & Privacy', icon: FileLock2 },
      { id: 'audit', label: 'Audit Trail', icon: History },
      { id: 'prism', label: 'PRISM Observability', icon: Activity },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useFraud();
  const { profile, user } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Fraud Analyst';
  const displayRole = profile?.role || user?.user_metadata?.role || 'Fraud Operations Lead';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('') || 'AN';

  return (
    <aside className="w-[240px] flex-shrink-0 h-screen max-h-screen bg-white border-r border-slate-200 flex flex-col select-none z-30 overflow-hidden">
      {/* Logo Header */}
      <div className="h-16 px-5 flex items-center border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.png" 
            alt="LedgerSentinel Logo" 
            className="w-8 h-8 object-contain rounded-md flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 tracking-tight text-base leading-none">
              LedgerSentinel
            </span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">
              Safer Money Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sections - Scrollable if screen height is constrained */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-4 min-h-0">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 tracking-wider">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isSelected = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentScreen(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition-colors text-left ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom info - Pinned to bottom, never clipped or cut off */}
      <div className="flex-shrink-0 p-3 border-t border-slate-100 space-y-2.5 bg-slate-50/50">
        {/* System Status */}
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-700">Policy Gate Active</span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">v1.3.1</span>
        </div>

        {/* Analyst Profile */}
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200/80 shadow-xs">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-800 truncate leading-snug">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {displayRole}
            </span>
          </div>
          <Activity className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
};

