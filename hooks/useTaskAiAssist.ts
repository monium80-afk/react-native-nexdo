import { useRef, useState } from "react";

import { generateAdvice, type TaskAdvice } from "@/lib/ai/generateAdvice";
import { suggestBreakdown } from "@/lib/ai/suggestBreakdown";
import { useCategoryStore } from "@/store/useCategoryStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task } from "@/types/task";

export type AiRequest<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error" };

/**
 * On-demand AI help for one task in a running session:
 * - advice: temporary UI state, shown under the task title;
 * - breakdown: the AI's steps replace the task's unfinished ones (finished
 *   steps stay checked off), and "Regenerate" asks for a different split.
 */
export function useTaskAiAssist(task: Task, availableMinutes?: number) {
  const categories = useCategoryStore((state) => state.categories);
  const replaceRemainingSteps = useTaskStore((state) => state.replaceRemainingSteps);

  const [advice, setAdvice] = useState<AiRequest<TaskAdvice>>({ status: "idle" });
  const [breakdownStatus, setBreakdownStatus] = useState<"idle" | "loading" | "error">("idle");

  // Bumped by every new request and every dismiss, so a slow response for a
  // request the user has already replaced or closed is simply dropped.
  const adviceRequestId = useRef(0);
  const breakdownRequestId = useRef(0);

  const requestAdvice = async () => {
    const requestId = ++adviceRequestId.current;
    setAdvice({ status: "loading" });
    // generateAdvice never throws — it falls back to heuristic advice offline.
    const result = await generateAdvice(task, categories, availableMinutes);
    if (requestId !== adviceRequestId.current) return;
    setAdvice(result.headline || result.detail ? { status: "ready", data: result } : { status: "error" });
  };

  const dismissAdvice = () => {
    adviceRequestId.current += 1;
    setAdvice({ status: "idle" });
  };

  const regenerateBreakdown = async () => {
    const requestId = ++breakdownRequestId.current;
    setBreakdownStatus("loading");
    try {
      // The task's current unfinished steps go along with the request, so the
      // AI proposes a different split rather than the same one again.
      const steps = await suggestBreakdown(task, categories, { availableMinutes });
      if (requestId !== breakdownRequestId.current) return;
      if (steps.length === 0) {
        setBreakdownStatus("error");
        return;
      }
      replaceRemainingSteps(task.id, steps);
      setBreakdownStatus("idle");
    } catch (error) {
      console.warn("[useTaskAiAssist] breakdown failed", error);
      if (requestId === breakdownRequestId.current) setBreakdownStatus("error");
    }
  };

  const cancelBreakdown = () => {
    breakdownRequestId.current += 1;
    setBreakdownStatus("idle");
  };

  return { advice, requestAdvice, dismissAdvice, breakdownStatus, regenerateBreakdown, cancelBreakdown };
}
