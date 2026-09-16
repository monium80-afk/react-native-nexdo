import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_ID,
  findCategory,
  resolveCategoryId,
} from "@/constants/categories";
import { useTaskStore } from "@/store/useTaskStore";
import type { Category, CategoryColor } from "@/types/category";

function createCategoryId(): string {
  return `category-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Tasks can't point at a category that no longer exists — move them.
function moveOrphanedTasks(categories: Category[]) {
  const { tasks, updateTask } = useTaskStore.getState();
  tasks
    .filter((task) => !categories.some((category) => category.id === task.category))
    .forEach((task) => updateTask(task.id, { category: resolveCategoryId(categories, undefined) }));
}

type CategoryStore = {
  categories: Category[];
  /** Pre-selected for new tasks — the starred category in Manage Categories. */
  defaultCategoryId: string;
  addCategory: (label: string, color: CategoryColor) => void;
  updateCategory: (id: string, changes: Pick<Category, "label" | "color">) => void;
  /** The last remaining category can't be deleted; a deleted category's tasks move to "Other". */
  deleteCategory: (id: string) => void;
  setDefaultCategory: (id: string) => void;
  resetDefaults: () => void;
};

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      defaultCategoryId: DEFAULT_CATEGORY_ID,

      addCategory: (label, color) => {
        const trimmed = label.trim();
        if (!trimmed) return;
        set((state) => ({ categories: [...state.categories, { id: createCategoryId(), label: trimmed, color }] }));
      },

      updateCategory: (id, changes) => {
        const label = changes.label.trim();
        if (!label) return;
        set((state) => ({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, label, color: changes.color } : category,
          ),
        }));
      },

      deleteCategory: (id) => {
        const { categories, defaultCategoryId } = get();
        if (categories.length <= 1) return;
        const remaining = categories.filter((category) => category.id !== id);
        set({
          categories: remaining,
          defaultCategoryId: defaultCategoryId === id ? resolveCategoryId(remaining, undefined) : defaultCategoryId,
        });
        moveOrphanedTasks(remaining);
      },

      setDefaultCategory: (id) => set({ defaultCategoryId: id }),

      resetDefaults: () => {
        set({ categories: DEFAULT_CATEGORIES, defaultCategoryId: DEFAULT_CATEGORY_ID });
        moveOrphanedTasks(DEFAULT_CATEGORIES);
      },
    }),
    {
      name: "nexdo-categories",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Reactive lookup for components — re-renders when the category is renamed or recolored. */
export function useCategory(id: string): Category {
  const categories = useCategoryStore((state) => state.categories);
  return findCategory(categories, id);
}
