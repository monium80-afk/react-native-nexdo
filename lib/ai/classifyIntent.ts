import { extractTasks } from "@/lib/ai/extractTasks";
import { parseDatePhrase } from "@/lib/ai/parseDate";
import { resolveTaskReference } from "@/lib/ai/resolveTaskReference";
import type { StructuredAction } from "@/lib/ai/types";
import { rankTasksForNext } from "@/lib/scoring";
import type { Task } from "@/types/task";

export type ClassifyIntentInput = {
  text: string;
  now: Date;
  currentTaskId?: string;
  recentTaskIds: string[];
  tasks: Task[];
};

const DELETE_PATTERN = /\b(delete|remove|cancel)\b/i;
const ALREADY_DID_PATTERN = /\balready (did|finished|completed|done|started)\b/i;
const DONE_PATTERN = /\b(finished|done|complete[d]?)\b/i;
const RESCHEDULE_PATTERN = /\b(move|reschedule|push|delay|change.*(deadline|due))\b/i;
const SKIP_PATTERN = /\b(skip|not now|something else|show another|can'?t do this now)\b/i;
const CONSTRAINT_PATTERN = /\b(only have|can'?t finish|don'?t have|no time|not enough time)\b/i;
const WHAT_NEXT_PATTERN = /\bwhat (should i do|next|now)\b|\bwhat'?s next\b/i;
const NEW_TASK_HINT_PATTERN = /\b(need to|have to|remind me|gotta|must)\b/i;

function askWhich(candidates: Task[]): StructuredAction {
  const titles = candidates.map((task) => task.title).join(", ");
  return {
    type: "CLARIFY",
    question: `Which one do you mean: ${titles}?`,
    candidates,
    confirmationTier: "safe",
  };
}

// Ordered keyword/regex rules standing in for a real LLM intent classifier.
// Order matters — more specific/destructive intents are checked first so a
// message like "delete the essay, it's already done" resolves to delete.
export function classifyIntent(input: ClassifyIntentInput): StructuredAction {
  const { text, now, currentTaskId, recentTaskIds, tasks } = input;
  const referenceCtx = { currentTaskId, recentTaskIds, tasks };

  if (DELETE_PATTERN.test(text)) {
    const ref = resolveTaskReference(text, referenceCtx);
    if (ref.status === "resolved") return { type: "DELETE_TASK", taskId: ref.taskId, confirmationTier: "confirm-required" };
    if (ref.status === "ambiguous") return askWhich(ref.candidates);
    return { type: "UNKNOWN", reply: "Which task should I delete?", confirmationTier: "safe" };
  }

  if (ALREADY_DID_PATTERN.test(text) && currentTaskId) {
    return { type: "ADD_TASK_CONTEXT", taskId: currentTaskId, note: text, confirmationTier: "safe" };
  }

  if (DONE_PATTERN.test(text)) {
    const ref = resolveTaskReference(text, referenceCtx);
    if (ref.status === "resolved") return { type: "COMPLETE_TASK", taskId: ref.taskId, confirmationTier: "immediate" };
    if (ref.status === "ambiguous") return askWhich(ref.candidates);
  }

  if (RESCHEDULE_PATTERN.test(text)) {
    const ref = resolveTaskReference(text, referenceCtx);
    const newDueDate = parseDatePhrase(text, now);
    if (ref.status === "resolved") {
      return { type: "RESCHEDULE_TASK", taskId: ref.taskId, newDueDate, confirmationTier: "immediate" };
    }
    if (ref.status === "ambiguous") return askWhich(ref.candidates);
  }

  if (SKIP_PATTERN.test(text)) {
    const ref = currentTaskId
      ? { status: "resolved" as const, taskId: currentTaskId }
      : resolveTaskReference(text, referenceCtx);
    if (ref.status === "resolved") return { type: "SKIP_TASK", taskId: ref.taskId, reason: text, confirmationTier: "safe" };
    if (ref.status === "ambiguous") return askWhich(ref.candidates);
  }

  if (CONSTRAINT_PATTERN.test(text) && currentTaskId) {
    return { type: "ADD_TASK_CONTEXT", taskId: currentTaskId, note: text, confirmationTier: "safe" };
  }

  if (WHAT_NEXT_PATTERN.test(text)) {
    const top = rankTasksForNext(tasks, now)[0];
    const answer = top
      ? `Your best next move is "${top.title}" — priority score ${top.priorityScore}.`
      : "You're all caught up — nothing pending right now.";
    return { type: "QUERY", answer, confirmationTier: "safe" };
  }

  const ref = resolveTaskReference(text, referenceCtx);
  if (ref.status === "none" && (NEW_TASK_HINT_PATTERN.test(text) || text.trim().split(/\s+/).length >= 3)) {
    const drafts = extractTasks(text);
    if (drafts.length > 0) return { type: "CREATE_TASK", drafts, confirmationTier: "confirm-required" };
  }
  if (ref.status === "ambiguous") return askWhich(ref.candidates);

  return {
    type: "UNKNOWN",
    reply: "I'm not sure what you'd like me to do with that — try mentioning a task by name.",
    confirmationTier: "safe",
  };
}
