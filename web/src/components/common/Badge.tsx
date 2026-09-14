import React from 'react';
import type { RiskLevel, AutonomyAction, TransactionStatus } from '../../types/fraud';

interface BadgeProps {
  type?: 'risk' | 'action' | 'status' | 'neutral' | 'confidence';
  value: RiskLevel | AutonomyAction | TransactionStatus | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  type = 'neutral', 
  value, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wider',
    lg: 'text-sm px-3.5 py-1.5 font-bold tracking-wider',
  }[size];

  // Specific risk styling
  if (type === 'risk' || ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(value)) {
    const risk = value as RiskLevel;
    const styles = {
      LOW: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
      MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200/70',
      HIGH: 'bg-rose-50 text-rose-700 border border-rose-200/70',
      CRITICAL: 'bg-red-100 text-red-900 border border-red-300 font-bold',
    }[risk] || 'bg-slate-100 text-slate-700 border border-slate-200';

    return (
      <span className={`inline-flex items-center rounded-md uppercase ${sizeClasses} ${styles} ${className}`}>
        {value}
      </span>
    );
  }

  // Autonomy action styling
  if (type === 'action' || ['APPROVE', 'VERIFY', 'COOL_OFF', 'HOLD', 'ESCALATE'].includes(value)) {
    const action = value as AutonomyAction;
    const styles = {
      APPROVE: 'bg-emerald-50 text-emerald-800 border border-emerald-300',
      VERIFY: 'bg-blue-50 text-blue-800 border border-blue-300',
      COOL_OFF: 'bg-amber-50 text-amber-800 border border-amber-300',
      HOLD: 'bg-rose-50 text-rose-800 border border-rose-300 font-bold shadow-xs',
      ESCALATE: 'bg-purple-50 text-purple-900 border border-purple-300 font-bold',
    }[action] || 'bg-slate-100 text-slate-800 border border-slate-300';

    return (
      <span className={`inline-flex items-center rounded-md font-mono font-medium ${sizeClasses} ${styles} ${className}`}>
        {value}
      </span>
    );
  }

  // Confidence styling
  if (type === 'confidence') {
    return (
      <span className={`inline-flex items-center rounded-md font-mono bg-blue-50 text-blue-700 border border-blue-200/80 ${sizeClasses} ${className}`}>
        {value}%
      </span>
    );
  }

  // Status or neutral styling
  const statusStyles: Record<string, string> = {
    'Approved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'In Review': 'bg-blue-50 text-blue-700 border border-blue-200',
    'Hold': 'bg-rose-50 text-rose-700 border border-rose-200',
    'Escalated': 'bg-purple-50 text-purple-700 border border-purple-200',
    'Open': 'bg-amber-50 text-amber-700 border border-amber-200',
    'Resolved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  const currentStyle = statusStyles[value] || 'bg-slate-100 text-slate-700 border border-slate-200';

  return (
    <span className={`inline-flex items-center rounded-md ${sizeClasses} ${currentStyle} ${className}`}>
      {value}
    </span>
  );
};
