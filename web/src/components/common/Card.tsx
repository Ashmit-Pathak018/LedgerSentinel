import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  onClick,
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all ${onClick ? 'cursor-pointer hover:border-slate-300' : ''} ${className}`}
    >
      {(title || action) && (
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
