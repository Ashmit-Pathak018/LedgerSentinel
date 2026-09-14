import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Image as ImageIcon, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { CALL_TRANSCRIPT_MESSAGES } from '../data/mockData';
import { useFraud } from '../context/FraudContext';

export const CommunicationAnalysisView: React.FC = () => {
  const { activeTransaction } = useFraud();
  const [selectedChannel, setSelectedChannel] = useState<'voice' | 'sms' | 'email' | 'image'>('voice');

  const signals = [
    { name: 'Authority Impersonation', confidence: 94, source: 'Voice Call', level: 'HIGH' },
    { name: 'Urgency', confidence: 91, source: 'Voice Call', level: 'HIGH' },
    { name: 'Secrecy Request', confidence: 88, source: 'Voice Call', level: 'HIGH' },
    { name: 'Payment Redirect', confidence: 86, source: 'SMS', level: 'HIGH' },
    { name: 'Threat', confidence: 82, source: 'Voice Call', level: 'HIGH' },
  ];

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Communication Analysis
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Analyze calls, SMS, emails and images for social-engineering signals.
        </p>
      </div>

      {/* TOP: TRANSACTION CONTEXT */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 block">Transaction ID</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{activeTransaction.id}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 block">Amount</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{activeTransaction.formattedAmount}</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 block">Risk Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
              {activeTransaction.riskLevel}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400 block">Signal Confidence</span>
            <span className="font-mono font-bold text-blue-600 text-sm">{activeTransaction.confidence}%</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero-Egress Encryption Active</span>
        </div>
      </div>

      {/* CHANNEL TABS */}
      <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
        {[
          { id: 'voice', label: 'Voice Calls', icon: Phone, count: '1 Active Call' },
          { id: 'sms', label: 'SMS Messages', icon: MessageSquare, count: '3 Received' },
          { id: 'email', label: 'Transactional Email', icon: Mail, count: '1 Received' },
          { id: 'image', label: 'Message Images', icon: ImageIcon, count: '2 Intercepts' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedChannel === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedChannel(tab.id as any)}
              className={`flex items-center gap-2 pb-3 relative transition-colors ${
                isSelected ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
              {isSelected && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* MAIN 65 / 35 SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT 65%: REDACTED CALL TRANSCRIPT */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                {selectedChannel === 'voice' && 'Redacted Call Transcript'}
                {selectedChannel === 'sms' && 'Incoming SMS Feed (Redacted)'}
                {selectedChannel === 'email' && 'Email Body Intercept'}
                {selectedChannel === 'image' && 'Image OCR & Token Extraction'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Processed locally via quantized on-device NLP. PII masked automatically.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              PII Redacted
            </span>
          </div>

          {/* Clean Conversation Timeline */}
          {selectedChannel === 'voice' ? (
            <div className="space-y-3 pt-2">
              {CALL_TRANSCRIPT_MESSAGES.map((msg) => {
                const isSuspect = msg.speaker.includes('Caller');
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border text-xs leading-relaxed transition-all ${
                      isSuspect
                        ? 'bg-rose-50/40 border-rose-200/70 ml-0 mr-6'
                        : 'bg-slate-50 border-slate-200/70 ml-6 mr-0'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-semibold ${isSuspect ? 'text-rose-900 font-medium' : 'text-slate-700'}`}>
                        {msg.speaker}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {msg.timestamp}
                      </span>
                    </div>

                    <p className="text-slate-800">
                      {msg.text}
                    </p>

                    {msg.suspiciousPhrases && (
                      <div className="mt-2.5 pt-2 border-t border-rose-100/80 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-semibold uppercase text-rose-600">
                          Flagged Phrases:
                        </span>
                        {msg.suspiciousPhrases.map((phrase, i) => (
                          <span
                            key={i}
                            className="bg-rose-100/90 text-rose-800 px-2 py-0.5 rounded text-[11px] font-medium"
                          >
                            "{phrase}"
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700">Channel Payload Summary</p>
              <p>
                Extracted signals: Payment Redirect (86% confidence) targeting beneficiary account ••••4821.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT 35%: DETECTED SIGNALS */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Detected Signals
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by Bayesian severity and extraction confidence
            </p>
          </div>

          <div className="space-y-3">
            {signals.map((sig, idx) => (
              <div
                key={sig.name}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-900">
                    {idx + 1}. {sig.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {sig.confidence}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${sig.confidence}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Source: {sig.source}</span>
                  <span className="text-rose-600 font-medium uppercase text-[10px]">{sig.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM PRIVACY STRIP */}
      <div className="bg-slate-900 text-slate-200 px-6 py-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-white">Processed on-device</span>
            <span className="text-slate-400 ml-2">• Raw communication not transmitted</span>
          </div>
        </div>
        <div className="text-xs font-medium text-blue-300 italic">
          "The signal travels while the message stays local."
        </div>
      </div>
    </div>
  );
};
