import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  timeFormat: '12h' | '24h';
  notificationsEnabled: boolean;
  setTheme: (theme: 'light' | 'dark') => void;
  setTimeFormat: (format: '12h' | '24h') => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      timeFormat: '12h',
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
    }),
    {
      name: 'mimo-settings',
    }
  )
);
