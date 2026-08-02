import { create } from 'zustand';
import { ThemeMode } from '../types';

interface UIState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

export const useUIStore = create<UIState>((set) => {
  const savedTheme = (localStorage.getItem('bmi_theme') as ThemeMode) || 'emerald';

  // Side effect for initial load
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = savedTheme;
  }

  return {
    theme: savedTheme,
    setTheme: (theme) => {
      localStorage.setItem('bmi_theme', theme);
      document.documentElement.dataset.theme = theme;
      set({ theme });
    }
  };
});
