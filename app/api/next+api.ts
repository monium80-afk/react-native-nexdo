import { EXECUTION_COACH_INTEGRATION_NOTES, EXECUTION_COACH_SYSTEM_PROMPT } from "@/data/aiPrompts";
import { generateStructuredJson, type GeminiJsonSchema } from "@/lib/ai/gemini";
import type { TaskContext } from "@/lib/ai/context";

export type NextRequestBody = {
  task: TaskContext;
  existingPlan: { id: string; title: string; estimatedMinutes: number; status: string }[];
  availableMinutes?: number;
};

export type NextResponseBody = {
  complexity: "simple" | "medium" | "complex";
  advice: string;
  plan: { id: string; title: string; estimatedMinutes: number; status: "pending" | "current" | "completed" }[];
  currentStepId: string | null;
  explanation: string;
};

const RESPONSE_SCHEMA: GeminiJsonSchema = {
  type: "OBJECT",
  properties: {
    complexity: { type: "STRING", enum: ["simple", "medium", "complex"] },
    advice: { type: "STRING" },
    plan: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          title: { type: "STRING" },
          estimatedMinutes: { type: "NUMBER" },
          status: { type: "STRING", enum: ["pending", "current", "completed"] },
        },
        required: ["id", "title", "estimatedMinutes", "status"],
      },
    },
    currentStepId: { type: "STRING", nullable: true },
    explanation: { type: "STRING" },
  },
  required: ["complexity", "advice", "plan", "explanation"],
};

const FALLBACK_RESPONSE: NextResponseBody = {
  complexity: "simple",
  advice: "Sorry, I'm having trouble reaching the AI right now — try again in a moment.",
  plan: [],
  currentStepId: null,
  explanation: "",
};

export async function POST(request: Request) {
  const body = (await request.json()) as NextRequestBody;

  try {
    const result = await generateStructuredJson({
      systemPrompt: `${EXECUTION_COACH_SYSTEM_PROMPT}\n\n${EXECUTION_COACH_INTEGRATION_NOTES}`,
      userContent: JSON.stringify({
        task: body.task,
        existingPlan: body.existingPlan,
        availableMinutes: body.availableMinutes ?? null,
      }),
      responseSchema: RESPONSE_SCHEMA,
    });
    return Response.json(result as NextResponseBody);
  } catch (error) {
    console.error("[api/next]", error);
    return Response.json(FALLBACK_RESPONSE);
  }
}
