import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border-default rounded-xl max-w-md w-full p-5 shadow-2xl animate-scaleIn">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-lg ${isDanger ? 'bg-semantic-danger-subtle text-semantic-danger' : 'bg-accent-subtle text-accent'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-txt-primary">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-txt-muted hover:text-txt-primary transition-colors p-1 rounded-md hover:bg-surface-elevated"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-2.5 text-xs text-txt-secondary leading-relaxed">{message}</p>

        <div className="mt-5 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-txt-primary bg-surface-elevated hover:bg-surface-hover border border-border-subtle rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
              isDanger
                ? 'bg-semantic-danger hover:opacity-90'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
