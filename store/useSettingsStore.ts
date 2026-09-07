import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { PlanningStyle } from "@/types/settings";

type SettingsStore = {
  planningStyle: PlanningStyle;
  setPlanningStyle: (style: PlanningStyle) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      planningStyle: "balanced",
      setPlanningStyle: (style) => set({ planningStyle: style }),
    }),
    {
      name: "nexdo-settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
