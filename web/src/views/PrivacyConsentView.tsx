import React from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  EyeOff, 
  Phone,
  MessageSquare,
  Mail,
  Image as ImageIcon
} from 'lucide-react';
import { useFraud } from '../context/FraudContext';

export const PrivacyConsentView: React.FC = () => {
  const { 
    channels, 
    toggleChannel, 
    isConsentRevoked, 
    revokeAllConsent, 
    restoreConsent 
  } = useFraud();

  const channelIcons: Record<string, React.ElementType> = {
    voice: Phone,
    sms: MessageSquare,
    email: Mail,
    image: ImageIcon,
  };

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Privacy & Consent
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Control exactly what LedgerSentinel can analyze.
        </p>
      </div>

      {/* TOP 3 PRINCIPLES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Principle 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
            1. SCOPE
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Event-triggered access
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Inspection only activates during high-value, high-velocity transactions or recipient anomalies. No continuous ambient surveillance.
          </p>
        </div>

        {/* Principle 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            2. LOCALITY
          </div>
          <h3 className="text-base font-bold text-slate-900">
            The signal travels. The message stays.
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Neural model runs on-device. Raw call audio, SMS texts, and contact data remain strictly confined inside local memory.
          </p>
        </div>

        {/* Principle 3 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
            3. MINIMISATION
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Claim and pointer. Never the body.
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Only cryptographic signal vectors and masked excerpt references are shared with the policy gate. Full transcripts never egress.
          </p>
        </div>
      </div>

      {/* MAIN: COMMUNICATION CHANNELS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Communication Channels
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Granular channel toggles governing signal extraction pipelines
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {isConsentRevoked ? '0 of 4 Active (Revoked)' : '4 of 4 Active'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Channel</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">What is Analyzed</th>
                <th className="py-4 px-6">What Leaves Device</th>
                <th className="py-4 px-6">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {channels.map((chan) => {
                const Icon = channelIcons[chan.channel] || Phone;
                return (
                  <tr key={chan.channel} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-900">{chan.title}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <button
                        onClick={() => toggleChannel(chan.channel)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          chan.enabled
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {chan.enabled ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="py-4.5 px-6 text-slate-700 max-w-[260px]">
                      {chan.analyzedContent}
                    </td>
                    <td className="py-4.5 px-6 text-slate-700 font-medium max-w-[240px]">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {chan.leavesDevice}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-slate-500 font-mono">
                      {chan.retention}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT / BOTTOM: CONSENT STATUS & DESTRUCTIVE ACTION WITH ARCHITECTURAL CONSEQUENCE */}
      <div className={`p-6 rounded-xl border transition-all ${
        isConsentRevoked
          ? 'bg-rose-50/40 border-rose-300'
          : 'bg-white border-slate-200/90 shadow-2xs'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Consent Status:
              </span>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                isConsentRevoked
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {isConsentRevoked ? 'TRANSACTION-ONLY' : 'ACTIVE'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-2 max-w-xl leading-relaxed">
              Customers hold sovereign control under DPDP Act 2023. Revoking consent immediately halts local neural extraction and destroys ephemeral channel state.
            </p>
          </div>

          <div>
            {isConsentRevoked ? (
              <button
                onClick={restoreConsent}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-2xs transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Default Consent
              </button>
            ) : (
              <button
                onClick={revokeAllConsent}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-2xs transition-colors flex items-center gap-2"
              >
                <EyeOff className="w-3.5 h-3.5" />
                Revoke All Access
              </button>
            )}
          </div>
        </div>

        {/* ARCHITECTURAL CONSEQUENCE CARD (CRITICAL REQUIREMENT) */}
        {isConsentRevoked && (
          <div className="mt-6 pt-6 border-t border-rose-200">
            <div className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              ARCHITECTURAL CONSEQUENCE OF REVOCATION (LIVE SYSTEM STATE)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-semibold text-slate-800 block mb-1">
                  1. Communication Analysis Disabled
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Audio transcript, SMS semantic vectors, and image OCR pipelines shut down immediately. Zero local model inferences.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-semibold text-rose-700 block mb-1">
                  2. Confidence Severely Reduced
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Decision confidence drops from <strong className="text-blue-600">87%</strong> to <strong className="text-rose-600 font-mono">42%</strong> due to missing multi-modal corroboration.
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-rose-200 shadow-2xs">
                <span className="font-semibold text-purple-700 block mb-1">
                  3. Routed Toward Human Oversight
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Autonomy ladder automatically lowers. High-value transactions cannot be autonomously cleared; forced conservative hold with human dispatch.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
