import { formatDuration } from "@/lib/formatDuration";
import { getDueInfo } from "@/lib/taskMeta";
import type { PlanningStyle } from "@/types/settings";
import type { Task } from "@/types/task";

// Advice is never stored on the task — it's always derived here at read time
// from the task + the user's planning-style setting, so it can never go
// stale relative to a task edit or a settings change.
export function generateAdvice(task: Task, planningStyle: PlanningStyle, now: Date = new Date()): string {
  const currentSubtask = task.subtasks?.find((subtask) => subtask.status === "current");
  const remainingCount = task.subtasks?.filter((subtask) => subtask.status !== "completed").length ?? 0;

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
