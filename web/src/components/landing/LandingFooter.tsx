import React from 'react';

interface LandingFooterProps {
  onLaunchApp: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onLaunchApp }) => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-12 lg:py-16 text-slate-600">
      <div className="max-w-7xl mx-auto px-6 md:px-8 space-y-10">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Left: Brand info */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="LedgerSentinel Logo"
              className="w-9 h-9 object-contain rounded-md"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900 tracking-tight text-lg leading-none">
                LedgerSentinel
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                Safer Money Intelligence
              </span>
            </div>
          </div>

          {/* Right: Clean links */}
          <nav className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs font-semibold text-slate-600">
            <a href="#product" className="hover:text-blue-600 transition-colors">
              Product
            </a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#bounded-ai" className="hover:text-blue-600 transition-colors">
              Bounded AI
            </a>
            <a href="#privacy" className="hover:text-blue-600 transition-colors">
              Privacy
            </a>
            <a href="#demo-story" className="hover:text-blue-600 transition-colors">
              Interactive Story
            </a>
            <button
              onClick={onLaunchApp}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Operations Console →
            </button>
          </nav>
        </div>

        {/* Bottom copyright & truth statement */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div>
            © 2026 LedgerSentinel. All rights reserved. Built for institutional banking integrity.
          </div>
          <div className="flex items-center gap-6">
            <span>Deterministic Policy Gate v1.3.1</span>
            <span>Mathematical Privacy Guarantee</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
