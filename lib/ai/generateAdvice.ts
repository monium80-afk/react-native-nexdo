import type { NextResponseBody } from "@/app/api/next+api";
import { taskToContext } from "@/lib/ai/context";
import { apiPost } from "@/lib/api";
import { formatDuration } from "@/lib/formatDuration";
import type { Category } from "@/types/category";
import type { Task } from "@/types/task";

/** A short, bold takeaway plus the reasoning behind it — shown as two lines of different weight. */
export type TaskAdvice = { headline: string; detail: string };

export function adviceToText(advice: TaskAdvice): string {
  return `${advice.headline} ${advice.detail}`.trim();
}

// Layer B (Execution Coach) — see data/aiPrompts.ts and app/api/next+api.ts.
// Falls back to the heuristic advice below on any network/parse failure.
export async function generateAdvice(task: Task, categories: Category[], availableMinutes?: number): Promise<TaskAdvice> {
  try {
    const existingPlan = (task.subtasks ?? []).map((subtask) => ({
      id: subtask.id,
      title: subtask.label,
      estimatedMinutes: subtask.estimatedMinutes,
      status: subtask.status,
    }));
    const result = await apiPost<NextResponseBody>("/api/next", {
      task: taskToContext(task, categories),
      existingPlan,
      availableMinutes,
    });
    return { headline: result.advice.trim(), detail: result.explanation.trim() };
  } catch (error) {
    console.warn("[generateAdvice] falling back to heuristic", error);
    return generateAdviceHeuristic(task);
  }
}

// Heuristic fallback — was the only implementation before Layer B existed.
// Advice here is derived at read time from the task, so it can never go
// stale relative to a task edit.
function generateAdviceHeuristic(task: Task): TaskAdvice {
  const currentSubtask = task.subtasks?.find((subtask) => subtask.status === "current");

  const headline = currentSubtask
    ? `Do this now: ${currentSubtask.label} (~${formatDuration(currentSubtask.estimatedMinutes)}).`
    : `Just do it — ${task.title} should take about ${formatDuration(task.estimatedMinutes)}.`;

  const urgencyPhrase =
    task.priorityScore >= 85
      ? "this is one of your most urgent tasks"
      : task.priorityScore >= 60
        ? "this is worth tackling soon"
        : "there's no rush, but it's on your list";

  return { headline, detail: `Priority score ${task.priorityScore}/100 — ${urgencyPhrase}.` };
}
