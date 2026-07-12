'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSessionStore } from '@/store/sessionStore';
import { signOutUser } from '@/lib/auth';
import { getTheme } from '@/lib/theme';

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
  const { remainingMs, isWorking, isOnBreak, isClockingIn, clockIn, clockOut } = useSessionStore();
  const [showSignOut, setShowSignOut] = useState(false);

  const { deptFilter } = useUIStore();
  const activeDept = deptFilter || mimoUser?.department;
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
        padding:'0 24px',
        flexShrink:0,
        background: 'rgba(90, 80, 70, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
      {/* ═══ LEFT: Profile ═══ */}
      <div className="header-left" style={{ position:'relative', display: 'flex', alignItems: 'center' }}>
        <button className="mobile-menu-btn" onClick={toggleSidebar} aria-label="Menu" style={{ color: '#ffffff' }}>
          ☰
        </button>
        <div className="header-user-info" onClick={() => setShowSignOut(v=>!v)} style={{ cursor:'pointer', display: 'flex', flexDirection: 'column' }}>
          <div className="header-name" style={{ fontWeight:800, fontSize:'16px', color: '#ffffff', letterSpacing: '-0.02em' }}>
            {mimoUser?.displayName || 'User'}
          </div>
          <div className="header-dept" style={{ fontSize:'12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginTop:'2px' }}>
            {mimoUser?.role} • <span style={{ color: C.accent }}>{mimoUser?.department}</span>
          </div>
        </div>
        {showSignOut && (
          <div style={{ 
            position:'absolute', top:'100%', left:0, marginTop:'8px', 
            background:C.surface, border:`1px solid ${C.border}`, borderRadius:'8px', 
            padding:'6px', zIndex:50, minWidth:'120px', boxShadow:'0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <button 
              onClick={handleSignOut}
              style={{
                width:'100%', padding:'8px 12px', background:'transparent', border:'none',
                color:'#ef4444', textAlign:'left', cursor:'pointer', fontSize:'13px',
                borderRadius:'6px'
              }}
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* ═══ CENTER: Tabs ═══ */}
      <div style={{ flex:1, display:'flex', justifyContent:'center' }}>
        {!isAdminRoute && (
          <div className="header-tabs" style={{ display:'flex', gap:'8px', background: 'rgba(255,255,255,0.08)', padding:'6px', borderRadius:'14px' }}>
            {TABS.map(t => {
              const active = dashboardTab === t && pathname === '/dashboard';
              return (
                <button
                  key={t}
                  className="header-tab-btn"
                  onClick={() => handleTabClick(t)}
                  style={{
                    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    border: 'none', padding: '6px 24px', borderRadius: '10px', cursor: 'pointer',
                    fontWeight: active ? 600 : 500, fontSize: '13px',
                    boxShadow: active ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ RIGHT: Timer & Actions ═══ */}
      <div className="header-right" style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'16px' }}>
        {!isAdminRoute && (
          <>
            <div className="header-timer" style={{
              background: isOnBreak ? '#fffbeb' : (isWorking ? '#f0fdf4' : 'transparent'),
              color: isOnBreak ? '#b45309' : (isWorking ? '#166534' : '#ffffff'),
              padding: '6px 12px', borderRadius: '8px', fontFamily: 'monospace',
              fontSize: '16px', fontWeight: 700, letterSpacing: '1px',
              border: isOnBreak ? '1px solid #fde68a' : (isWorking ? '1px solid #bbf7d0' : 'none'),
            }}>
              {formatTime(remainingMs)}
            </div>
            {!isWorking ? (
              <button 
                className="header-action-btn"
                onClick={() => mimoUser && !isClockingIn && clockIn(mimoUser.uid, mimoUser.displayName, mimoUser.department)}
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
