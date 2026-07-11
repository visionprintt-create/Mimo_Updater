'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTheme } from '@/lib/theme';

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { mimoUser } = useAuthStore();
  const { deptFilter } = useUIStore();
  
  useEffect(() => {
    const activeDept = deptFilter || mimoUser?.department;
    const theme = getTheme(activeDept);
    
    // Apply theme to body
    document.body.style.background = theme.bg;
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.color = theme.textPrimary;
    document.body.style.transition = 'background 0.4s ease, color 0.4s ease';
  }, [deptFilter, mimoUser]);

  return <>{children}</>;
}
