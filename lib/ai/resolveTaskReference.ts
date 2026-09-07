import type { Task, TaskCategory } from "@/types/task";

export type TaskReferenceResult =
  | { status: "resolved"; taskId: string }
  | { status: "ambiguous"; candidates: Task[] }
  | { status: "none" };

const CATEGORY_KEYWORDS: Record<TaskCategory, RegExp> = {
  school: /\bschool\b/i,
  work: /\bwork\b/i,
  personal: /\bpersonal\b/i,
  other: /\bother\b/i,
};

function titleMatches(text: string, task: Task): boolean {
  const lower = text.toLowerCase();
  return lower.includes(task.title.toLowerCase()) || task.title.toLowerCase().includes(lower.trim());
}

function findTitleWordOverlap(text: string, task: Task): boolean {
  const words = task.title.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

// Disambiguation order per spec: current task -> recently mentioned -> title
// match -> category match (ambiguous) -> none (ask). Never silently edits a
// random task.
export function resolveTaskReference(
  text: string,
  ctx: { currentTaskId?: string; recentTaskIds: string[]; tasks: Task[] },
): TaskReferenceResult {
  const pending = ctx.tasks.filter((task) => task.status === "pending");

  const explicitMatches = pending.filter((task) => titleMatches(text, task));
  if (ctx.currentTaskId && (explicitMatches.length === 0 || explicitMatches.some((t) => t.id === ctx.currentTaskId))) {
    if (pending.some((task) => task.id === ctx.currentTaskId)) {
      return { status: "resolved", taskId: ctx.currentTaskId };
    }
  }

  for (const id of ctx.recentTaskIds) {
    const task = pending.find((candidate) => candidate.id === id);
    if (task && titleMatches(text, task)) return { status: "resolved", taskId: task.id };
  }

  if (explicitMatches.length === 1) return { status: "resolved", taskId: explicitMatches[0].id };
  if (explicitMatches.length > 1) return { status: "ambiguous", candidates: explicitMatches };

  const wordMatches = pending.filter((task) => findTitleWordOverlap(text, task));
  if (wordMatches.length === 1) return { status: "resolved", taskId: wordMatches[0].id };
  if (wordMatches.length > 1) return { status: "ambiguous", candidates: wordMatches };

  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS) as [TaskCategory, RegExp][]) {
    if (pattern.test(text)) {
      const candidates = pending.filter((task) => task.category === category);
      if (candidates.length === 1) return { status: "resolved", taskId: candidates[0].id };
      if (candidates.length > 1) return { status: "ambiguous", candidates };
    }
  }

  return { status: "none" };
}
