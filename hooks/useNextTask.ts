import { useMemo } from "react";

import { generateAdvice } from "@/lib/ai/generateAdvice";
import { posthog } from "@/lib/posthog";
import { rankTasksForNext } from "@/lib/scoring";
import { useTaskStore } from "@/store/useTaskStore";
import type { PlanningStyle } from "@/types/settings";

const SKIP_REASONS: { label: string; value: string }[] = [
  { label: "Not enough time", value: "Not enough time right now." },
  { label: "Too difficult right now", value: "Too difficult to focus on right now." },
  { label: "Can't do it here", value: "Can't do this task in my current location." },
  { label: "Need something easier", value: "I need something easier right now." },
];

export function useNextTask(planningStyle: PlanningStyle) {
  const tasks = useTaskStore((state) => state.tasks);
  const skipTask = useTaskStore((state) => state.skipTask);
  const task = useMemo(() => rankTasksForNext(tasks)[0], [tasks]);
  const advice = useMemo(
    () => (task ? generateAdvice(task, planningStyle) : ""),
    [task, planningStyle],
  );

  const handleSkip = (reason: string) => {
    if (!task) return;
    posthog.capture("task_skipped", {
      task_id: task.id,
      task_category: task.category,
      priority_score: task.priorityScore,
      reason,
    });
    skipTask(task.id, reason);
  };

  return { task, advice, handleSkip, skipReasons: SKIP_REASONS };
}