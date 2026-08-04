import { createContext } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds on screen. Errors stay until dismissed by default. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

/** Kept apart from the provider component so fast refresh works on both. */
export const ToastContext = createContext<ToastContextValue | null>(null);
