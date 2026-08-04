import { useContext } from "react";
import { ToastContext } from "@/components/ui/toast-context";

/** Kept apart from the provider so fast refresh works on both. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>.");
  return ctx;
}
