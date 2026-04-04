import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { axiosInstance } from "@/lib/axios";

export interface UserMusicPreferences {
  languages: string[];
  genres: string[];
  artists: string[];
  completedOnboarding: boolean;
}

export const AVAILABLE_LANGUAGES = [
  { id: "hindi", label: "Hindi"},
  { id: "english", label: "English"},
  { id: "malayalam", label: "Malayalam"},
  { id: "tamil", label: "Tamil"},
  { id: "telugu", label: "Telugu"},
  { id: "kannada", label: "Kannada"},
  { id: "punjabi", label: "Punjabi"},
  { id: "bengali", label: "Bengali"},
  { id: "marathi", label: "Marathi"},
  { id: "gujarati", label: "Gujarati"},
];

export const AVAILABLE_GENRES = [
  { id: "bollywood", label: "Bollywood 🎬" },
  { id: "phonk", label: "Phonk 🔥" },
  { id: "lofi", label: "Lo-fi ☕" },
  { id: "pop", label: "Pop 🎤" },
  { id: "hiphop", label: "Hip Hop 🎧" },
  { id: "rock", label: "Rock 🎸" },
  { id: "electronic", label: "Electronic ⚡" },
  { id: "classical", label: "Classical 🎻" },
  { id: "devotional", label: "Devotional 🙏" },
  { id: "party", label: "Party 🕺" },
];

interface OnboardingStore {
  preferences: UserMusicPreferences;
  showOnboarding: boolean;

  setLanguages: (languages: string[]) => void;
  toggleLanguage: (language: string) => void;
  toggleGenre: (genre: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  reset: () => void;
  fetchPreferences: () => Promise<void>;
  syncPreferences: (prefs: Partial<UserMusicPreferences>) => Promise<void>;
  getLanguageString: () => string;
  shouldShowOnboarding: () => boolean;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      preferences: {
        languages: [],
        genres: [],
        artists: [],
        completedOnboarding: false,
      },
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

      toggleGenre: (genre) =>
        set((state) => {
          const current = state.preferences.genres;
          const updated = current.includes(genre)
            ? current.filter((g) => g !== genre)
            : [...current, genre];
          return {
            preferences: { ...state.preferences, genres: updated },
          };
        }),

      completeOnboarding: () => {
        const { languages, genres } = get().preferences;
        set((state) => ({
          preferences: { ...state.preferences, completedOnboarding: true },
          showOnboarding: false,
        }));
        get().syncPreferences({ completedOnboarding: true, languages, genres });
      },

      resetOnboarding: () =>
        set({
          preferences: { languages: [], genres: [], artists: [], completedOnboarding: false },
          showOnboarding: true,
        }),

      reset: () =>
        set({
          preferences: { languages: [], genres: [], artists: [], completedOnboarding: false },
          showOnboarding: false,
        }),

      fetchPreferences: async () => {
        try {
          const res = await axiosInstance.get("/users/me/preferences");
          const data = res.data;
          set({
            preferences: {
              languages: data.languages || [],
              genres: data.genres || [],
              artists: data.artists || [],
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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
