import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => string;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => {
        hideToast(id);
      }, 5000);
    }

    return id;
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
                toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                toast.type === 'loading' ? 'bg-zinc-800/90 border-zinc-700 text-white' :
                'bg-zinc-800/90 border-zinc-700 text-white'
              }`}
            >
              <div className="flex-shrink-0">
                {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {toast.type === 'info' && <Info className="w-5 h-5" />}
                {toast.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
              </div>
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              <button
                onClick={() => hideToast(toast.id)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
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
