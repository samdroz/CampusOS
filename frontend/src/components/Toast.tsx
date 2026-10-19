import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast('warning', title, message), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let icon = <Info className="w-4 h-4 text-accent shrink-0" />;
          let borderClass = 'border-l-accent';

          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />;
            borderClass = 'border-l-semantic-success';
          } else if (toast.type === 'error') {
            icon = <XCircle className="w-4 h-4 text-semantic-danger shrink-0" />;
            borderClass = 'border-l-semantic-danger';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-semantic-warning shrink-0" />;
            borderClass = 'border-l-semantic-warning';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start p-3 rounded-lg border border-border-default border-l-4 ${borderClass} bg-surface shadow-xl animate-scaleIn transition-all`}
            >
              <div className="mr-2.5 mt-0.5">{icon}</div>
              <div className="flex-1 mr-2 min-w-0">
                <p className="text-xs font-semibold text-txt-primary leading-snug">{toast.title}</p>
                {toast.message && <p className="text-[11px] text-txt-secondary mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-txt-muted hover:text-txt-primary transition-colors p-0.5"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
