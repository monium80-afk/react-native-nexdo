export type TaskCategory = "work" | "school" | "personal" | "other";

export type TaskStatus = "pending" | "completed";

export type TaskPriorityLevel = "high" | "medium" | "low";

export type TaskStep = {
  id: string;
  label: string;
  estimatedMinutes: number;
};

export type Task = {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  /** 0–100. High >=75, Medium 45–74, Low <45 — see prompt_material/01-design-system.txt */
  priorityScore: number;
  dueDate?: string; // ISO 8601 — absent means "No deadline"
  estimatedMinutes: number;
  createdAt: string; // ISO 8601 — drives the "Recently added" sort
  notes?: string;
  steps?: TaskStep[];
};

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
