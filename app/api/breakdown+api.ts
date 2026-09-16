import { BREAKDOWN_SYSTEM_PROMPT } from "@/data/aiPrompts";
import type { TaskContext } from "@/lib/ai/context";
import { generateStructuredJson, type GeminiJsonSchema } from "@/lib/ai/gemini";
import { languageInstruction } from "@/lib/ai/language";
import type { PlanStep } from "@/lib/ai/types";
import type { AppLanguage } from "@/types/settings";

export type BreakdownRequestBody = {
  task: TaskContext;
  /** Steps already checked off — the suggestion only plans what's left. */
  completedSteps: PlanStep[];
  /** The unfinished steps the task has now; a suggestion should differ from these. */
  currentSteps: PlanStep[];
  /** A suggestion the user asked to replace ("Try another"). */
  previousSuggestion: PlanStep[];
  /** The running session's time budget, if there is one. */
  availableMinutes?: number;
  /** The app language — step titles come back in it. */
  language?: AppLanguage;
};

export type BreakdownResponseBody = {
  /** Empty when the model couldn't be reached — the app shows a retry. */
  steps: PlanStep[];
};

const RESPONSE_SCHEMA: GeminiJsonSchema = {
  type: "OBJECT",
  properties: {
    steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          estimatedMinutes: { type: "NUMBER" },
        },
        required: ["title", "estimatedMinutes"],
      },
    },
  },
  required: ["steps"],
};

const MAX_STEPS = 8;
const MAX_TITLE_LENGTH = 90;

// Same defensive boundary as the inbox route: drop anything that isn't a
// short step title (e.g. the model narrating its reasoning into the field),
// and cap how many steps can land in the card.
function normalizeSteps(raw: unknown): PlanStep[] {
  const steps = raw && typeof raw === "object" ? (raw as { steps?: unknown }).steps : undefined;
  if (!Array.isArray(steps)) return [];

  return steps
    .filter((step): step is { title: unknown; estimatedMinutes: unknown } => !!step && typeof step === "object")
    .map((step) => ({
      title: typeof step.title === "string" ? step.title.trim() : "",
      estimatedMinutes:
        typeof step.estimatedMinutes === "number" && Number.isFinite(step.estimatedMinutes)
          ? Math.max(5, Math.round(step.estimatedMinutes))
          : 15,
    }))
    .filter((step) => step.title.length > 0 && step.title.length <= MAX_TITLE_LENGTH)
    .slice(0, MAX_STEPS);
}

export async function POST(request: Request) {
  const body = (await request.json()) as BreakdownRequestBody;

  try {
    const result = await generateStructuredJson({
      systemPrompt: `${BREAKDOWN_SYSTEM_PROMPT}${languageInstruction(body.language)}`,
      userContent: JSON.stringify({
        task: body.task,
        completedSteps: body.completedSteps ?? [],
        currentSteps: body.currentSteps ?? [],
        previousSuggestion: body.previousSuggestion ?? [],
        availableMinutes: body.availableMinutes ?? null,
      }),
      responseSchema: RESPONSE_SCHEMA,
    });
    return Response.json({ steps: normalizeSteps(result) } satisfies BreakdownResponseBody);
  } catch (error) {
    console.error("[api/breakdown]", error);
    return Response.json({ steps: [] } satisfies BreakdownResponseBody);
  }
}
