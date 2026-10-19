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
    }, 4500);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast('warning', title, message), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          let icon = <Info className="w-5 h-5 text-blue-400 shrink-0" />;
          let border = 'border-blue-500/30';
          let bg = 'bg-campus-850/95';

          if (toast.type === 'success') {
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
            border = 'border-emerald-500/30';
          } else if (toast.type === 'error') {
            icon = <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
            border = 'border-rose-500/30';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
            border = 'border-amber-500/30';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start p-3.5 rounded-xl border ${border} ${bg} backdrop-blur-xl shadow-2xl animate-scaleIn transition-all`}
            >
              <div className="mr-3 mt-0.5">{icon}</div>
              <div className="flex-1 mr-2 min-w-0">
                <p className="text-sm font-semibold text-slate-100 leading-snug">{toast.title}</p>
                {toast.message && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
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
