import React from 'react';
import { ArrowRight, ShieldCheck, Cpu, Users, ChevronDown } from 'lucide-react';
import { HeroScene } from './three/HeroScene';

interface LandingHeroProps {
  onLaunchApp: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onLaunchApp }) => {
  return (
    <section className="relative w-full pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: 45% (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-7 z-10">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              AI-Powered Fraud Intelligence
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-[#0F1B33] tracking-tight leading-[1.12]">
              The transaction <br />
              is not always <br />
              the <span className="text-[#1769FF]">whole story.</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl">
              LedgerSentinel combines transaction data with communication context
              to detect social-engineering fraud before it becomes an irreversible loss.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                onClick={onLaunchApp}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                Explore the System
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                See How It Works
              </a>
            </div>

            {/* Value Statements */}
            <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Detects real threats</span>
              </div>
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>Explains the why</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <span>Human-in-the-loop</span>
              </div>
            </div>

            {/* Subtle Scroll Indicator */}
            <div className="pt-2">
              <a
                href="#the-problem"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ChevronDown className="w-4 h-4 animate-bounce" />
                <span>Scroll to see the bigger picture</span>
              </a>
            </div>
          </div>

          {/* Right Column: 55% (lg:col-span-7) - Three.js Hero Architecture */}
          <div className="lg:col-span-7 relative">
            {/* Ambient backdrop gradient glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/40 via-cyan-50/30 to-indigo-100/30 rounded-3xl blur-2xl -z-10 pointer-events-none" />
            
            <div className="relative rounded-2xl bg-white/70 backdrop-blur-xs border border-slate-200/80 shadow-sm overflow-hidden">
              <HeroScene />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
