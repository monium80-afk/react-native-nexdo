import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AppLanguage, ThemePreference } from "@/types/settings";

// Saved preferences only for now: the app doesn't re-theme or translate
// itself yet. Those land as their own features and will read these values.
type SettingsStore = {
  theme: ThemePreference;
  language: AppLanguage;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: AppLanguage) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "system",
      language: "en",
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "nexdo-settings",
      storage: createJSONStorage(() => AsyncStorage),
      // Listing the keys also drops the retired "planningStyle" value that
      // older installs still have saved, the next time this store writes.
      partialize: (state) => ({ theme: state.theme, language: state.language }),
    },
  ),
);
