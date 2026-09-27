"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "neutral" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds; 0 keeps it until dismissed. Default 4000. */
  duration?: number;
};

type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/**
 * Transient confirmation for actions that otherwise give no feedback: saving
 * a car, copying a link, an admin write. Announced through a polite live
 * region, so screen-reader users hear it without losing their place.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      const duration = toast.duration ?? 4000;
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-(--z-toast) flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => {
          const Icon =
            toast.tone === "success"
              ? Check
              : toast.tone === "error"
                ? CircleAlert
                : Info;
          return (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm animate-panel-in items-start gap-3 rounded-md border",
                "bg-surface-2/95 px-4 py-3 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md",
                toast.tone === "error"
                  ? "border-signal-negative/50"
                  : "border-line-strong",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  toast.tone === "success"
                    ? "text-signal-positive"
                    : toast.tone === "error"
                      ? "text-signal-negative"
                      : "text-gold-400",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-50">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-mt-1 -mr-2 grid size-8 place-items-center rounded-sm text-ink-500 hover:text-ink-100"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Returns a function that shows a toast. Outside a provider it degrades to a
 * no-op rather than throwing, so a component stays usable in isolation.
 */
export function useToast(): (toast: ToastInput) => void {
  return useContext(ToastContext) ?? noop;
}

function noop() {}
