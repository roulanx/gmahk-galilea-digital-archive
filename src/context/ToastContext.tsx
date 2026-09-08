'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Check, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (params: {
    type: ToastType;
    message: string;
    description?: string;
    duration?: number;
  }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      message,
      description,
      duration = 4500,
    }: {
      type: ToastType;
      message: string;
      description?: string;
      duration?: number;
    }) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, message, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast Render Container - Fixed bottom right on desktop, bottom center on mobile */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((toast) => {
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto bg-black text-white dark:bg-white dark:text-black rounded-2xl p-4 shadow-2xl border border-white/10 dark:border-black/10 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300"
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && <Check className="w-4 h-4 text-white dark:text-black" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white/80 dark:text-black/80" />}
                {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-white/80 dark:text-black/80" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-white/70 dark:text-black/70" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight">{toast.message}</p>
                {toast.description && (
                  <p className="text-[11px] text-white/70 dark:text-black/70 mt-1 leading-snug">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 text-white/50 hover:text-white dark:text-black/50 dark:hover:text-black p-0.5 rounded-full transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
