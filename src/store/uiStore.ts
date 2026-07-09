import { create } from 'zustand';

import { Department } from '@/types';

type DashboardTab = 'Today' | 'History' | 'Tasks';

interface UIState {
  isMobileSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  
  dashboardTab: DashboardTab;
  setDashboardTab: (tab: DashboardTab) => void;
  
  deptFilter: Department | null;
  setDeptFilter: (dept: Department | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobileSidebarOpen: false,
  openSidebar: () => set({ isMobileSidebarOpen: true }),
  closeSidebar: () => set({ isMobileSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  
  dashboardTab: 'Today',
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
  
  deptFilter: null,
  setDeptFilter: (dept) => set({ deptFilter: dept }),
}));
