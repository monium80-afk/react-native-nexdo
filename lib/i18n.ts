import { en } from "@/constants/translations/en";
import { fr } from "@/constants/translations/fr";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { AppLanguage } from "@/types/settings";

export type Translations = typeof en;

// English and French are translated so far. The other languages in Settings
// fall back to English for the interface (the AI still replies in them).
const TRANSLATIONS: Partial<Record<AppLanguage, Translations>> = { en, fr };

export const ALL_TRANSLATIONS: Translations[] = Object.values(TRANSLATIONS);

export function getTranslations(language: AppLanguage): Translations {
  return TRANSLATIONS[language] ?? en;
}

export function getLanguage(): AppLanguage {
  return useSettingsStore.getState().language;
}

/**
 * For stores and lib code, which can't use hooks. Components should use
 * useTranslation() instead, so they re-render when the language changes.
 */
export function translate(): Translations {
  return getTranslations(getLanguage());
}
