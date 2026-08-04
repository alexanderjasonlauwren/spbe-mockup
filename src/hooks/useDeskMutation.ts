import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/useToast";
import type { ToastOptions } from "@/components/ui/toast-context";

/**
 * Every write in the console goes through here.
 *
 * Because all feature APIs read one shared store, a successful write can
 * invalidate everything: verifying a payment changes the finance page, the
 * dashboard's pending count, and the notification bell at once. It also gives
 * every action the same confirmation and failure voice.
 */
export function useDeskMutation<TArgs, TResult>({
  mutationFn,
  success,
  errorTitle = "Tindakan gagal",
  onDone,
  onFail,
}: {
  mutationFn: (args: TArgs) => Promise<TResult>;
  /** Confirmation copy. Use the past tense of the button that triggered it. */
  success?: string | ((result: TResult, args: TArgs) => ToastOptions);
  errorTitle?: string;
  onDone?: (result: TResult, args: TArgs) => void;
  onFail?: (error: Error, args: TArgs) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TResult, Error, TArgs>({
    mutationFn,
    onSuccess: (result, args) => {
      queryClient.invalidateQueries();
      if (typeof success === "string") {
        toast({ title: success, tone: "success" });
      } else if (success) {
        toast({ tone: "success", ...success(result, args) });
      }
      onDone?.(result, args);
    },
    onError: (error, args) => {
      toast({
        title: errorTitle,
        description: error.message,
        tone: "error",
      });
      onFail?.(error, args);
    },
  });
}
