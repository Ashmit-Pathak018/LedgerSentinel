import React from 'react';
import { ShieldCheck, HardDrive, KeyRound, Minimize2, ArrowRight } from 'lucide-react';
import { PrivacyPhoneScene } from './three/PrivacyPhoneScene';

export const PrivacySection: React.FC = () => {
  return (
    <section id="privacy" className="py-20 lg:py-28 bg-[#F7F9FC]">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: 3D Smartphone on-device AI visualization (6 cols) */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl bg-white border border-slate-200/90 shadow-sm p-2 overflow-hidden">
              <PrivacyPhoneScene />
            </div>
          </div>

          {/* Right: Core Principles & Narrative (6 cols) */}
          <div className="lg:col-span-6 space-y-7">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Privacy By Design
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F1B33] tracking-tight leading-tight">
              The signal travels. <br />
              The message stays.
            </h2>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Communication content is processed locally on your hardware. Only mathematical risk
              signals and behavioral claims are evaluated downstream.
            </p>

            {/* Three Architectural Principles */}
            <div className="space-y-4 pt-2">
              
              {/* Principle 1: Scope */}
              <div className="p-4.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B33]">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span>SCOPE — Event-Triggered Access</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                  Communication monitoring is ephemeral and triggered exclusively when a customer initiates an unusual or high-value outward transfer. Sensors do not run continuously.
                </p>
              </div>

              {/* Principle 2: Locality */}
              <div className="p-4.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B33]">
                  <HardDrive className="w-4 h-4 text-emerald-600" />
                  <span>LOCALITY — The Message Stays Local</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                  SMS bodies, audio voice streams, and email messages are processed by lightweight on-device Small Language Models (SLMs). Raw bytes are purged immediately after inference.
                </p>
              </div>

              {/* Principle 3: Minimisation */}
              <div className="p-4.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B33]">
                  <Minimize2 className="w-4 h-4 text-purple-600" />
                  <span>MINIMISATION — Claim & Pointer, Never the Body</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                  Only anonymous signal vectors (e.g. <code>authority_impersonation: 0.94</code>, <code>urgency: 0.91</code>) travel to the bank's policy engine. No human or model outside the device can reconstruct the personal dialogue.
                </p>
              </div>

            </div>

            {/* CTA */}
            <div className="pt-2">
              <a
                href="#demo-story"
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors group cursor-pointer"
              >
                <span>See the complete evidence fusion workflow</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
