'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSessionStore } from '@/store/sessionStore';
import { signOutUser } from '@/lib/auth';
import { getTheme } from '@/lib/theme';
import Notifications from './Notifications';

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { mimoUser } = useAuthStore();
  const { dashboardTab, setDashboardTab, toggleSidebar } = useUIStore();
  const { activeSession, remainingMs, isWorking, isOnBreak, isClockingIn, clockIn, clockOut } = useSessionStore();
  const [showSignOut, setShowSignOut] = useState(false);

  const { deptFilter, setDeptFilter } = useUIStore();
  const depts = mimoUser?.departments || (mimoUser?.department ? [mimoUser.department] : []);
  const activeDept = deptFilter || depts[0];
  const C = getTheme(activeDept);

  const TABS = ['Today', 'History', 'Tasks'] as const;

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const handleTabClick = (tab: 'Today' | 'History' | 'Tasks') => {
    setDashboardTab(tab);
    if (pathname !== '/dashboard') {
      router.push('/dashboard');
    }
  };

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <header className="header" style={{ 
        display:'flex', alignItems:'center', justifyContent:'space-between', 
        padding:'0 32px',
        height: '80px',
        flexShrink:0,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.02)',
        position: 'fixed',
        top: 0,
        right: 0,
        marginTop: '16px',
        zIndex: 50
      }}>
      {/* ═══ LEFT: Navigation ═══ */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center' }}>
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Menu" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.textPrimary }}>
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* ═══ CENTER: Tabs (Absolutely Centered) ═══ */}
      {!isAdminRoute && (
        <div className="header-tabs" style={{ 
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display:'flex', gap:'4px', background: 'rgba(0,0,0,0.05)', padding:'4px', borderRadius:'14px' 
        }}>
          {TABS.map(t => {
            const active = dashboardTab === t && pathname === '/dashboard';
            return (
              <button
                key={t}
                className="header-tab-btn"
                onClick={() => handleTabClick(t)}
                style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? C.textPrimary : C.textSecondary,
                  border: 'none', padding: '8px 24px', borderRadius: '10px', cursor: 'pointer',
                  fontWeight: active ? 600 : 500, fontSize: '13px',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══ RIGHT: Timer & Actions ═══ */}
      <div className="header-right" style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'16px' }}>
        <Notifications />
        {!isAdminRoute && (
          <>
            {(isWorking || activeSession) && (
              <div className="header-timer" style={{
                background: isOnBreak ? '#fffbeb' : (isWorking ? '#f0fdf4' : '#fef2f2'),
                color: isOnBreak ? '#b45309' : (isWorking ? '#166534' : '#991b1b'),
                padding: '6px 12px', borderRadius: '8px', fontFamily: 'monospace',
                fontSize: '16px', fontWeight: 700, letterSpacing: '1px',
                border: isOnBreak ? '1px solid #fde68a' : (isWorking ? '1px solid #bbf7d0' : '1px solid #fecaca'),
              }}>
                {isWorking ? formatTime(remainingMs) : 'PENDING'}
              </div>
            )}
            
            {activeSession && !isWorking ? (
              <button 
                className="header-action-btn"
                onClick={() => { setDeptFilter(null); setDashboardTab('Today'); router.push('/dashboard'); }}
                style={{ background: '#ef4444', color: '#ffffff', border:'none', borderRadius:'10px', padding:'10px 20px', fontWeight:700, fontSize:'13px', cursor: 'pointer', boxShadow: '0 4px 6px rgba(239,68,68,0.2)' }}
              >
                Submit Pending Log
              </button>
            ) : !isWorking ? (
              <button 
                className="header-action-btn"
                onClick={() => mimoUser && !isClockingIn && clockIn(mimoUser.uid, mimoUser.displayName, depts)}
                disabled={isClockingIn}
                style={{ background: isClockingIn ? C.border : C.gradient, color: isClockingIn ? C.textSecondary : '#ffffff', border:'none', borderRadius:'10px', padding:'10px 20px', fontWeight:700, fontSize:'13px', cursor: isClockingIn ? 'wait' : 'pointer', transition: 'all 0.3s ease', boxShadow: isClockingIn ? 'none' : '0 4px 6px rgba(0,0,0,0.1)' }}
              >
                {isClockingIn ? 'Starting...' : 'Start Session'}
              </button>
            ) : (
              <button 
                className="header-action-btn"
                onClick={() => clockOut()}
                style={{ background: '#ef4444', color:'#fff', border:'none', borderRadius:'10px', padding:'10px 20px', fontWeight:700, fontSize:'13px', cursor:'pointer', boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)' }}
              >
                End Session
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
