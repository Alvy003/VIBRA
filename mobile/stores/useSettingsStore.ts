import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';

export type AudioQualitySetting = 'automatic' | 'low' | 'medium' | 'high';

interface SettingsState {
  autoplay: boolean;
  wifiAudioQuality: AudioQualitySetting;
  mobileAudioQuality: AudioQualitySetting;
  
  setAutoplay: (value: boolean) => void;
  setWifiAudioQuality: (value: AudioQualitySetting) => void;
  setMobileAudioQuality: (value: AudioQualitySetting) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      autoplay: true,
      wifiAudioQuality: 'automatic',
      mobileAudioQuality: 'automatic',

      setAutoplay: (autoplay) => set({ autoplay }),
      setWifiAudioQuality: (wifiAudioQuality) => set({ wifiAudioQuality }),
      setMobileAudioQuality: (mobileAudioQuality) => set({ mobileAudioQuality }),
    }),
    {
      name: 'vibra-settings-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
