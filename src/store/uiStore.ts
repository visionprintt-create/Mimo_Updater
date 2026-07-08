import { create } from 'zustand';

interface UIState {
  isMobileSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileSidebarOpen: false,
  openSidebar: () => set({ isMobileSidebarOpen: true }),
  closeSidebar: () => set({ isMobileSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
}));
