import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-campus-700/60 rounded-2xl bg-campus-900/40">
      <div className="p-4 rounded-2xl bg-campus-850/80 border border-campus-700/70 text-slate-400 mb-4 shadow-inner">
        <Icon className="w-8 h-8 text-brand-indigo/80" />
      </div>
      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-slate-400 max-w-sm">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-indigo hover:bg-indigo-500 rounded-xl transition-all shadow-glow-indigo"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
