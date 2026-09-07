import { parseDatePhrase } from "@/lib/ai/parseDate";
import type { ExtractedTaskDraft } from "@/lib/ai/types";
import type { TaskCategory } from "@/types/task";

const CATEGORY_KEYWORDS: Record<Exclude<TaskCategory, "other">, RegExp> = {
  school: /\b(study|exam|class|homework|essay|assignment|professor|quiz|lecture|chapters?)\b/i,
  work: /\b(report|meeting|client|proposal|presentation|deadline at work|boss|invoice)\b/i,
  personal: /\b(gym|grocery|groceries|call|dentist|doctor|clean|workout|errand|family)\b/i,
};

const LONG_TASK_KEYWORDS = /\b(write|study|prepare|build|plan|research|essay|report|presentation)\b/i;

const DEFAULT_MINUTES = 30;
const LONG_TASK_MINUTES = 60;

function guessCategory(text: string): TaskCategory {
  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS) as [
    Exclude<TaskCategory, "other">,
    RegExp,
  ][]) {
    if (pattern.test(text)) return category;
  }
  return "other";
}

function guessDuration(text: string): number {
  return LONG_TASK_KEYWORDS.test(text) ? LONG_TASK_MINUTES : DEFAULT_MINUTES;
}

function cleanTitle(fragment: string): string {
  return fragment
    .replace(/^(and|then|also|plus)\s+/i, "")
    .replace(/^i\s+(need|have|want|got)\s+to\s+/i, "")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

// Splits a brain-dump message into individual task drafts. Deliberately
// simple sentence/keyword splitting, not general NLU.
export function extractTasks(text: string): ExtractedTaskDraft[] {
  const fragments = text
    .split(/\n|,| and then | and |;/i)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 2);

  return fragments.map((fragment) => ({
    title: cleanTitle(fragment),
    category: guessCategory(fragment),
    estimatedMinutes: guessDuration(fragment),
    dueDate: parseDatePhrase(fragment),
  }));
}
