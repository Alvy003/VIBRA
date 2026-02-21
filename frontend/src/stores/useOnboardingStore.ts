// src/stores/useOnboardingStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserMusicPreferences {
  languages: string[];
  completed: boolean;
}

const AVAILABLE_LANGUAGES = [
  { id: "hindi", label: "Hindi"},
  { id: "english", label: "English"},
  { id: "punjabi", label: "Punjabi"},
  { id: "tamil", label: "Tamil"},
  { id: "telugu", label: "Telugu"},
  { id: "kannada", label: "Kannada"},
  { id: "bengali", label: "Bengali"},
  { id: "marathi", label: "Marathi"},
  { id: "gujarati", label: "Gujarati"},
  { id: "malayalam", label: "Malayalam"},
  { id: "urdu", label: "Urdu"},
  { id: "bhojpuri", label: "Bhojpuri"},
  { id: "rajasthani", label: "Rajasthani"},
  { id: "odia", label: "Odia"},
  { id: "assamese", label: "Assamese"},
  { id: "haryanvi", label: "Haryanvi"},
];

interface OnboardingStore {
  preferences: UserMusicPreferences;
  availableLanguages: typeof AVAILABLE_LANGUAGES;
  showOnboarding: boolean;

  setLanguages: (languages: string[]) => void;
  toggleLanguage: (language: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  getLanguageString: () => string;
  shouldShowOnboarding: () => boolean;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      preferences: {
        languages: [],
        completed: false,
      },
      availableLanguages: AVAILABLE_LANGUAGES,
      showOnboarding: false,

      setLanguages: (languages) =>
        set((state) => ({
          preferences: { ...state.preferences, languages },
        })),

      toggleLanguage: (language) =>
        set((state) => {
          const current = state.preferences.languages;
          const updated = current.includes(language)
            ? current.filter((l) => l !== language)
            : [...current, language];
          return {
            preferences: { ...state.preferences, languages: updated },
          };
        }),

      completeOnboarding: () =>
        set((state) => ({
          preferences: { ...state.preferences, completed: true },
          showOnboarding: false,
        })),

      resetOnboarding: () =>
        set({
          preferences: { languages: [], completed: false },
          showOnboarding: true,
        }),

      getLanguageString: () => {
        const langs = get().preferences.languages;
        if (langs.length === 0) return "hindi,english";
        return langs.join(",");
      },

      shouldShowOnboarding: () => {
        return !get().preferences.completed;
      },
    }),
    {
      name: "vibra-onboarding",
    }
  )
);