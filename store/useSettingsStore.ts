import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { AppLanguage, ThemePreference } from "@/types/settings";

// "language" drives the interface copy (see lib/i18n.ts) and the language the
// AI replies in. "theme" is saved but not applied yet.
type SettingsStore = {
  theme: ThemePreference;
  language: AppLanguage;
  // Auto mode: the AI chat adds and updates tasks straight away instead of
  // showing a confirmation card first.
  aiAutoMode: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: AppLanguage) => void;
  setAiAutoMode: (aiAutoMode: boolean) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "system",
      language: "en",
      aiAutoMode: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setAiAutoMode: (aiAutoMode) => set({ aiAutoMode }),
    }),
    {
      name: "nexdo-settings",
      storage: createJSONStorage(() => AsyncStorage),
      // Listing the keys also drops the retired "planningStyle" value that
      // older installs still have saved, the next time this store writes.
      partialize: (state) => ({ theme: state.theme, language: state.language, aiAutoMode: state.aiAutoMode }),
    },
  ),
);
