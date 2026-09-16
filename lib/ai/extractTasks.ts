import { parseDatePhrase } from "@/lib/ai/parseDate";
import type { ExtractedTaskDraft } from "@/lib/ai/types";
import type { BuiltInCategoryId, TaskPriorityLevel } from "@/types/task";

const CATEGORY_KEYWORDS: Record<Exclude<BuiltInCategoryId, "other">, RegExp> = {
  school:
    /\b(study|studying|exam|midterm|finals?|class|homework|essay|assignment|professor|quiz|lecture|chapters?|revision|thesis|dissertation|course|semester|lab report|coursework|school)\b/i,
  work: /\b(report|meeting|client|proposal|presentation|slides|boss|invoice|standup|stand-up|deploy|ticket|sprint|colleague|interview|onboarding|payroll|contract|work)\b/i,
  personal:
    /\b(gym|workout|run|groceries|grocery|shopping|call|dentist|doctor|appointment|clean|cleaning|tidy|vacuum|laundry|dishes|trash|garbage|bins|cook|dinner|lunch|house|home|apartment|room|kitchen|garden|car|bank|errand|family|mom|mum|dad|birthday|pet|dog|cat|haircut|pharmacy|rent|bills?)\b/i,
};

const LONG_TASK_KEYWORDS = /\b(write|study|prepare|build|plan|research|essay|report|presentation|thesis|revise|design)\b/i;
const QUICK_TASK_KEYWORDS = /\b(call|email|text|book|order|pay|send|reply|buy|pick up|drop off|check|confirm)\b/i;

const HIGH_PRIORITY_KEYWORDS = /\b(urgent|urgently|asap|immediately|critical|important|emergency|overdue|exam|midterm|finals?|interview|deadline)\b/i;
const LOW_PRIORITY_KEYWORDS = /\b(someday|eventually|whenever|sometime|no rush|not urgent|if i have time|maybe|at some point)\b/i;

const DEFAULT_MINUTES = 30;
const LONG_TASK_MINUTES = 60;
const QUICK_TASK_MINUTES = 15;

// Scaffolding people put in front of the actual task. Stripped so the title
// is what they need to do, never the instruction that introduced it —
// "add work tomorrow" is a task called "Work", not "Add work tomorrow".
const COMMAND_PREFIX_PATTERN =
  /^\s*(?:(?:hey|ok|okay|please|pls)\s+)?(?:can you\s+|could you\s+|would you\s+)?(?:add|create|make|set up|new task|task|remind me|remember)\b[:,\s]*(?:an?\s+|the\s+)?(?:task\s+)?(?:to\s+|for\s+|about\s+|that\s+)?/i;
const OBLIGATION_PREFIX_PATTERN = /^\s*(?:i\s+)?(?:need to|needs to|have to|has to|want to|gotta|got to|must|should)\s+/i;
// Urgency markers belong in priorityLevel (read off the raw fragment), not
// in the title — "urgent: send the proposal" is a task called "Send the
// proposal".
const PRIORITY_PREFIX_PATTERN = /^\s*(?:urgent|urgently|important|asap|high priority|priority)\b[:,\-\s]*/i;

// Deadline wording, removed from the title once parseDatePhrase has already
// read it off the original text — it belongs in dueDate, not in the name.
const RELATIVE_DAY = String.raw`day after tom+or+ow|tom+or+ow|yesterday|today|tonight|this (?:morning|afternoon|evening|weekend)|next (?:week|month|weekend)|last (?:week|month)|this week|end of (?:the )?(?:week|month)|in (?:the next )?\w+ (?:day|week|month|hour|minute)s?|\w+ (?:day|week|month|hour)s? ago|(?:next |last |this )?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)|asap`;
const CLOCK = String.raw`\d{1,2}(?::\d{2})?\s*(?:am|pm)|at\s+\d{1,2}(?::\d{2})?|noon|midnight`;
const VAGUE_TIMING = String.raw`sometime|someday|eventually|whenever|at some point|no rush`;
const DATE_PHRASE_PATTERN = new RegExp(
  String.raw`\s*\b(?:by|on|before|due|until|till|for|at)?\s*(?:${RELATIVE_DAY}|${CLOCK}|${VAGUE_TIMING})\b`,
  "gi",
);

// A clause continuing the previous one ("..., it was due last week") is not
// a second task — splitting on commas turns it into one otherwise.
const CONTINUATION_PATTERN = /^\s*(?:it|its|it's|that|this|they|these|those|he|she|which|who|but|so)\b/i;

// A question is a query about existing tasks, not a new one — unless it
// also carries an explicit add verb ("can you add milk to my list").
const QUESTION_PATTERN =
  /^\s*(what|when|where|why|how|who|which|is|are|am|do|does|did|can|could|should|would|will|has|have)\b/i;
const EXPLICIT_ADD_PATTERN = /\b(add|create|remind me|new task|put)\b/i;
const CHITCHAT_PATTERN = /^\s*(hi|hey|hello|yo|thanks|thank you|ok|okay|cool|nice|sure|yes|no|nope|yep|help)\b[\s!.?]*$/i;

function guessCategory(text: string): BuiltInCategoryId {
  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS) as [
    Exclude<BuiltInCategoryId, "other">,
    RegExp,
  ][]) {
    if (pattern.test(text)) return category;
  }
  return "other";
}

// Exported so app/api/inbox+api.ts can fill the same gaps when the model
// leaves a field out.
export function guessDuration(text: string): number {
  if (LONG_TASK_KEYWORDS.test(text)) return LONG_TASK_MINUTES;
  if (QUICK_TASK_KEYWORDS.test(text)) return QUICK_TASK_MINUTES;
  return DEFAULT_MINUTES;
}

// Importance only — the deadline is scored separately as urgency in
// lib/scoring.ts, so it must not leak in here too.
export function guessPriorityLevel(text: string): TaskPriorityLevel {
  if (HIGH_PRIORITY_KEYWORDS.test(text)) return "high";
  if (LOW_PRIORITY_KEYWORDS.test(text)) return "low";
  return "medium";
}

function cleanTitle(fragment: string): string {
  const stripped = fragment
    .replace(PRIORITY_PREFIX_PATTERN, "")
    .replace(COMMAND_PREFIX_PATTERN, "")
    .replace(OBLIGATION_PREFIX_PATTERN, "")
    .replace(/^(and|then|also|plus)\s+/i, "")
    .trim();

  const withoutDates = stripped.replace(DATE_PHRASE_PATTERN, " ").replace(/\s{2,}/g, " ").trim();
  // Removing the deadline can consume the whole fragment ("tomorrow") — in
  // that case the wording itself is all the user gave us, so keep it.
  const base = withoutDates.length >= 2 ? withoutDates : stripped;

  return base
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, "")
    .replace(/^./, (char) => char.toUpperCase());
}

function looksLikeTask(fragment: string): boolean {
  if (fragment.trim().length < 2) return false;
  if (!/[a-z]/i.test(fragment)) return false;
  if (CHITCHAT_PATTERN.test(fragment)) return false;
  if (CONTINUATION_PATTERN.test(fragment)) return false;
  if ((QUESTION_PATTERN.test(fragment) || /\?\s*$/.test(fragment)) && !EXPLICIT_ADD_PATTERN.test(fragment)) {
    return false;
  }
  return true;
}

// Splits a brain-dump message into individual task drafts. Deliberately
// simple sentence/keyword splitting, not general NLU — this is the offline
// fallback for when /api/inbox can't be reached.
export function extractTasks(text: string, now: Date = new Date()): ExtractedTaskDraft[] {
  const fragments = text
    .split(/\n|,| and then | and |;/i)
    .map((fragment) => fragment.trim())
    .filter(looksLikeTask);

  return fragments
    .map((fragment) => {
      // With a single task in the message, a deadline anywhere in it belongs
      // to that task — including in a clause dropped as a continuation
      // ("pay the electricity bill, it was due last week").
      const dueDate = parseDatePhrase(fragment, now) ?? (fragments.length === 1 ? parseDatePhrase(text, now) : undefined);
      const title = cleanTitle(fragment);
      return {
        title,
        category: guessCategory(fragment),
        estimatedMinutes: guessDuration(fragment),
        dueDate,
        priorityLevel: guessPriorityLevel(fragment),
      };
    })
    .filter((draft) => draft.title.length > 0);
}
