import type { Task, TaskCategory, TaskComplexity } from "@/types/task";

// Every "AI" function in this directory is a heuristic today, but shaped
// exactly like a real LLM call's input/output — swapping in a real backend
// later means rewriting these function bodies, not their call sites.

export type ConfirmationTier = "safe" | "immediate" | "confirm-required";

export type ExtractedTaskDraft = {
  title: string;
  category: TaskCategory;
  estimatedMinutes: number;
  dueDate?: string;
};

export type ComplexityAnalysis = {
  complexity: TaskComplexity;
  reasoning: string;
};

export type StructuredAction =
  | { type: "CREATE_TASK"; drafts: ExtractedTaskDraft[]; confirmationTier: "confirm-required" }
  | {
      type: "UPDATE_TASK";
      taskId: string;
      changes: Partial<Pick<Task, "title" | "dueDate" | "estimatedMinutes" | "category">>;
      confirmationTier: ConfirmationTier;
    }
  | { type: "COMPLETE_TASK"; taskId: string; confirmationTier: "immediate" }
  | { type: "DELETE_TASK"; taskId: string; confirmationTier: "confirm-required" }
  | { type: "ADD_TASK_CONTEXT"; taskId: string; note: string; confirmationTier: "safe" }
  | { type: "RESCHEDULE_TASK"; taskId: string; newDueDate?: string; confirmationTier: "immediate" }
  | { type: "SKIP_TASK"; taskId: string; reason: string; confirmationTier: "safe" }
  | { type: "QUERY"; answer: string; confirmationTier: "safe" }
  | { type: "CLARIFY"; question: string; candidates: Task[]; confirmationTier: "safe" }
  | { type: "UNKNOWN"; reply: string; confirmationTier: "safe" };
