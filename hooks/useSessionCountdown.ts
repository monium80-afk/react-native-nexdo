import { useEffect, useState } from "react";

import { formatClock } from "@/lib/formatDuration";
import { sessionElapsedMs, type ActiveSession } from "@/store/useSessionStore";

/**
 * Compact budget label for the caption beside the clock — "45m", "1h 30m".
 * Deliberately terser than formatDuration()'s "45 mins": it sits next to a
 * 38px numeral and has to stay out of its way.
 */
function formatBudget(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export type SessionCountdown = {
  /** `MM:SS` remaining, or `+MM:SS` once the budget is spent. */
  clock: string;
  /** Caption beside the clock, e.g. "remaining of 45m". */
  caption: string;
  /** 0–1, for the progress bar. Clamped at 1 in overtime. */
  progress: number;
  isRunning: boolean;
  isOvertime: boolean;
};

/**
 * Re-renders once a second while the session is running so the readout
 * stays live. The elapsed value itself comes from the store's wall-clock
 * math (see sessionElapsedMs) — this hook only decides *when* to re-read it,
 * which is why pausing can simply stop the interval.
 */
export function useSessionCountdown(session: ActiveSession | null): SessionCountdown {
  const runningSince = session?.runningSince ?? null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Re-sync immediately on resume: `now` is stale from before the pause.
    setNow(Date.now());
    if (runningSince === null) return;

    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [runningSince]);

  const totalMs = (session?.plannedMinutes ?? 0) * 60_000;
  const elapsedMs = session ? sessionElapsedMs(session, now) : 0;
  const remainingMs = totalMs - elapsedMs;
  const isOvertime = remainingMs <= 0;
  const budgetLabel = formatBudget(session?.plannedMinutes ?? 0);

  return {
    clock: isOvertime ? `+${formatClock(-remainingMs)}` : formatClock(remainingMs),
    caption: isOvertime ? `over your ${budgetLabel}` : `remaining of ${budgetLabel}`,
    progress: totalMs === 0 ? 0 : Math.min(elapsedMs / totalMs, 1),
    isRunning: runningSince !== null,
    isOvertime,
  };
}
