import React from 'react';
import { 
  Shield, 
  LayoutDashboard, 
  ArrowLeftRight, 
  Briefcase, 
  SearchCode, 
  MessageSquareShare, 
  ShieldCheck, 
  Cpu, 
  FileLock2, 
  History,
  Activity
} from 'lucide-react';
import { useFraud } from '../../context/FraudContext';
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
      { id: 'prism', label: 'PRISM Evaluation', icon: Cpu },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { id: 'privacy', label: 'Consent & Privacy', icon: FileLock2 },
      { id: 'audit', label: 'Audit Trail', icon: History },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useFraud();

  return (
    <aside className="w-[240px] flex-shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col justify-between select-none z-30">
      <div>
        {/* Logo */}
        <div className="h-16 px-5 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 tracking-tight text-base leading-none">
                LedgerSentinel
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-1">
                Fraud Operations
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 tracking-wider">
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors text-left ${
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
      </div>

      {/* Bottom info */}
      <div className="p-3.5 border-t border-slate-100 space-y-3 bg-slate-50/50">
        {/* System Status */}
        <div className="flex items-center justify-between px-2 py-1.5 text-[11px] text-slate-500">
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
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            YP
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-800 truncate leading-snug">
              Yashraj P.
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              Senior Fraud Ops
            </span>
          </div>
          <Activity className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
};
