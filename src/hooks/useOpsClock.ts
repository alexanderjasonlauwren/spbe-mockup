import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { advanceOperations } from "@/mocks/rules";

/**
 * Drives the working day forward.
 *
 * Stands in for the events a real deployment would receive from drivers'
 * handhelds: queued drops start, running drops load cylinders, finished drops
 * raise their invoice. Mounted once by the layout so every page sees the same
 * clock.
 */
export function useOpsClock(intervalMs = 25_000) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled || document.hidden) return;
      const changed = advanceOperations();
      if (changed) queryClient.invalidateQueries();
    };

    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, queryClient]);
}
