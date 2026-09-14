import React from 'react';
import { ArrowRight, Activity, Eye, SlidersHorizontal } from 'lucide-react';

interface TheProductSectionProps {
  onLaunchApp: () => void;
}

export const TheProductSection: React.FC<TheProductSectionProps> = ({ onLaunchApp }) => {
  return (
    <section id="product" className="py-20 lg:py-28 bg-[#F7F9FC]">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: High-fidelity realistic Operations Dashboard Mockup (7 cols) */}
          <div className="lg:col-span-7">
            <div className="relative group">
              {/* Soft glow behind mockup */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-indigo-500/10 rounded-3xl blur-xl transition-all group-hover:scale-101" />

              {/* Realistic Console Frame */}
              <div className="relative rounded-2xl bg-white border border-slate-200/90 shadow-lg overflow-hidden">
                {/* Mock Window Header */}
                <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                    <span className="ml-2 text-xs font-mono text-slate-500">app.ledgersentinel.internal/dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Cluster Active
                  </div>
                </div>

                {/* Dashboard Inner Canvas */}
                <div className="p-6 bg-[#F8FAFC] space-y-5">
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-medium text-slate-500">Total Analysed</div>
                      <div className="text-xl font-bold text-slate-900 mt-0.5">142,850</div>
                      <div className="text-[10px] text-emerald-600 font-medium mt-1">99.4% Auto-approved</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-medium text-slate-500">Flagged Cases</div>
                      <div className="text-xl font-bold text-rose-600 mt-0.5">12</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">4 Escalated to Tier-2</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      <div className="text-[11px] font-medium text-slate-500">Active Policy Gate</div>
                      <div className="text-sm font-bold text-slate-900 mt-1 font-mono">v1.3.1 (Deterministic)</div>
                      <div className="text-[10px] text-blue-600 font-medium mt-1">Zero Autonomous Hallucinations</div>
                    </div>
                  </div>

                  {/* Flagged Transaction Highlight Card */}
                  <div className="p-4.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                        <span className="text-xs font-bold font-mono text-slate-900">TXN-88204-IN</span>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          CRITICAL HOLD
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">₹8,00,000</div>
                    </div>

                    {/* Progress Metrics */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Risk Score</span>
                          <span className="font-bold text-rose-600 font-mono">82 / 100</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: '82%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Confidence Score</span>
                          <span className="font-bold text-blue-700 font-mono">87%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: '87%' }} />
                        </div>
                      </div>
                    </div>

                    {/* Extracted Signals Tag Row */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        Authority Impersonation (94%)
                      </span>
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        Urgency Pressure (91%)
                      </span>
                      <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                        Secrecy Instruction (88%)
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        Account Redirect (86%)
                      </span>
                    </div>
                  </div>

                </div>

                {/* Dashboard Bottom Banner */}
                <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between text-xs">
                  <span className="text-slate-300">Analyst: <strong className="text-white">Yash Bohra</strong> · Frontend & Fraud Ops Lead</span>
                  <button 
                    onClick={onLaunchApp}
                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Open Live Operations Console →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Copy & Value Propositions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
              The Product
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#0F1B33] tracking-tight leading-tight">
              From data to decisions.
            </h2>

            <p className="text-base text-slate-600 font-normal leading-relaxed">
              We analyse transactions, communication signals, and behavioural context
              to detect risks, explain them clearly, and enforce bounded deterministic policy actions.
            </p>

            {/* 3 Core Features */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F1B33]">Real-time risk analysis</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Sub-second fusion of transaction ledger facts with on-device communication signals without lagging payment rails.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F1B33]">Explainable insights</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Every inference references specific signal scores (impersonation, urgency, redirect) with immutable SHA-256 audit trails.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 mt-0.5">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F1B33]">Seamless human review</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    High-risk or low-confidence cases automatically transition autonomy into human hands with strict 15-minute SLA gates.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4">
              <button
                onClick={onLaunchApp}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0F1B33] hover:bg-slate-800 text-white font-semibold text-sm shadow-xs transition-colors cursor-pointer"
              >
                Explore the Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
