import type { Subtask, TaskCategory, TaskComplexity } from "@/types/task";

const CATEGORY_TEMPLATES: Record<TaskCategory, [string, string, string]> = {
  school: ["Gather notes and materials", "Do the core work", "Review and finalize"],
  work: ["Gather what you need", "Do the core work", "Review and send"],
  personal: ["Get ready", "Do the core work", "Wrap up"],
  other: ["Gather what you need", "Do the core work", "Wrap up and review"],
};

const SPLIT_RATIOS = [0.2, 0.6, 0.2];

function createSubtaskId(): string {
  return `subtask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// complexity gates whether a plan is generated at all — simple tasks get no
// subtasks, so the app doesn't produce a ridiculous plan for "take medication".
export function generatePlan(input: {
  title: string;
  category: TaskCategory;
  estimatedMinutes: number;
  complexity: TaskComplexity;
}): Subtask[] | undefined {
  if (input.complexity === "simple") return undefined;

  const labels = CATEGORY_TEMPLATES[input.category];
  const durations = SPLIT_RATIOS.map((ratio) => Math.round(input.estimatedMinutes * ratio));
  durations[durations.length - 1] += input.estimatedMinutes - durations.reduce((sum, duration) => sum + duration, 0);

  return labels.map((label, index) => ({
    id: createSubtaskId(),
    label,
    estimatedMinutes: durations[index],
    order: index,
    status: index === 0 ? "current" : "pending",
  }));
}
