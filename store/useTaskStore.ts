import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { tasks as initialTasks } from "@/data/tasks";
import type { Task, TaskCategory, TaskPriorityLevel, TaskStep } from "@/types/task";

// Maps a user-facing priority level to the priorityScore the rest of the
// app (badges, sorting, tiers) actually runs on — see lib/taskMeta.ts.
const PRIORITY_LEVEL_SCORE: Record<TaskPriorityLevel, number> = {
  high: 85,
  medium: 60,
  low: 25,
};

export type NewTaskInput = {
  title: string;
  category: TaskCategory;
  estimatedMinutes: number;
  dueDate?: string;
  priorityLevel: TaskPriorityLevel;
  notes?: string;
  steps?: TaskStep[];
};

function createTaskId(): string {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type TaskStore = {
  tasks: Task[];
  toggleTaskStatus: (id: string) => void;
  addTask: (input: NewTaskInput) => void;
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: initialTasks,
      toggleTaskStatus: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { ...task, status: task.status === "completed" ? "pending" : "completed" }
              : task,
          ),
        })),
      addTask: (input) =>
        set((state) => ({
          tasks: [
            {
              id: createTaskId(),
              title: input.title.trim(),
              category: input.category,
              status: "pending",
              priorityScore: PRIORITY_LEVEL_SCORE[input.priorityLevel],
              dueDate: input.dueDate,
              estimatedMinutes: input.estimatedMinutes,
              createdAt: new Date().toISOString(),
              notes: input.notes?.trim() || undefined,
              steps: input.steps && input.steps.length > 0 ? input.steps : undefined,
            },
            ...state.tasks,
          ],
        })),
    }),
    {
      name: "nexdo-tasks",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
