import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";

export interface UserMusicPreferences {
  languages: string[];
  completedOnboarding: boolean;
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
  fetchPreferences: () => Promise<void>;
  syncPreferences: (prefs: Partial<UserMusicPreferences & { completedOnboarding: boolean }>) => Promise<void>;
  getLanguageString: () => string;
  shouldShowOnboarding: () => boolean;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      preferences: {
        languages: [],
        completedOnboarding: false,
      },
      availableLanguages: AVAILABLE_LANGUAGES,
      showOnboarding: false,

      setLanguages: (languages) => {
        set((state) => ({
          preferences: { ...state.preferences, languages },
        }));
        get().syncPreferences({ languages });
      },

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

      completeOnboarding: () => {
        const { languages } = get().preferences;
        set((state) => ({
          preferences: { ...state.preferences, completedOnboarding: true },
          showOnboarding: false,
        }));
        get().syncPreferences({ completedOnboarding: true, languages });
      },

      resetOnboarding: () =>
        set({
          preferences: { languages: [], completedOnboarding: false },
          showOnboarding: true,
        }),

      fetchPreferences: async () => {
        try {
          const res = await axiosInstance.get("/users/me/preferences");
          const data = res.data;
          set({
            preferences: {
              languages: data.languages || [],
              completedOnboarding: data.completedOnboarding || false,
            }
          });
        } catch (error) {
          console.error("[OnboardingStore] Failed to fetch preferences:", error);
        }
      },

      syncPreferences: async (prefs) => {
        try {
          await axiosInstance.post("/users/me/preferences", prefs);
        } catch (error) {
          console.error("[OnboardingStore] Failed to sync preferences:", error);
        }
      },

      getLanguageString: () => {
        const langs = get().preferences.languages;
        if (langs.length === 0) return "hindi,english";
        return langs.join(",");
      },

      shouldShowOnboarding: () => {
        return !get().preferences.completedOnboarding;
      },
    }),
    {
      name: "vibra-onboarding",
    }
  )
);