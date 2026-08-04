import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ToastContext,
  type ToastOptions,
  type ToastTone,
} from "./toast-context";
import { Check, Info, TriangleAlert, X, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastRecord extends ToastOptions {
  id: number;
  tone: ToastTone;
}

const TONE: Record<
  ToastTone,
  { spine: string; icon: typeof Check; iconClass: string }
> = {
  success: { spine: "text-pine", icon: Check, iconClass: "text-pine-ink" },
  error: { spine: "text-rust", icon: CircleX, iconClass: "text-rust-ink" },
  warning: {
    spine: "text-signal",
    icon: TriangleAlert,
    iconClass: "text-signal-ink",
  },
  info: { spine: "text-ink-muted", icon: Info, iconClass: "text-ink-muted" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    seq.current += 1;
    const id = seq.current;
    const tone = options.tone ?? "info";
    setToasts((prev) => [...prev.slice(-3), { ...options, id, tone }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          role="status"
          className="fixed bottom-5 right-5 z-[2000] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2"
        >
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: number) => void;
}) {
  const { spine, icon: Icon, iconClass } = TONE[toast.tone];
  const duration = toast.duration ?? (toast.tone === "error" ? 0 : 4500);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss, toast.id]);

  return (
    <div
      className={cn(
        "spine animate-in-up flex items-start gap-3 overflow-hidden rounded-md border border-line bg-panel py-3 pl-4 pr-3 shadow-pop",
        spine,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-ink">
          {toast.title}
        </p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 text-xs font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 hover:decoration-ink"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Tutup notifikasi"
        className="-mr-1 rounded p-1 text-ink-muted transition-colors hover:bg-panel-raised hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

