import type { Task, TaskPriorityLevel } from "@/types/task";

// Maps the Add form's 3-card priority picker to the "importance" input the
// scoring engine actually runs on.
export const PRIORITY_LEVEL_IMPORTANCE: Record<TaskPriorityLevel, number> = {
  high: 85,
  medium: 60,
  low: 25,
};

// Weights are hand-picked starting points, not tuned/learned — easy to adjust here.
const URGENCY_WEIGHT = 0.35;
const OVERDUE_WEIGHT = 0.15;
const DURATION_PRESSURE_WEIGHT = 0.15;
const IMPORTANCE_WEIGHT = 0.35;

const NEXT_PRIORITY_WEIGHT = 0.7;
const NEXT_SUITABILITY_WEIGHT = 0.3;

const SKIP_SUPPRESSION_HOURS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Mirrors lib/taskMeta.ts's getDueInfo day-diff math so scores and displayed
// due labels always agree on "how many days away is this".
function daysUntil(dueDate: string | undefined, now: Date): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  return Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function computeUrgencyFactor(dueDate: string | undefined, now: Date): number {
  const days = daysUntil(dueDate, now);
  if (days === null) return 20; // no deadline: low-medium baseline, not zero
  if (days < 0) return 100; // overdue
  if (days === 0) return 90; // due today
  if (days === 1) return 80; // due tomorrow
  if (days <= 3) return 65;
  if (days <= 6) return 50;
  if (days <= 13) return 35;
  return 15;
}

export function computeOverdueFactor(dueDate: string | undefined, now: Date): number {
  const days = daysUntil(dueDate, now);
  if (days === null || days >= 0) return 0;
  return clamp(40 + Math.abs(days) * 15);
}

export function computeDurationPressureFactor(
  estimatedMinutes: number,
  dueDate: string | undefined,
  now: Date,
): number {
  const days = daysUntil(dueDate, now);
  if (days === null) return 30;
  if (days < 0) return 100;
  const hoursUntilDue = Math.max(1, days * 24);
  return clamp((estimatedMinutes / (hoursUntilDue * 60)) * 100);
}

export function computePriorityScore(
  task: Pick<Task, "dueDate" | "estimatedMinutes" | "importance">,
  now: Date = new Date(),
): number {
  const urgency = computeUrgencyFactor(task.dueDate, now);
  const overdue = computeOverdueFactor(task.dueDate, now);
  const duration = computeDurationPressureFactor(task.estimatedMinutes, task.dueDate, now);

  const score =
    URGENCY_WEIGHT * urgency +
    OVERDUE_WEIGHT * overdue +
    DURATION_PRESSURE_WEIGHT * duration +
    IMPORTANCE_WEIGHT * task.importance;

  return Math.round(clamp(score));
}

// Complexity affects suitability, not priority — a hard task isn't less
// important, just less doable in a random open slot.
export function computeSuitabilityScore(
  task: Pick<Task, "complexity" | "estimatedMinutes" | "skip">,
  now: Date = new Date(),
): number {
  const complexityPenalty = { simple: 0, medium: 15, complex: 30 }[task.complexity];
  const durationAdj =
    task.estimatedMinutes <= 20 ? 10 : task.estimatedMinutes <= 60 ? 0 : task.estimatedMinutes <= 120 ? -10 : -20;

  let suppressionPenalty = 0;
  if (task.skip) {
    const skippedAt = new Date(task.skip.skippedAt).getTime();
    const suppressUntil = new Date(task.skip.suppressUntil).getTime();
    if (now.getTime() < suppressUntil) {
      const remainingRatio = (suppressUntil - now.getTime()) / (suppressUntil - skippedAt);
      suppressionPenalty = 70 * clamp(remainingRatio, 0, 1);
    }
  }

  return Math.round(clamp(100 - complexityPenalty + durationAdj - suppressionPenalty));
}

export function createSkipRecord(reason: string, now: Date = new Date()): Task["skip"] {
  const suppressUntil = new Date(now.getTime() + SKIP_SUPPRESSION_HOURS * 60 * 60 * 1000);
  return { reason, skippedAt: now.toISOString(), suppressUntil: suppressUntil.toISOString() };
}

export function recalcTask(task: Task, now: Date = new Date()): Task {
  return {
    ...task,
    priorityScore: computePriorityScore(task, now),
    suitabilityScore: computeSuitabilityScore(task, now),
  };
}

// "Most important vs. most doable right now" — the Next-page rank.
export function rankTasksForNext(tasks: Task[], now: Date = new Date()): Task[] {
  return tasks
    .filter((task) => task.status === "pending")
    .map((task) => recalcTask(task, now))
    .sort(
      (a, b) =>
        (b.priorityScore * NEXT_PRIORITY_WEIGHT + b.suitabilityScore * NEXT_SUITABILITY_WEIGHT) -
        (a.priorityScore * NEXT_PRIORITY_WEIGHT + a.suitabilityScore * NEXT_SUITABILITY_WEIGHT),
    );
}
