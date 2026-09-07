import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { analyzeTaskComplexity } from "@/lib/ai/analyzeComplexity";
import { applyContextToTask } from "@/lib/ai/applyContext";
import { generatePlan } from "@/lib/ai/generatePlan";
import type { StructuredAction } from "@/lib/ai/types";
import { PRIORITY_LEVEL_IMPORTANCE, createSkipRecord, recalcTask } from "@/lib/scoring";
import { recalcAll } from "@/lib/taskPipeline";
import { tasks as initialTasks } from "@/data/tasks";
import type { Subtask, Task, TaskCategory, TaskPriorityLevel, TaskStep } from "@/types/task";

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

function stepsToSubtasks(steps: TaskStep[]): Subtask[] {
  return steps.map((step, index) => ({
    id: step.id,
    label: step.label,
    estimatedMinutes: step.estimatedMinutes,
    order: index,
    status: index === 0 ? "current" : "pending",
  }));
}

function buildTask(input: NewTaskInput, now: Date): Task {
  const complexity = analyzeTaskComplexity({
    title: input.title,
    estimatedMinutes: input.estimatedMinutes,
    subtaskCount: input.steps?.length,
  }).complexity;

  const subtasks =
    input.steps && input.steps.length > 0
      ? stepsToSubtasks(input.steps)
      : generatePlan({
          title: input.title,
          category: input.category,
          estimatedMinutes: input.estimatedMinutes,
          complexity,
        });

  const nowIso = now.toISOString();
  return recalcTask(
    {
      id: createTaskId(),
      title: input.title.trim(),
      category: input.category,
      status: "pending",
      dueDate: input.dueDate,
      estimatedMinutes: input.estimatedMinutes,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: input.notes?.trim() || undefined,
      subtasks,
      currentStepId: subtasks?.find((subtask) => subtask.status === "current")?.id,
      priorityScore: 0,
      suitabilityScore: 0,
      importance: PRIORITY_LEVEL_IMPORTANCE[input.priorityLevel],
      complexity,
      aiContext: { notes: [] },
    },
    now,
  );
}

function remainingMinutes(subtasks: Subtask[]): number {
  return subtasks.filter((subtask) => subtask.status !== "completed").reduce((sum, s) => sum + s.estimatedMinutes, 0);
}

type TaskStore = {
  tasks: Task[];
  addTask: (input: NewTaskInput) => string;
  updateTask: (
    id: string,
    changes: Partial<Pick<Task, "title" | "category" | "dueDate" | "estimatedMinutes" | "notes">>,
  ) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  completeTask: (id: string) => void;
  reopenTask: (id: string) => void;
  completeStep: (taskId: string, stepId: string) => void;
  addContext: (taskId: string, note: string) => void;
  skipTask: (taskId: string, reason: string) => void;
  regeneratePlan: (taskId: string) => void;
  applyStructuredAction: (action: StructuredAction) => { message: string; taskId?: string };
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: recalcAll(initialTasks),

      addTask: (input) => {
        const now = new Date();
        const task = buildTask(input, now);
        set((state) => ({ tasks: recalcAll([task, ...state.tasks], now) }));
        return task.id;
      },

      updateTask: (id, changes) => {
        const now = new Date();
        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((task) =>
              task.id === id ? { ...task, ...changes, updatedAt: now.toISOString() } : task,
            ),
            now,
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },

      toggleTaskStatus: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        if (task.status === "completed") get().reopenTask(id);
        else get().completeTask(id);
      },

      completeTask: (id) => {
        const now = new Date();
        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((task) =>
              task.id === id
                ? { ...task, status: "completed", completedAt: now.toISOString(), updatedAt: now.toISOString() }
                : task,
            ),
            now,
          ),
        }));
      },

      reopenTask: (id) => {
        const now = new Date();
        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((task) =>
              task.id === id
                ? { ...task, status: "pending", completedAt: undefined, updatedAt: now.toISOString() }
                : task,
            ),
            now,
          ),
        }));
      },

      completeStep: (taskId, stepId) => {
        const now = new Date();
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task?.subtasks) return;

        const updatedSubtasks: Subtask[] = task.subtasks.map((subtask) =>
          subtask.id === stepId ? { ...subtask, status: "completed" as const } : subtask,
        );
        const nextPending = updatedSubtasks
          .filter((subtask) => subtask.status === "pending")
          .sort((a, b) => a.order - b.order)[0];
        const finalSubtasks: Subtask[] = updatedSubtasks.map((subtask) =>
          subtask.id === nextPending?.id ? { ...subtask, status: "current" as const } : subtask,
        );
        const allDone = finalSubtasks.every((subtask) => subtask.status === "completed");

        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks: finalSubtasks,
                    currentStepId: nextPending?.id,
                    estimatedMinutes: allDone ? 0 : remainingMinutes(finalSubtasks),
                    status: allDone ? "completed" : t.status,
                    completedAt: allDone ? now.toISOString() : t.completedAt,
                    updatedAt: now.toISOString(),
                  }
                : t,
            ),
            now,
          ),
        }));
      },

      addContext: (taskId, note) => {
        const now = new Date();
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        const result = applyContextToTask(task, note, now);

        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    aiContext: { notes: [...t.aiContext.notes, result.noteToStore] },
                    subtasks: result.updatedSubtasks ?? t.subtasks,
                    currentStepId: result.updatedSubtasks
                      ? result.updatedSubtasks.find((s) => s.status === "current")?.id
                      : t.currentStepId,
                    estimatedMinutes: result.updatedEstimatedMinutes ?? t.estimatedMinutes,
                    dueDate: result.newDueDate ?? t.dueDate,
                    updatedAt: now.toISOString(),
                  }
                : t,
            ),
            now,
          ),
        }));
      },

      skipTask: (taskId, reason) => {
        const now = new Date();
        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((task) =>
              task.id === taskId
                ? { ...task, skip: createSkipRecord(reason, now), updatedAt: now.toISOString() }
                : task,
            ),
            now,
          ),
        }));
      },

      regeneratePlan: (taskId) => {
        const now = new Date();
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        // Explicit user request bypasses the "simple tasks get no plan" gate.
        const subtasks = generatePlan({
          title: task.title,
          category: task.category,
          estimatedMinutes: task.estimatedMinutes,
          complexity: task.complexity === "simple" ? "medium" : task.complexity,
        });

        set((state) => ({
          tasks: recalcAll(
            state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    subtasks,
                    currentStepId: subtasks?.find((s) => s.status === "current")?.id,
                    updatedAt: now.toISOString(),
                  }
                : t,
            ),
            now,
          ),
        }));
      },

      applyStructuredAction: (action) => {
        switch (action.type) {
          case "CREATE_TASK": {
            const ids = action.drafts.map((draft) =>
              get().addTask({
                title: draft.title,
                category: draft.category,
                estimatedMinutes: draft.estimatedMinutes,
                dueDate: draft.dueDate,
                priorityLevel: "medium",
              }),
            );
            const message =
              action.drafts.length === 1
                ? `Added "${action.drafts[0].title}" to your tasks.`
                : `Added ${action.drafts.length} tasks: ${action.drafts.map((d) => d.title).join(", ")}.`;
            return { message, taskId: ids[0] };
          }
          case "UPDATE_TASK": {
            const task = get().tasks.find((t) => t.id === action.taskId);
            get().updateTask(action.taskId, action.changes);
            return { message: `Updated "${task?.title ?? "task"}".`, taskId: action.taskId };
          }
          case "COMPLETE_TASK": {
            const task = get().tasks.find((t) => t.id === action.taskId);
            get().completeTask(action.taskId);
            return { message: `Marked "${task?.title ?? "task"}" as done.`, taskId: action.taskId };
          }
          case "DELETE_TASK": {
            const task = get().tasks.find((t) => t.id === action.taskId);
            get().deleteTask(action.taskId);
            return { message: `Deleted "${task?.title ?? "task"}".` };
          }
          case "ADD_TASK_CONTEXT": {
            const task = get().tasks.find((t) => t.id === action.taskId);
            get().addContext(action.taskId, action.note);
            return { message: `Got it — logged that on "${task?.title ?? "your task"}".`, taskId: action.taskId };
          }
          case "RESCHEDULE_TASK": {
            const task = get().tasks.find((t) => t.id === action.taskId);
            get().updateTask(action.taskId, { dueDate: action.newDueDate });
            return { message: `Rescheduled "${task?.title ?? "task"}".`, taskId: action.taskId };
          }
          case "SKIP_TASK": {
            const task = get().tasks.find((t) => t.id === action.taskId);
            get().skipTask(action.taskId, action.reason);
            return { message: `Got it — I'll hold off suggesting "${task?.title ?? "that"}" for a bit.`, taskId: action.taskId };
          }
          case "QUERY":
            return { message: action.answer };
          case "CLARIFY":
            return { message: action.question };
          case "UNKNOWN":
          default:
            return { message: action.reply };
        }
      },
    }),
    {
      name: "nexdo-tasks",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
