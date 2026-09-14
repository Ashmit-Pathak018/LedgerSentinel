import React, { useState } from 'react';
import { 
  Smartphone, 
  KeyRound, 
  PhoneCall, 
  AlertCircle, 
  Send
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useFraud } from '../context/FraudContext';

export const StepUpVerificationView: React.FC = () => {
  const { 
    activeTransaction, 
    verificationStep, 
    selectedVerificationMethod, 
    setSelectedVerificationMethod, 
    sendVerificationRequest
  } = useFraud();

  const [simulatedComplete, setSimulatedComplete] = useState<boolean>(false);

  const methods = [
    {
      id: 'app',
      name: 'Secure Banking App Push',
      desc: 'Cryptographic FIDO2 / Passkey challenge with hardware biometric token prompt.',
      icon: Smartphone,
      recommended: true,
    },
    {
      id: 'mobile',
      name: 'Registered Mobile (SMS & Biometric Link)',
      desc: 'One-time encrypted biometric verification link dispatched to +91 98201 •••••.',
      icon: KeyRound,
      recommended: false,
    },
    {
      id: 'oob',
      name: 'Out-of-band Voice Confirmation (IVR)',
      desc: 'Automated reverse IVR verification call with unique dual-factor security phrase.',
      icon: PhoneCall,
      recommended: false,
    },
  ];

  const statusSteps = [
    { num: 1, title: 'Request Sent', desc: 'Secure payload dispatched' },
    { num: 2, title: 'Awaiting Customer', desc: 'Customer received prompt on Pixel 8' },
    { num: 3, title: 'Verified', desc: 'Hardware biometric confirmed' },
    { num: 4, title: 'Failed', desc: 'Incorrect challenge response' },
    { num: 5, title: 'Expired', desc: 'No response within 180s' },
  ];

  const currentStepNum = simulatedComplete ? 3 : verificationStep;

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Step-up Verification
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Verify customer identity through a secure out-of-band channel.
        </p>
      </div>

      {/* TOP SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">Transaction</span>
          <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
            {activeTransaction.formattedAmount}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">{activeTransaction.id}</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">Risk</span>
          <div className="mt-1">
            <Badge type="risk" value={activeTransaction.riskLevel} />
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Score: {activeTransaction.riskScore}/100</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">Confidence</span>
          <span className="text-xl font-bold font-mono text-blue-600 mt-1 block">
            {activeTransaction.confidence}%
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">Multi-signal verified</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase text-slate-400 block">Identity Assurance</span>
          <div className="mt-1">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
              IAL2 (NIST SP 800-63)
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Biometric binding required</span>
        </div>
      </div>

      {/* MAIN 60 / 40 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT 60%: VERIFICATION METHODS */}
        <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Verification Methods
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the primary out-of-band channel to isolate the victim from attacker influence.
            </p>
          </div>

          <div className="space-y-3">
            {methods.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedVerificationMethod === method.id;
              return (
                <div
                  key={method.id}
                  onClick={() => setSelectedVerificationMethod(method.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-400 ring-2 ring-blue-100 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`mt-0.5 p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {method.name}
                        </span>
                        {method.recommended && (
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {method.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                sendVerificationRequest();
                setSimulatedComplete(false);
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Send Verification Request
            </button>
            <button
              onClick={() => setSimulatedComplete(true)}
              className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              Simulate Customer Auth Passed
            </button>
          </div>
        </div>

        {/* RIGHT 40%: VERIFICATION STATUS STEPPER */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Verification Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live lifecycle state of the dispatched authentication challenge
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {statusSteps.map((step) => {
              const isPast = step.num < currentStepNum;
              const isCurrent = step.num === currentStepNum;
              return (
                <div
                  key={step.num}
                  className={`p-3.5 rounded-xl border flex items-center gap-3.5 transition-all ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100/60 shadow-xs'
                      : isPast
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                      : 'bg-slate-50/40 border-slate-200/60 text-slate-400 opacity-60'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isPast ? '✓' : step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isCurrent ? 'text-blue-900' : isPast ? 'text-slate-800' : 'text-slate-500'}`}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isCurrent ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM: CONCISE WHY VERIFICATION IS REQUIRED */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Why is verification required?
            </div>
            <p className="text-xs font-medium text-slate-800 mt-0.5">
              Elevated social-engineering risk was detected. Out-of-band biometric challenge breaks attacker voice co-presence.
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden md:block">
          ISO 27001 • RBI Advisory Section 4
        </span>
      </div>
    </div>
  );
};
