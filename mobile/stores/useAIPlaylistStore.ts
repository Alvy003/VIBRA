import axios from 'axios';
import * as Haptics from 'expo-haptics';
import { create } from 'zustand';
import { axiosInstance, setAuthToken } from '@/lib/axios';

interface AIPlaylistTrack {
  externalId: string;
  title: string;
  artist: string;
  imageUrl: string;
  streamUrl: string;
  audioUrl?: string; // Add audioUrl
  duration: number;
  source: 'jiosaavn' | 'youtube';
  score?: number;
}

interface AIPlaylist {
  _id: string;
  name: string;
  description: string;
  vibe: string;
  language: string;
  era: string;
  size: number;
  tracks: AIPlaylistTrack[];
  coverArt: string | null;
  imageUrl?: string; // Add optional imageUrl for convenience mapping
  metadata: {
    searchQueries: string[];
    moodKeywords: string[];
    aiGenerated: boolean;
    aiModel?: string;
    generatedAt: string;
    matchRate: number;
  };
  stats: {
    plays: number;
    saves: number;
  };
  createdAt: string;
}

interface GenerationParams {
  vibe?: 'chill' | 'party' | 'focus' | 'workout' | 'romantic' | 'sad';
  language?: 'hindi' | 'english' | 'punjabi' | 'tamil' | 'telugu' | 'malayalam' | 'multi';
  era?: 'latest' | 'classic' | 'mix';
  size?: 15 | 30 | 50;
  moodKeywords?: string[];
}

type InputMode = 'chat' | 'manual';
type GenerationStage = 'idle' | 'analyzing' | 'generating' | 'complete' | 'error';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'playlist_card';
  text: string;
  playlist?: AIPlaylist;
}

interface AIPlaylistStore {
  // UI State
  inputMode: InputMode;
  currentStep: number;
  generationStage: GenerationStage;
  isGenerating: boolean;
  
  // Data
  messages: Message[];
  params: GenerationParams;
  naturalQuery: string;
  chatQuery: string;
  analysisResult: any | null;
  generatedPlaylist: AIPlaylist | null;
  
  // Error handling
  error: string | null;
  
  // Progress tracking
  progressMessage: string;
  playlistMode: boolean;
  directMode: boolean;
  
  // Actions - UI
  setInputMode: (mode: InputMode) => void;
  setStep: (step: number) => void;
  setNaturalQuery: (query: string) => void;
  setChatQuery: (query: string) => void;
  setParam: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  addMessage: (message: Message) => void;
  togglePlaylistMode: () => void;
  toggleDirectMode: () => void;
  
  // Actions - API
  analyzeNaturalLanguage: (token?: string) => Promise<void>;
  analyzeAndGenerate: (query?: string, token?: string) => Promise<void>;
  generatePlaylist: (directParams?: GenerationParams, token?: string, isExpansion?: boolean, existingTracks?: AIPlaylistTrack[]) => Promise<void>;
  getPlaylistById: (id: string) => Promise<void>;
  incrementPlay: (id: string) => Promise<void>;
  toggleSave: (id: string, save: boolean, token?: string) => Promise<void>;
  importSpotifyPlaylist: (url: string, token?: string) => Promise<void>;
  importYouTubePlaylist: (url: string, token?: string) => Promise<void>;
  
  // Utilities
  reset: () => void;
  resetParams: () => void;
  clearError: () => void;
  goBack: () => void;
  clearPlaylist: () => void;
}

const INITIAL_STATE = {
  inputMode: 'chat' as InputMode,
  currentStep: 1,
  generationStage: 'idle' as GenerationStage,
  isGenerating: false,
  messages: [
    {
      id: 'welcome',
      type: 'ai' as const,
      text: "Playlist Mode active. Describe the mood or occasion, and I'll curate your perfect soundtrack."
    }
  ],
  params: {},
  naturalQuery: '',
  chatQuery: '',
  analysisResult: null,
  generatedPlaylist: null,
  error: null,
  progressMessage: '',
  playlistMode: true, // Default to true (playlist focused)
  directMode: false,
};

export const useAIPlaylistStore = create<AIPlaylistStore>((set, get) => ({
  ...INITIAL_STATE,

  setInputMode: (mode) => set({ inputMode: mode }),
  setStep: (step) => set({ currentStep: step }),
  setNaturalQuery: (query) => set({ naturalQuery: query, chatQuery: query }),
  setChatQuery: (query) => set({ chatQuery: query, naturalQuery: query }),
  setParam: (key, value) => {
    set((state) => ({
      params: { ...state.params, [key]: value },
    }));
  },
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),

  togglePlaylistMode: () => {
    const newMode = !get().playlistMode;
    // Bug Fix: If switching to Chat Mode (newMode: false), reset directMode to false
    set({ 
      playlistMode: newMode,
      directMode: newMode ? get().directMode : false
    });
    
    // Add welcome message for the mode
    const msg: Message = {
      id: Date.now().toString(),
      type: 'ai',
      text: newMode 
        ? "Switched to Playlist Mode. Tell me what kind of music you're looking for, and I'll build it! 🎵"
        : "Switched to Chat Mode. Let's talk about music! 🎧"
    };

    set(state => ({ messages: [...state.messages, msg] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  toggleDirectMode: () => {
    const newDirect = !get().directMode;
    set({ directMode: newDirect });
  },

  // ─────────────────────────────────────────────────────────
  // ANALYZE NATURAL LANGUAGE
  // ─────────────────────────────────────────────────────────
  analyzeNaturalLanguage: async (token) => {
    if (token) setAuthToken(token);
    const { chatQuery, naturalQuery, playlistMode } = get();
    const query = chatQuery || naturalQuery;
    
    if (!query || query.trim().length < 2) {
      set({ error: 'Please say something...' });
      return;
    }

    set({ 
      generationStage: 'analyzing',
      isGenerating: true,
      error: null,
      progressMessage: 'Thinking...',
    });

    try {
      const response = await axiosInstance.post('/ai-playlists/analyze', {
        query: query.trim(),
        isPlaylistMode: playlistMode,
      });

      const { analysis } = response.data;

      set({ 
        analysisResult: analysis,
        generationStage: 'idle',
        isGenerating: false,
      });

      // Auto-proceed if high confidence
      if (analysis.confidence >= 80) {
        // Fill params and generate
        set({
          params: {
            vibe: analysis.vibe,
            language: analysis.language,
            era: analysis.era,
            size: analysis.size,
            moodKeywords: analysis.mood_keywords,
          },
        });
        
        // Auto-generate
        get().generatePlaylist();
      } else if (analysis.confidence >= 60) {
        // Medium confidence - show manual mode with pre-filled values
        set({
          inputMode: 'manual',
          currentStep: 1,
          params: {
            vibe: analysis.vibe,
            language: analysis.language,
            era: analysis.era,
            size: analysis.size,
            moodKeywords: analysis.mood_keywords,
          },
        });
      } else {
        // Low confidence - let user start fresh
        set({
          inputMode: 'manual',
          currentStep: 1,
          error: 'I couldn\'t quite understand that. Let\'s build it step by step.',
        });
      }
    } catch (error: any) {
      console.error('[AI] Analysis error:', error);
      set({
        error: error.response?.data?.message || 'Failed to analyze. Please try again.',
        generationStage: 'error',
        isGenerating: false,
      });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GENERATE PLAYLIST
  // ─────────────────────────────────────────────────────────
  generatePlaylist: async (directParams, token, isExpansion = false, existingTracks = []) => {
    if (token) setAuthToken(token);
    const params = directParams || get().params;
    
    // Validation
    if (!params.vibe || !params.language || !params.era || !params.size) {
      set({ error: 'Please complete all selections' });
      return;
    }

    set({ 
      generationStage: 'generating',
      isGenerating: true,
      error: null,
      progressMessage: 'Creating your perfect playlist...',
    });

    // Simulated progress messages for better UX
    const progressMessages = [
      'Analyzing your vibe...',
      'Searching millions of songs...',
      'Finding perfect matches...',
      'Curating your playlist...',
      'Almost there...',
    ];

    let messageIndex = 0;
    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length - 1) {
        messageIndex++;
        set({ progressMessage: progressMessages[messageIndex] });
      }
    }, 1500);

    try {
      const response = await axiosInstance.post('/ai-playlists/generate', {
        ...params,
        useAI: true,
        is_expansion: isExpansion,
        existingTracks: isExpansion ? existingTracks : [],
      });

      clearInterval(progressInterval);

        const playlist = response.data.playlist;
        const cardMsg: Message = {
          id: (Date.now() + 2).toString(),
          type: 'playlist_card',
          text: `I've curated "${playlist.name}" for you!`,
          playlist
        };

        set((s) => ({
          generatedPlaylist: playlist,
          messages: [...s.messages, cardMsg],
          generationStage: 'complete',
          isGenerating: false,
          progressMessage: 'Playlist ready!',
        }));
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('[AI] Generation error:', error);
      
      set({
        error: error.response?.data?.message || 'Failed to generate playlist. Please try again.',
        generationStage: 'error',
        isGenerating: false,
      });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET PLAYLIST BY ID
  // ─────────────────────────────────────────────────────────
  getPlaylistById: async (id) => {
    set({ generationStage: 'generating', isGenerating: true, error: null });

    try {
      const response = await axiosInstance.get(`/ai-playlists/${id}`);
      
      set({
        generatedPlaylist: response.data.playlist,
        generationStage: 'complete',
        isGenerating: false,
      });
    } catch (error: any) {
      console.error('[AI] Fetch error:', error);
      set({
        error: 'Failed to load playlist',
        generationStage: 'error',
        isGenerating: false,
      });
    }
  },

  // ─────────────────────────────────────────────────────────
  // INCREMENT PLAY COUNT
  // ─────────────────────────────────────────────────────────
  incrementPlay: async (id) => {
    try {
      await axiosInstance.post(`/ai-playlists/${id}/play`);
    } catch (error) {
      console.error('[AI] Play increment error:', error);
    }
  },

  // ─────────────────────────────────────────────────────────
  // TOGGLE SAVE
  // ─────────────────────────────────────────────────────────
  toggleSave: async (id, save, token) => {
    if (token) setAuthToken(token);
    try {
      await axiosInstance.post(`/ai-playlists/${id}/save`, { save });
      
      // Update local state
      set((state) => {
        if (state.generatedPlaylist?._id === id) {
          return {
            generatedPlaylist: {
              ...state.generatedPlaylist,
              stats: {
                ...state.generatedPlaylist.stats,
                saves: state.generatedPlaylist.stats.saves + (save ? 1 : -1),
              },
            },
          };
        }
        return state;
      });
    } catch (error) {
      console.error('[AI] Save toggle error:', error);
    }
  },

  // ─────────────────────────────────────────────────────────
  // ANALYZE + GENERATE (single chat action)
  // ─────────────────────────────────────────────────────────
  analyzeAndGenerate: async (query, token) => {
    if (token) setAuthToken(token);
    const store = get();
    const finalQuery = query || store.chatQuery || store.naturalQuery;

    if (!finalQuery || finalQuery.trim().length < 2) {
      set({ error: 'Please say something...' });
      return;
    }

    // 1. Add User Message to UI
    const userMsg: Message = { id: Date.now().toString(), type: 'user', text: finalQuery };
    set((s) => ({ 
      messages: [...s.messages, userMsg],
      chatQuery: '', 
      naturalQuery: '',
      generationStage: 'analyzing',
      isGenerating: true,
      error: null,
      progressMessage: 'Thinking...',
    }));

    try {
      // 2. Analyze with History
      const history = get().messages.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await axiosInstance.post('/ai-playlists/analyze', {
        query: finalQuery.trim(),
        history: get().messages.slice(-5).map(m => ({ role: m.type === 'user' ? 'user' : 'assistant', text: m.text })),
        isPlaylistMode: get().playlistMode,
        directMode: get().directMode,
      });
      
      const { intent, message, params, is_expansion } = response.data;

      if (intent === 'playlist' && params) {
        set({
          params,
          progressMessage: is_expansion ? 'Expanding your playlist...' : `Creating your ${params.vibe} playlist...`,
        });

        // If expansion, grab current tracks
        const existing = is_expansion ? (get().generatedPlaylist?.tracks || []) : [];
        await get().generatePlaylist(undefined, undefined, is_expansion, existing);
      } else {
        // Chat or Clarify response
        const aiMsg: Message = { 
          id: (Date.now() + 1).toString(), 
          type: 'ai', 
          text: message || "I'm not sure how to help with that yet." 
        };
        set((s) => ({
          messages: [...s.messages, aiMsg],
          generationStage: 'idle',
          isGenerating: false,
        }));
      }
    } catch (error: any) {
      console.error('[AI] analyzeAndGenerate error:', error);
      set({
        error: error.response?.data?.message || 'Something went wrong.',
        generationStage: 'error',
        isGenerating: false,
      });
    }
  },

  // ─────────────────────────────────────────────────────────
  // IMPORT SPOTIFY PLAYLIST
  // ─────────────────────────────────────────────────────────
  importSpotifyPlaylist: async (url, token) => {
    if (token) setAuthToken(token);
    
    set({ 
      generationStage: 'generating',
      isGenerating: true,
      error: null,
      progressMessage: 'Connecting to Spotify...',
    });

    const progressMessages = [
      'Extracting playlist metadata...',
      'Searching for matches in our library...',
      'Matching tracks on Vibra...',
      'Almost ready...',
    ];

    let messageIndex = 0;
    const progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length - 1) {
        messageIndex++;
        set({ progressMessage: progressMessages[messageIndex] });
      }
    }, 2500);

    try {
      const response = await axiosInstance.post('/ai-playlists/import/spotify', {
        url: url.trim()
      });

      const { playlist, status } = response.data;
      
      // If already ready (duplicate), finish immediately
      if (status === 'ready') {
          clearInterval(progressInterval);
          const cardMsg: Message = {
            id: Date.now().toString(),
            type: 'playlist_card',
            text: `Re-imported "${playlist.name}" for you!`,
            playlist
          };
          set((s) => ({
            generatedPlaylist: playlist,
            messages: [...s.messages, cardMsg],
            generationStage: 'complete',
            isGenerating: false,
            progressMessage: 'Ready!',
          }));
          return;
      }

      // If importing, start polling
      let currentPlaylist = playlist;
      let attempts = 0;
      const maxAttempts = 30; // Poll for ~2 minutes (4s intervals)

      const poll = async () => {
        if (attempts >= maxAttempts) return true; 
        attempts++;
        
        try {
          const res = await axiosInstance.get(`/playlists/${playlist._id}`);
          currentPlaylist = res.data;
          // Map songs to tracks for UI card
          currentPlaylist.tracks = currentPlaylist.songs || [];
          
          // Update the message in chat so user sees progress
          set((s) => {
             const newMessages = s.messages.map(m => {
                 if (m.type === 'playlist_card' && m.playlist?._id === currentPlaylist._id) {
                     return { ...m, playlist: currentPlaylist };
                 }
                 return m;
             });
             return { ...s, messages: newMessages, generatedPlaylist: currentPlaylist };
          });

          // Sync library periodically
          if (attempts % 3 === 0) {
            const { usePlaylistStore } = await import('./usePlaylistStore');
            usePlaylistStore.getState().fetchUserPlaylists();
          }
          
          if (currentPlaylist.metadata?.importStatus === 'completed') {
            return true; 
          }
        } catch (e) {
          console.error('[SpotifyImport] Poll error:', e);
        }
        return false;
      };

      // Initial wait then poll
      await new Promise(r => setTimeout(r, 4000));
      
      let isReady = false;
      while (attempts < maxAttempts && !isReady) {
          isReady = await poll();
          if (!isReady) await new Promise(r => setTimeout(r, 4000));
      }

      clearInterval(progressInterval);

      const userMsg: Message = { 
        id: Date.now().toString(), 
        type: 'user', 
        text: `Import playlist: ${url}` 
      };

      const cardMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'playlist_card',
        text: `I've imported your Spotify playlist as "${currentPlaylist.name}"!`,
        playlist: currentPlaylist
      };

      set((s) => ({
        generatedPlaylist: currentPlaylist,
        messages: [...s.messages, userMsg, cardMsg],
        generationStage: 'complete',
        isGenerating: false,
        progressMessage: 'Import complete!',
      }));
      
      // Force refresh library store
      const { usePlaylistStore } = await import('./usePlaylistStore');
      usePlaylistStore.getState().fetchUserPlaylists();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('[SpotifyImport] Store error:', error);
      set({
        error: error.response?.data?.message || 'Failed to import Spotify playlist. Check the URL and try again.',
        isGenerating: false,
        generationStage: 'error',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  importYouTubePlaylist: async (url: string, token?: string) => {
    if (token) setAuthToken(token);
    let progressInterval: any;

    set({ 
      generationStage: 'generating',
      isGenerating: true,
      error: null,
      progressMessage: 'Connecting to YouTube...',
    });

    const progressMessages = [
      'Extracting YouTube playlist metadata...',
      'Analyzing video tracks...',
      'Searching for matches in our library...',
      'Almost ready...',
    ];

    let messageIndex = 0;
    progressInterval = setInterval(() => {
      if (messageIndex < progressMessages.length - 1) {
        messageIndex++;
        set({ progressMessage: progressMessages[messageIndex] });
      }
    }, 2500);

    try {
      const response = await axiosInstance.post('/ai-playlists/import/youtube', {
        url: url.trim()
      });

      const { playlist, status } = response.data;
      
      if (status === 'ready') {
          clearInterval(progressInterval);
          const cardMsg: Message = {
            id: Date.now().toString(),
            type: 'playlist_card',
            text: `Re-imported "${playlist.name}" for you!`,
            playlist
          };
          set((s) => ({
            generatedPlaylist: playlist,
            messages: [...s.messages, cardMsg],
            generationStage: 'complete',
            isGenerating: false,
            progressMessage: 'Ready!',
          }));
          return;
      }

      let currentPlaylist = playlist;
      let attempts = 0;
      const maxAttempts = 30; 

      const poll = async () => {
        if (attempts >= maxAttempts) return true; 
        attempts++;
        
        try {
          const res = await axiosInstance.get(`/playlists/${playlist._id}`);
          currentPlaylist = res.data;
          currentPlaylist.tracks = currentPlaylist.songs || [];
          
          set((s) => {
             const newMessages = s.messages.map(m => {
                 if (m.type === 'playlist_card' && m.playlist?._id === currentPlaylist._id) {
                     return { ...m, playlist: currentPlaylist };
                 }
                 return m;
             });
             return { ...s, messages: newMessages, generatedPlaylist: currentPlaylist };
          });

          if (attempts % 3 === 0) {
            const { usePlaylistStore } = await import('./usePlaylistStore');
            usePlaylistStore.getState().fetchUserPlaylists();
          }
          
          if (currentPlaylist.metadata?.importStatus === 'completed') {
            return true; 
          }
        } catch (e) {
          console.error('[YoutubeImport] Poll error:', e);
        }
        return false;
      };

      await new Promise(r => setTimeout(r, 4000));
      
      let isReady = false;
      while (attempts < maxAttempts && !isReady) {
          isReady = await poll();
          if (!isReady) await new Promise(r => setTimeout(r, 4000));
      }

      clearInterval(progressInterval);

      const userMsg: Message = { 
        id: Date.now().toString(), 
        type: 'user', 
        text: `Import YouTube playlist: ${url}` 
      };

      const cardMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'playlist_card',
        text: `I've imported your YouTube playlist as "${currentPlaylist.name}"!`,
        playlist: currentPlaylist
      };

      set((s) => ({
        generatedPlaylist: currentPlaylist,
        messages: [...s.messages, userMsg, cardMsg],
        generationStage: 'complete',
        isGenerating: false,
        progressMessage: 'Import complete!',
      }));
      
      const { usePlaylistStore } = await import('./usePlaylistStore');
      usePlaylistStore.getState().fetchUserPlaylists();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      clearInterval(progressInterval);
      set({
        error: error.response?.data?.message || 'Failed to import YouTube playlist. Check the URL and try again.',
        isGenerating: false,
        generationStage: 'error',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  },

  // ─────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────
  reset: () => set((s) => ({
    ...INITIAL_STATE,
    messages: [] // Allow full clear if explicitly called
  })),
  
  resetParams: () => set(INITIAL_STATE),
  
  clearError: () => set({ error: null, generationStage: 'idle' }),
  
  clearPlaylist: () => set({ generatedPlaylist: null }),
  
  goBack: () => {
    const { inputMode, currentStep, generationStage } = get();
    
    if (generationStage === 'error') {
      set({ error: null, generationStage: 'idle' });
      return;
    }
    
    if (inputMode === 'manual' && currentStep > 1) {
      set({ currentStep: currentStep - 1 });
    } else if (inputMode === 'manual' && currentStep === 1) {
      set({ inputMode: 'chat', currentStep: 0 });
    }
  },
}));