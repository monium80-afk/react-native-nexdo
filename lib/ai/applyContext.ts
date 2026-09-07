import type { Subtask, Task } from "@/types/task";

export type ContextApplyResult = {
  updatedSubtasks?: Subtask[];
  updatedEstimatedMinutes?: number;
  newDueDate?: string;
  noteToStore: string;
};

const CAPACITY_PATTERN = /only have (\d+)\s*(minutes?|mins?|hours?|hrs?)/i;
const CANT_FINISH_PATTERN = /can'?t finish/i;

function toMinutes(amount: number, unit: string): number {
  return /hour|hr/i.test(unit) ? amount * 60 : amount;
}

// Reorders the remaining subtasks smallest-first so the current step fits
// inside the stated capacity window.
function reorderForCapacity(subtasks: Subtask[]): Subtask[] {
  const completed = subtasks.filter((subtask) => subtask.status === "completed");
  const remaining = [...subtasks.filter((subtask) => subtask.status !== "completed")].sort(
    (a, b) => a.estimatedMinutes - b.estimatedMinutes,
  );

  const reorderedRemaining = remaining.map((subtask, index) => ({
    ...subtask,
    order: completed.length + index,
    status: index === 0 ? ("current" as const) : ("pending" as const),
  }));

  return [...completed, ...reorderedRemaining].sort((a, b) => a.order - b.order);
}

// This mock layer handles exactly two constraint shapes documented in the
// spec — a capacity statement and a "can't finish" deadline slip — not
// general NLU. Anything else just gets logged as a raw context note.
export function applyContextToTask(task: Task, note: string, now: Date = new Date()): ContextApplyResult {
  const capacityMatch = note.match(CAPACITY_PATTERN);
  if (capacityMatch && task.subtasks && task.subtasks.length > 0) {
    const capacityMinutes = toMinutes(Number.parseInt(capacityMatch[1], 10), capacityMatch[2]);
    return {
      updatedSubtasks: reorderForCapacity(task.subtasks),
      updatedEstimatedMinutes: Math.min(task.estimatedMinutes, capacityMinutes),
      noteToStore: note,
    };
  }

  if (CANT_FINISH_PATTERN.test(note)) {
    const base = task.dueDate ? new Date(task.dueDate) : new Date(now);
    base.setDate(base.getDate() + 1);
    return { newDueDate: base.toISOString(), noteToStore: note };
  }

  return { noteToStore: note };
}
