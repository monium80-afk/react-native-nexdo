import { TASK_MANAGER_INTEGRATION_NOTES, TASK_MANAGER_SYSTEM_PROMPT } from "@/data/aiPrompts";
import type { TaskContext } from "@/lib/ai/context";
import { generateStructuredJson, type GeminiJsonSchema } from "@/lib/ai/gemini";
import { parseDatePhrase } from "@/lib/ai/parseDate";

export type InboxRequestBody = {
  message: string;
  now: string;
  currentTaskId?: string;
  recentTaskIds: string[];
  tasks: TaskContext[];
  history: { role: "user" | "ai"; text: string }[];
};

export type InboxActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "COMPLETE_TASK"
  | "DELETE_TASK"
  | "ADD_CONTEXT"
  | "BREAKDOWN_TASK"
  | "REDIRECT_NEXT"
  | "NONE";

export type InboxAction = {
  type: InboxActionType;
  taskId: string | null;
  fields: {
    title?: string;
    category?: string;
    estimatedMinutes?: number;
    dueDate?: string;
    note?: string;
    steps?: { title: string; estimatedMinutes: number }[];
    availableMinutes?: number;
  };
  confirmationRequired: boolean;
};

// Public contract (unchanged): the client always gets back one or more
// actions plus one combined reply, regardless of how many model calls it
// took to assemble that server-side.
export type InboxResponseBody = {
  intent: string;
  actions: InboxAction[];
  reply: string;
};

// Internal per-call contract. Asking the model to fully resolve a compound
// message ("actions": [...]) in one completion turned out to be unreliable
// for this model — it would occasionally run away narrating itself instead
// of answering. Asking it to resolve exactly ONE instruction and hand back
// whatever's left is a much easier task, and is what it's proven reliable
// at (see data/aiPrompts.ts EXAMPLES) — so a compound message is handled by
// looping this single-instruction call rather than by a bigger one-shot ask.
type SingleTurnResult = {
  intent: string;
  action: InboxAction;
  remainingMessage: string | null;
  reply: string;
};

const ACTION_TYPE_ENUM = ["CREATE_TASK", "UPDATE_TASK", "COMPLETE_TASK", "DELETE_TASK", "ADD_CONTEXT", "BREAKDOWN_TASK", "REDIRECT_NEXT", "NONE"];

const ACTION_SCHEMA: GeminiJsonSchema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ACTION_TYPE_ENUM },
    taskId: { type: "STRING", nullable: true },
    fields: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", nullable: true },
        category: { type: "STRING", enum: ["work", "school", "personal", "other"], nullable: true },
        estimatedMinutes: { type: "NUMBER", nullable: true },
        // Deliberately a free-text phrase, not a date type — see
        // APP INTEGRATION NOTES: the model must never compute the actual
        // calendar date itself (that's what broke it), just copy the
        // deadline phrase verbatim; normalizeAction() resolves it.
        dueDatePhrase: { type: "STRING", nullable: true },
        note: { type: "STRING", nullable: true },
        steps: {
          type: "ARRAY",
          nullable: true,
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              estimatedMinutes: { type: "NUMBER" },
            },
            required: ["title", "estimatedMinutes"],
          },
        },
        availableMinutes: { type: "NUMBER", nullable: true },
      },
    },
    confirmationRequired: { type: "BOOLEAN" },
  },
  required: ["type", "fields", "confirmationRequired"],
};

const SINGLE_TURN_SCHEMA: GeminiJsonSchema = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING" },
    action: ACTION_SCHEMA,
    remainingMessage: { type: "STRING", nullable: true },
    reply: { type: "STRING" },
  },
  required: ["intent", "action", "reply"],
};

const FALLBACK_RESPONSE: InboxResponseBody = {
  intent: "UNRELATED",
  actions: [{ type: "NONE", taskId: null, fields: {}, confirmationRequired: false }],
  reply: "Sorry, I'm having trouble reaching the AI right now — try again in a moment.",
};

// A compound message resolves over at most this many single-instruction
// turns — comfortably more than any realistic message describes, while
// bounding worst-case latency/cost if the model ever stalls on progress.
const MAX_TURNS = 4;

// Defensive boundary check: this model occasionally "thinks out loud"
// inside a string field instead of a title (e.g. "Pick up dry cleaning
// category: personal, estimatedMinutes: 15..."), which reads as a garbled
// task title if it slips through. A real title is short prose; reasoning
// leakage is long and littered with the schema's own field/enum names.
const LEAKED_REASONING_PATTERN = /\b(category|estimatedMinutes|dueDate|confirmationRequired|schema)\s*[:=]/i;

function sanitizeTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  if (title.length > 80 || LEAKED_REASONING_PATTERN.test(title)) return undefined;
  return title;
}

// now: resolves the model's raw dueDatePhrase ("Thursday", "tomorrow") into
// an actual ISO date deterministically — see the schema comment on
// dueDatePhrase for why the model never computes this itself.
function normalizeAction(raw: unknown, now: Date): InboxAction | null {
  if (!raw || typeof raw !== "object") return null;
  const action = raw as Partial<InboxAction>;
  const fields = action.fields;
  const rawFields = fields && typeof fields === "object" && !Array.isArray(fields) ? (fields as Record<string, unknown>) : {};

  const steps = Array.isArray(rawFields.steps)
    ? rawFields.steps
        .filter((step): step is { title: unknown; estimatedMinutes: unknown } => !!step && typeof step === "object")
        .map((step) => ({
          title: typeof step.title === "string" ? step.title : "",
          estimatedMinutes: typeof step.estimatedMinutes === "number" && Number.isFinite(step.estimatedMinutes) ? step.estimatedMinutes : 15,
        }))
        .filter((step) => step.title.length > 0)
    : undefined;

  const dueDatePhrase = typeof rawFields.dueDatePhrase === "string" ? rawFields.dueDatePhrase : undefined;

  return {
    type: (action.type as InboxActionType) ?? "NONE",
    taskId: typeof action.taskId === "string" ? action.taskId : null,
    fields: {
      title: sanitizeTitle(typeof rawFields.title === "string" ? rawFields.title : undefined),
      category: typeof rawFields.category === "string" ? rawFields.category : undefined,
      estimatedMinutes:
        typeof rawFields.estimatedMinutes === "number" && Number.isFinite(rawFields.estimatedMinutes) ? rawFields.estimatedMinutes : undefined,
      dueDate: dueDatePhrase ? parseDatePhrase(dueDatePhrase, now) : undefined,
      note: typeof rawFields.note === "string" ? rawFields.note : undefined,
      steps: steps && steps.length > 0 ? steps : undefined,
      availableMinutes:
        typeof rawFields.availableMinutes === "number" && Number.isFinite(rawFields.availableMinutes) ? rawFields.availableMinutes : undefined,
    },
    confirmationRequired: action.confirmationRequired === true,
  };
}

async function classifyOneInstruction(params: {
  message: string;
  now: string;
  currentTaskId?: string;
  recentTaskIds: string[];
  tasks: TaskContext[];
  history: { role: "user" | "ai"; text: string }[];
}): Promise<SingleTurnResult> {
  const result = await generateStructuredJson({
    systemPrompt: `${TASK_MANAGER_SYSTEM_PROMPT}\n\n${TASK_MANAGER_INTEGRATION_NOTES}`,
    userContent: JSON.stringify(params),
    responseSchema: SINGLE_TURN_SCHEMA,
  });
  const raw = result as Partial<SingleTurnResult>;
  const action = normalizeAction(raw.action, new Date(params.now)) ?? { type: "NONE", taskId: null, fields: {}, confirmationRequired: false };
  const remainingMessage =
    typeof raw.remainingMessage === "string" && raw.remainingMessage.trim().length > 0 ? raw.remainingMessage.trim() : null;

  return {
    intent: typeof raw.intent === "string" ? raw.intent : "UNKNOWN",
    action,
    remainingMessage,
    reply: typeof raw.reply === "string" ? raw.reply : "",
  };
}

// Last-resort recovery when the model chokes outright (a compound message
// occasionally makes it run away instead of answering, even framed as a
// single instruction — see the loop in POST). Splits the ORIGINAL message
// into naive clause fragments and classifies each independently, since
// single-clause messages are what this model is actually reliable at.
// Deliberately simple sentence/keyword splitting, not general NLU — the
// same approach as lib/ai/extractTasks.ts's offline heuristic.
function splitIntoFragments(text: string): string[] {
  return text
    .split(/\n|,| and then | and |;/i)
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 2);
}

async function classifyFragmentsIndependently(
  fragments: string[],
  context: Omit<InboxRequestBody, "message">,
): Promise<{ actions: InboxAction[]; replies: string[]; intent: string | null }> {
  const settled = await Promise.allSettled(
    fragments.map((fragment) =>
      classifyOneInstruction({
        message: fragment,
        now: context.now,
        currentTaskId: context.currentTaskId,
        recentTaskIds: context.recentTaskIds,
        tasks: context.tasks,
        history: context.history,
      }),
    ),
  );

  const actions: InboxAction[] = [];
  const replies: string[] = [];
  let intent: string | null = null;
  for (const outcome of settled) {
    if (outcome.status !== "fulfilled") continue;
    actions.push(outcome.value.action);
    if (outcome.value.reply) replies.push(outcome.value.reply);
    intent ??= outcome.value.intent;
  }
  return { actions, replies, intent };
}

export async function POST(request: Request) {
  const body = (await request.json()) as InboxRequestBody;

  const actions: InboxAction[] = [];
  const replies: string[] = [];
  let intent = "UNRELATED";
  let message = body.message;
  let firstTurnFailed = false;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let result: SingleTurnResult;
    try {
      result = await classifyOneInstruction({
        message,
        now: body.now,
        currentTaskId: body.currentTaskId,
        recentTaskIds: body.recentTaskIds,
        tasks: body.tasks,
        history: body.history,
      });
    } catch (error) {
      console.error("[api/inbox]", error);
      if (turn === 0) firstTurnFailed = true;
      break; // keep whatever earlier turns already produced
    }

    if (turn === 0) intent = result.intent;
    actions.push(result.action);
    if (result.reply) replies.push(result.reply);

    // No leftover, or the model just echoed the same text back (no real
    // progress) — either way, stop rather than loop pointlessly.
    if (!result.remainingMessage || result.remainingMessage === message) break;
    message = result.remainingMessage;
  }

  if (firstTurnFailed) {
    const fragments = splitIntoFragments(body.message);
    if (fragments.length > 1) {
      const recovered = await classifyFragmentsIndependently(fragments, body);
      actions.push(...recovered.actions);
      replies.push(...recovered.replies);
      if (recovered.intent) intent = recovered.intent;
    }
  }

  if (actions.length === 0) {
    return Response.json(FALLBACK_RESPONSE);
  }

  return Response.json({
    intent,
    actions,
    reply: replies.join(" ").trim() || FALLBACK_RESPONSE.reply,
  } satisfies InboxResponseBody);
}
