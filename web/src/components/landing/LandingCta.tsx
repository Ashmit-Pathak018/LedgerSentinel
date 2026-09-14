import React from 'react';
import { ArrowRight, Shield } from 'lucide-react';
import { ShieldCtaScene } from './three/ShieldCtaScene';

interface LandingCtaProps {
  onLaunchApp: () => void;
}

export const LandingCta: React.FC<LandingCtaProps> = ({ onLaunchApp }) => {
  return (
    <section className="relative py-24 lg:py-32 bg-white border-t border-slate-200/80 overflow-hidden text-center">
      {/* 3D Shield Ambient Background */}
      <ShieldCtaScene />

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8 space-y-6">
        
        {/* Subtle Brand Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold tracking-wide uppercase">
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          The Next Generation of Fraud Intelligence
        </div>

        {/* Big Headline */}
        <h2 className="text-3xl sm:text-5xl font-bold text-[#0F1B33] tracking-tight leading-[1.15]">
          See the context before <br className="hidden sm:inline" />
          fraud becomes routine.
        </h2>

        {/* Subheading */}
        <p className="text-base sm:text-xl text-slate-600 font-normal max-w-xl mx-auto leading-relaxed">
          Smarter insights. Clearer decisions. A safer tomorrow.
        </p>

        {/* Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onLaunchApp}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer group"
          >
            Launch Operations Console
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <a
            href="#product"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-sm border border-slate-200 transition-colors cursor-pointer"
          >
            View Product Architecture
          </a>
        </div>

      </div>
    </section>
  );
};
