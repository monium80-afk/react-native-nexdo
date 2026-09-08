import type { NextResponseBody } from "@/app/api/next+api";
import { taskToContext } from "@/lib/ai/context";
import { apiPost } from "@/lib/api";
import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo } from "@/lib/taskMeta";
import type { PlanningStyle } from "@/types/settings";
import type { Task } from "@/types/task";

// Composes the Layer B response into the tiered display copy the UI already
// expects — "how much detail to show" is an app/UI concern the execution
// coach prompt intentionally doesn't own (see EXECUTION_COACH_SYSTEM_PROMPT).
function composeAdvice(task: Task, planningStyle: PlanningStyle, result: NextResponseBody, now: Date): string {
  if (planningStyle === "minimal") return result.advice;
  if (planningStyle === "balanced") return `${result.advice} ${result.explanation}`.trim();

  const due = getDueInfo(task, now);
  const remainingSteps = result.plan.filter((step) => step.status !== "completed").length;
  const remainingPhrase = remainingSteps > 1 ? `${remainingSteps - 1} step${remainingSteps - 1 === 1 ? "" : "s"} left after this one. ` : "";
  return `${result.advice} ${result.explanation} ${remainingPhrase}${due.pillLabel}.`.replace(/\s+/g, " ").trim();
}

// Layer B (Execution Coach) — see data/aiPrompts.ts and app/api/next+api.ts.
// Falls back to the heuristic advice below on any network/parse failure.
export async function generateAdvice(
  task: Task,
  planningStyle: PlanningStyle,
  availableMinutes?: number,
  now: Date = new Date(),
): Promise<string> {
  try {
    const existingPlan = (task.subtasks ?? []).map((subtask) => ({
      id: subtask.id,
      title: subtask.label,
      estimatedMinutes: subtask.estimatedMinutes,
      status: subtask.status,
    }));
    const result = await apiPost<NextResponseBody>("/api/next", {
      task: taskToContext(task),
      existingPlan,
      availableMinutes,
    });
    return composeAdvice(task, planningStyle, result, now);
  } catch (error) {
    console.warn("[generateAdvice] falling back to heuristic", error);
    return generateAdviceHeuristic(task, planningStyle, now);
  }
}

// Heuristic fallback — was the only implementation before Layer B existed.
// Advice here is derived at read time from the task + planning-style
// setting, so it can never go stale relative to a task edit or settings change.
function generateAdviceHeuristic(task: Task, planningStyle: PlanningStyle, now: Date = new Date()): string {
  const currentSubtask = task.subtasks?.find((subtask) => subtask.status === "current");
  const remainingCount = task.subtasks?.filter(
    (subtask) => subtask.status !== "completed" && subtask.id !== currentSubtask?.id,
  ).length ?? 0;

  const headline = currentSubtask
    ? `Do this now: ${currentSubtask.label} (~${formatDuration(currentSubtask.estimatedMinutes)}).`
    : `Just do it — ${task.title} should take about ${formatDuration(task.estimatedMinutes)}.`;

  if (planningStyle === "minimal") return headline;

  const urgencyPhrase =
    task.priorityScore >= 85
      ? "this is one of your most urgent tasks"
      : task.priorityScore >= 60
        ? "this is worth tackling soon"
        : "there's no rush, but it's on your list";
  const reasoningSentence = `Priority score ${task.priorityScore}/100 — ${urgencyPhrase}.`;

  if (planningStyle === "balanced") return `${headline} ${reasoningSentence}`;

  const due = getDueInfo(task, now);
  const remainingPhrase =
    remainingCount > 0
      ? `${remainingCount} step${remainingCount === 1 ? "" : "s"} left after this one. `
      : "";
  return `${headline} ${reasoningSentence} ${remainingPhrase}${due.pillLabel}.`;
}
