import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  FileCheck
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { useFraud } from '../context/FraudContext';

export const CaseManagementView: React.FC = () => {
  const { 
    cases, 
    activeCaseId, 
    setActiveCaseId, 
    setCurrentScreen, 
    updateCaseAction, 
    addCaseNote,
    selectTransaction
  } = useFraud();
  
  const [selectedStatusTab, setSelectedStatusTab] = useState<'Open' | 'In Progress' | 'Escalated' | 'Resolved'>('Open');
  const [caseTab, setCaseTab] = useState<'Timeline' | 'Audit' | 'Notes'>('Timeline');
  const [newNote, setNewNote] = useState<string>('');

  const selectedCase = cases.find(c => c.id === activeCaseId) || cases[0];

  const filteredCases = cases.filter(c => c.status === selectedStatusTab);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    addCaseNote(selectedCase.id, newNote);
    setNewNote('');
  };

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Case Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review, investigate and resolve fraud cases.
        </p>
      </div>

      {/* TOP: TABS & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
          {(['Open', 'In Progress', 'Escalated', 'Resolved'] as const).map((tab) => {
            const count = cases.filter(c => c.status === tab).length;
            const isSelected = selectedStatusTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedStatusTab(tab)}
                className={`flex items-center gap-2 pb-3 relative transition-colors ${
                  isSelected ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
                {isSelected && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search cases..."
            className="w-full bg-white text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* MAIN: 70% CASE TABLE / 30% SELECTED CASE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 70% CASE TABLE */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-5">Case ID</th>
                  <th className="py-3.5 px-5">Transaction</th>
                  <th className="py-3.5 px-5">Risk</th>
                  <th className="py-3.5 px-5">Confidence</th>
                  <th className="py-3.5 px-5">Action</th>
                  <th className="py-3.5 px-5">Assigned</th>
                  <th className="py-3.5 px-5">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCases.map((c) => {
                  const isSelected = c.id === selectedCase.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setActiveCaseId(c.id)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/40 font-medium' : ''
                      }`}
                    >
                      <td className="py-4 px-5 font-mono font-semibold text-blue-600">
                        {c.id}
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-mono text-slate-800">{c.transactionId}</span>
                        <span className="block text-[11px] text-slate-400">{c.amount}</span>
                      </td>
                      <td className="py-4 px-5">
                        <Badge type="risk" value={c.riskLevel} size="sm" />
                      </td>
                      <td className="py-4 px-5">
                        <Badge type="confidence" value={c.confidence.toString()} size="sm" />
                      </td>
                      <td className="py-4 px-5">
                        <Badge type="action" value={c.action} size="sm" />
                      </td>
                      <td className="py-4 px-5 text-slate-600">
                        {c.assignedTo}
                      </td>
                      <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                        {c.updatedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 30% SELECTED CASE */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Case Details
              </span>
              <h3 className="text-base font-bold text-slate-900 font-mono">
                {selectedCase.id}
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-mono bg-rose-50 px-2 py-1 rounded border border-rose-200">
              <Clock className="w-3.5 h-3.5" />
              <span>SLA: {selectedCase.slaRemaining}</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Transaction ID</span>
              <button 
                onClick={() => selectTransaction(selectedCase.transactionId)}
                className="font-mono font-semibold text-blue-600 hover:underline"
              >
                {selectedCase.transactionId} ↗
              </button>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-800">{selectedCase.amount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Customer</span>
              <span className="font-medium text-slate-800">{selectedCase.customerName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Risk Assessment</span>
              <Badge type="risk" value={selectedCase.riskLevel} size="sm" />
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Confidence</span>
              <span className="font-mono font-bold text-blue-600">{selectedCase.confidence}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Assigned Analyst</span>
              <span className="font-medium text-slate-800">{selectedCase.assignedTo}</span>
            </div>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setCurrentScreen('stepup')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center justify-center gap-2"
            >
              <FileCheck className="w-4 h-4" />
              Start Verification
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateCaseAction(selectedCase.id, 'HOLD')}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                Place Hold
              </button>
              <button
                onClick={() => updateCaseAction(selectedCase.id, 'ESCALATE')}
                className="bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BELOW: TABS (CASE TIMELINE, AUDIT HISTORY, NOTES) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex border-b border-slate-200 text-xs font-semibold space-x-6">
          {(['Timeline', 'Audit', 'Notes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setCaseTab(tab)}
              className={`pb-3 relative transition-colors ${
                caseTab === tab ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab === 'Timeline' ? 'Case Timeline' : tab === 'Audit' ? 'Audit History' : 'Analyst Notes'}</span>
              {caseTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Case Timeline */}
        {caseTab === 'Timeline' && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-600 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Case Created Automatically</span>
                <span className="text-slate-400 ml-2 font-mono">10:18:42 AM</span>
                <p className="text-slate-600 mt-0.5">
                  Policy gate evaluated high-risk social engineering markers. Auto-assigned to Tier-2 Queue.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-400 mt-1 flex-shrink-0" />
              <div>
                <span className="font-semibold text-slate-800">Assigned to Yashraj P.</span>
                <span className="text-slate-400 ml-2 font-mono">10:19:03 AM</span>
                <p className="text-slate-600 mt-0.5">Analyst accepted case via global queue dispatcher.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Audit History */}
        {caseTab === 'Audit' && (
          <div className="text-xs space-y-2 pt-1 font-mono text-slate-600">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 flex justify-between">
              <span>[10:18:42] SYSTEM: Policy gate rule v1.3.1 enforced HOLD.</span>
              <span className="text-emerald-700 font-sans font-medium">SUCCESS</span>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 flex justify-between">
              <span>[10:19:03] ANALYST: Yashraj opened investigation dossier.</span>
              <span className="text-blue-700 font-sans font-medium">VIEWED</span>
            </div>
          </div>
        )}

        {/* Tab 3: Notes */}
        {caseTab === 'Notes' && (
          <div className="space-y-4 pt-1">
            <div className="space-y-2.5 text-xs">
              {selectedCase.notes.map((note) => (
                <div key={note.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="flex justify-between items-center text-slate-400 mb-1">
                    <span className="font-semibold text-slate-700">{note.author}</span>
                    <span className="font-mono text-[10px]">{note.timestamp}</span>
                  </div>
                  <p className="text-slate-700">{note.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                placeholder="Add analyst note or rationale..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Add Note
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
