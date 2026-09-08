import { TASK_MANAGER_INTEGRATION_NOTES, TASK_MANAGER_SYSTEM_PROMPT } from "@/data/aiPrompts";
import { generateStructuredJson, type GeminiJsonSchema } from "@/lib/ai/gemini";
import type { TaskContext } from "@/lib/ai/context";

export type InboxRequestBody = {
  message: string;
  now: string;
  currentTaskId?: string;
  recentTaskIds: string[];
  tasks: TaskContext[];
  history: { role: "user" | "ai"; text: string }[];
};

export type InboxActionType = "CREATE_TASK" | "UPDATE_TASK" | "COMPLETE_TASK" | "DELETE_TASK" | "ADD_CONTEXT" | "NONE";

export type InboxResponseBody = {
  intent: string;
  action: {
    type: InboxActionType;
    taskId: string | null;
    fields: {
      title?: string;
      category?: string;
      estimatedMinutes?: number;
      dueDate?: string;
      note?: string;
    };
    confirmationRequired: boolean;
  };
  reply: string;
};

const RESPONSE_SCHEMA: GeminiJsonSchema = {
  type: "OBJECT",
  properties: {
    intent: {
      type: "STRING",
      enum: [
        "CREATE_TASK",
        "UPDATE_TASK",
        "COMPLETE_TASK",
        "DELETE_TASK",
        "ADD_CONTEXT",
        "ASK_RECOMMENDATION",
        "GENERAL_QUESTION",
        "CLARIFY_NEEDED",
        "UNRELATED",
      ],
    },
    action: {
      type: "OBJECT",
      properties: {
        type: { type: "STRING", enum: ["CREATE_TASK", "UPDATE_TASK", "COMPLETE_TASK", "DELETE_TASK", "ADD_CONTEXT", "NONE"] },
        taskId: { type: "STRING", nullable: true },
        fields: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", nullable: true },
            category: { type: "STRING", enum: ["work", "school", "personal", "other"], nullable: true },
            estimatedMinutes: { type: "NUMBER", nullable: true },
            dueDate: { type: "STRING", nullable: true },
            note: { type: "STRING", nullable: true },
          },
        },
        confirmationRequired: { type: "BOOLEAN" },
      },
      required: ["type", "confirmationRequired"],
    },
    reply: { type: "STRING" },
  },
  required: ["intent", "action", "reply"],
};

const FALLBACK_RESPONSE: InboxResponseBody = {
  intent: "UNRELATED",
  action: { type: "NONE", taskId: null, fields: {}, confirmationRequired: false },
  reply: "Sorry, I'm having trouble reaching the AI right now — try again in a moment.",
};

export async function POST(request: Request) {
  const body = (await request.json()) as InboxRequestBody;

  try {
    const result = await generateStructuredJson({
      systemPrompt: `${TASK_MANAGER_SYSTEM_PROMPT}\n\n${TASK_MANAGER_INTEGRATION_NOTES}`,
      userContent: JSON.stringify({
        message: body.message,
        now: body.now,
        currentTaskId: body.currentTaskId ?? null,
        recentTaskIds: body.recentTaskIds,
        tasks: body.tasks,
        history: body.history,
      }),
      responseSchema: RESPONSE_SCHEMA,
    });
    return Response.json(result as InboxResponseBody);
  } catch (error) {
    console.error("[api/inbox]", error);
    return Response.json(FALLBACK_RESPONSE);
  }
}
