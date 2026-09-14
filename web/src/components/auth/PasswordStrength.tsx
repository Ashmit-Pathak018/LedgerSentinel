import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let label = 'Weak';
  let color = 'bg-rose-500';
  let textColor = 'text-rose-600';
  let width = 'w-1/3';

  if (score >= 3 && password.length >= 10) {
    label = 'Strong';
    color = 'bg-emerald-500';
    textColor = 'text-emerald-600';
    width = 'w-full';
  } else if (score >= 2 && password.length >= 8) {
    label = 'Fair';
    color = 'bg-amber-500';
    textColor = 'text-amber-600';
    width = 'w-2/3';
  }

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Password strength</span>
        <span className={`font-semibold ${textColor}`}>{label}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} ${width} transition-all duration-300 rounded-full`} />
      </div>
    </div>
  );
};
