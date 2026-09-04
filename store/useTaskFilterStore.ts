import { create } from "zustand";

import type { TaskCategory } from "@/types/task";

export type TaskStatusFilter = "all" | "pending" | "completed" | "overdue";
export type TaskSortOption = "recent" | "dueDate" | "priority" | "alphabetical";

type TaskFilterStore = {
  category: TaskCategory | "all";
  status: TaskStatusFilter;
  sort: TaskSortOption;
  search: string;
  setCategory: (category: TaskCategory | "all") => void;
  setStatus: (status: TaskStatusFilter) => void;
  setSort: (sort: TaskSortOption) => void;
  setSearch: (search: string) => void;
};

export const useTaskFilterStore = create<TaskFilterStore>((set) => ({
  category: "all",
  status: "all",
  sort: "recent",
  search: "",
  setCategory: (category) => set({ category }),
  setStatus: (status) => set({ status }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set({ search }),
}));
