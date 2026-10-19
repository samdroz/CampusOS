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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border-default rounded-xl bg-surface">
      <div className="p-3 rounded-xl bg-surface-elevated text-txt-muted mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-txt-primary">{title}</h3>
      <p className="mt-1 text-xs text-txt-muted max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center px-3.5 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
