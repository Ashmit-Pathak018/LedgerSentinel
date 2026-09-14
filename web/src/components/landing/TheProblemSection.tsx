import React from 'react';
import { Plus, ArrowRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export const TheProblemSection: React.FC = () => {
  return (
    <section id="the-problem" className="py-20 lg:py-28 bg-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
            The Problem
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0F1B33] tracking-tight">
            Fraud hides in the context.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
            A transaction can look legitimate in isolation while the conversation
            around it reveals urgent social manipulation, impersonation, or coercion.
          </p>
        </div>

        {/* 3 Horizontal Cards Equation */}
        <div className="relative grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
          
          {/* Card 1: Transaction (Cols 1-3) */}
          <div className="md:col-span-3 p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Transaction
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Looks normal
              </span>
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-bold text-[#0F1B33]">₹8,00,000</div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Recipient: <span className="font-medium text-slate-800">New Account ••••4821</span></div>
                <div>Timestamp: <span className="font-mono text-slate-500">26 Aug · 10:18 AM</span></div>
                <div>Channel: <span className="font-medium text-slate-800">Mobile Banking (UPI)</span></div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Standard rule engines approve</span>
            </div>
          </div>

          {/* Plus Separator 1 (Col 4) */}
          <div className="hidden md:flex md:col-span-1 justify-center items-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200">
              <Plus className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Communication (Cols 5-7) */}
          <div className="md:col-span-3 p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200/90 shadow-2xs hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Communication
              </span>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                Hidden Signals
              </span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="font-medium text-slate-800">Extreme Urgency</span>
                <span className="text-rose-600 font-semibold font-mono">91%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="font-medium text-slate-800">Authority Claim</span>
                <span className="text-rose-600 font-semibold font-mono">94%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="font-medium text-slate-800">Secrecy Pressure</span>
                <span className="text-purple-600 font-semibold font-mono">88%</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="font-medium text-slate-800">Account Redirect</span>
                <span className="text-amber-600 font-semibold font-mono">86%</span>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Active social engineering</span>
            </div>
          </div>

          {/* Plus Separator 2 (Col 8) */}
          <div className="hidden md:flex md:col-span-1 justify-center items-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold border border-slate-200">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Context (Cols 9-11) */}
          <div className="md:col-span-3 p-6 rounded-2xl bg-gradient-to-b from-blue-50/70 to-slate-50 border border-blue-200 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-blue-200/60">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                3. Context
              </span>
              <span className="text-[11px] font-semibold text-white bg-blue-600 px-2 py-0.5 rounded shadow-2xs">
                Changes Everything
              </span>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-slate-700 leading-relaxed">
                Fused multi-channel evidence proves that transaction ₹8,00,000 is directly prompted by impersonation under false threat.
              </div>
              <div className="p-3 rounded-lg bg-white border border-blue-200/80 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Composite Risk:</span>
                  <span className="font-bold text-rose-600 font-mono">82 / 100 (HIGH)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Bayesian Confidence:</span>
                  <span className="font-bold text-blue-700 font-mono">87%</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-slate-100 font-semibold">
                  <span className="text-slate-700">Policy Gate:</span>
                  <span className="text-orange-600">BOUND TO HOLD</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-blue-200/60 flex items-center gap-1.5 text-xs text-blue-800 font-semibold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Full truth exposed before loss</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
