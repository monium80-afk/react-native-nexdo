import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { tasks as initialTasks } from "@/data/tasks";
import type { Task } from "@/types/task";

type TaskStore = {
  tasks: Task[];
  toggleTaskStatus: (id: string) => void;
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
    }),
    {
      name: "nexdo-tasks",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
