import type { Task, TaskPriorityLevel } from "@/types/task";

// Maps the Add form's 3-card priority picker to the "importance" input the
// scoring engine actually runs on (Step 2 of the prioritization logic).
export const PRIORITY_LEVEL_IMPORTANCE: Record<TaskPriorityLevel, number> = {
  high: 75,
  medium: 50,
  low: 25,
};

const URGENCY_WEIGHT = 0.4;
const IMPORTANCE_WEIGHT = 0.3;
const OVERDUE_POINTS_PER_DAY = 20;
const OVERDUE_MAX_POINTS = 30;
const DEPENDENT_POINTS_EACH = 15;
const DEPENDENT_MAX_POINTS = 100;
const AGE_MAX_POINTS = 15;
const QUICK_TASK_MINUTES = 10;
const QUICK_TASK_MULTIPLIER = 1.08;
const LONG_TASK_MINUTES = 120;
const LONG_TASK_MULTIPLIER = 0.96;

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

// Step 1 — urgency from the deadline alone.
export function computeUrgencyScore(dueDate: string | undefined, now: Date): number {
  const days = daysUntil(dueDate, now);
  if (days === null) return 15; // no deadline
  if (days < 0) return 100; // overdue
  if (days === 0) return 95; // due today
  if (days === 1) return 85; // due tomorrow
  if (days <= 3) return 65;
  if (days <= 7) return 40;
  return 15;
}

// Step 4 — +20 per day overdue, capped.
function computeOverdueBoost(dueDate: string | undefined, now: Date): number {
  const days = daysUntil(dueDate, now);
  if (days === null || days >= 0) return 0;
  return Math.min(OVERDUE_MAX_POINTS, Math.abs(days) * OVERDUE_POINTS_PER_DAY);
}

// Step 5 — +15 per task that depends on this one, capped.
function computeDependentBoost(dependentCount: number): number {
  return Math.min(DEPENDENT_MAX_POINTS, dependentCount * DEPENDENT_POINTS_EACH);
}

// Step 6 — +1 per day since it was created, capped.
function computeAgeBoost(createdAt: string | undefined, now: Date): number {
  if (!createdAt) return 0;
  const days = Math.floor((now.getTime() - new Date(createdAt).getTime()) / DAY_MS);
  return clamp(days, 0, AGE_MAX_POINTS);
}

// Step 8 — a small nudge for very quick or very long tasks.
function durationMultiplier(estimatedMinutes: number): number {
  if (estimatedMinutes <= QUICK_TASK_MINUTES) return QUICK_TASK_MULTIPLIER;
  if (estimatedMinutes > LONG_TASK_MINUTES) return LONG_TASK_MULTIPLIER;
  return 1;
}

// createdAt is optional so a draft that hasn't been saved yet (see
// TaskConfirmationCard) can be previewed with the same formula.
export function computePriorityScore(
  task: Pick<Task, "dueDate" | "estimatedMinutes" | "importance"> & Partial<Pick<Task, "createdAt">>,
  now: Date = new Date(),
): number {
  // Tasks have no links to other tasks yet, so nothing depends on anything.
  // Subtasks are deliberately not counted: every medium/complex task gets an
  // auto-generated 3-step plan, which would add +45 to almost every task.
  const dependentCount = 0;

  // Steps 3 + 7 — weighted urgency and importance, plus the boosts.
  const rawScore =
    URGENCY_WEIGHT * computeUrgencyScore(task.dueDate, now) +
    IMPORTANCE_WEIGHT * task.importance +
    computeOverdueBoost(task.dueDate, now) +
    computeDependentBoost(dependentCount) +
    computeAgeBoost(task.createdAt, now);

  return Math.round(clamp(rawScore * durationMultiplier(task.estimatedMinutes)));
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
