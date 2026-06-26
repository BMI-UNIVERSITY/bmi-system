/* eslint-disable */
/* eslint-disable */
/**
 * BMI UMS - UI Store (Zustand)
 * Centralizes UI-level state: theme, sidebar, modals, logo.
 * Removes these concerns from App.tsx and ViewRenderer.
 */
import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  logo: string;
  isSidebarOpen: boolean;
  isAIModalOpen: boolean;
  isNotificationCenterOpen: boolean;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setLogo: (logo: string) => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openAIModal: () => void;
  closeAIModal: () => void;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  toggleNotificationCenter: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'light',
  logo: '/BMI.svg',
  isSidebarOpen: false,
  isAIModalOpen: false,
  isNotificationCenterOpen: false,

  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    get().setTheme(current === 'dark' ? 'light' : 'dark');
  },

  setLogo: (logo) => set({ logo }),

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

  openAIModal: () => set({ isAIModalOpen: true }),
  closeAIModal: () => set({ isAIModalOpen: false }),

  openNotificationCenter: () => set({ isNotificationCenterOpen: true }),
  closeNotificationCenter: () => set({ isNotificationCenterOpen: false }),
  toggleNotificationCenter: () => set((state) => ({ isNotificationCenterOpen: !state.isNotificationCenterOpen })),
}));









