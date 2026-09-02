export type TaskCategory = "work" | "school" | "personal" | "other";

export type NextTask = {
  id: string;
  title: string;
  category: TaskCategory;
  priorityScore: number;
  dueLabel: string;
  estimatedMinutes: number;
  whyThis: {
    reasoning: string;
    keyFocus: string;
  };
};
