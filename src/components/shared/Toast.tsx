import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { chimePlayer } from "../../utils/audio";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 shrink-0" />,
  error: <XCircle className="w-5 h-5 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0" />,
  info: <Info className="w-5 h-5 shrink-0" />,
};

const STYLES: Record<ToastType, { bar: string; icon: string; border: string }> = {
  success: { bar: "bg-emerald-500", icon: "text-emerald-400", border: "border-emerald-500/30" },
  error: { bar: "bg-rose-500", icon: "text-rose-400", border: "border-rose-500/30" },
  warning: { bar: "bg-amber-500", icon: "text-amber-400", border: "border-amber-500/30" },
  info: { bar: "bg-sky-500", icon: "text-sky-400", border: "border-sky-500/30" },
};

interface ToastCardProps { toast: Toast; onDismiss: (id: string) => void; index: number; }

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss, index }) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  React.useEffect(() => {
    const dur = toast.duration ?? 4000;
    if (dur > 0) timerRef.current = setTimeout(handleDismiss, dur);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 320);
  };

  const s = STYLES[toast.type];
  const dur = toast.duration ?? 4000;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        transform: visible ? `translateX(0) translateY(${index * -4}px) scale(${1 - index * 0.03})` : "translateX(110%)",
        opacity: visible ? Math.max(0, 1 - index * 0.15) : 0,
        transition: "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.28s ease",
        zIndex: 100 - index,
      }}
      className={`w-full max-w-sm pointer-events-auto bg-[#1A2535] border ${s.border} rounded-2xl shadow-2xl overflow-hidden`}
    >
      <div className={`h-1 w-full ${s.bar}`} />
      <div className="flex items-start gap-3 p-4">
        <span className={s.icon}>{ICONS[toast.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{toast.title}</p>
          {toast.message && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>}
        </div>
        <button type="button" onClick={handleDismiss}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fermer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {dur > 0 && (
        <div className="h-0.5 bg-white/10 mx-4 mb-3 rounded-full overflow-hidden">
          <div className={`h-full ${s.bar} opacity-60 rounded-full`}
            style={{ animation: `toast-progress ${dur}ms linear forwards` }} />
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const push = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((p) => [{ id, type, title, message, duration }, ...p].slice(0, 5));

    if (type === 'success') {
      chimePlayer.playChime('toast_success');
    } else if (type === 'warning') {
      chimePlayer.playChime('toast_warning');
    } else if (type === 'error') {
      chimePlayer.playChime('toast_error');
    } else {
      chimePlayer.playChime('tab_switch');
    }
  }, []);

  const ctx: ToastContextValue = {
    success: (t, m, d) => push("success", t, m, d),
    error: (t, m, d) => push("error", t, m, d),
    warning: (t, m, d) => push("warning", t, m, d),
    info: (t, m, d) => push("info", t, m, d),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div aria-label="Notifications"
        className="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col-reverse gap-2 items-end pointer-events-none w-[calc(100vw-2rem)] sm:w-auto max-w-sm">
        {toasts.map((toast, index) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} index={index} />
        ))}
      </div>
      <style>{`
        @keyframes toast-progress { from { width: 100%; } to { width: 0%; } }
      `}</style>
    </ToastContext.Provider>
  );
}
