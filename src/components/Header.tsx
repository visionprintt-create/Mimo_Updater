'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSessionStore } from '@/store/sessionStore';
import { signOutUser } from '@/lib/auth';

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
  const { dashboardTab, setDashboardTab } = useUIStore();
  const { remainingMs, isWorking, isOnBreak } = useSessionStore();
  const [showSignOut, setShowSignOut] = useState(false);

  const C = {
    bg: '#0A0A0A',
    surface: '#141414',
    border: '#2A2A2A',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    accent: '#FFFFFF',
  };

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

  return (
    <div style={{ 
      display:'flex', 
      alignItems:'center', 
      padding:'14px 24px', 
      borderBottom:`1px solid ${C.border}`, 
      gap:'20px', 
      flexShrink:0,
      background: C.bg 
    }}>
      {/* ═══ LEFT: Profile ═══ */}
      <div style={{ position:'relative', minWidth:'180px' }}>
        <div onClick={() => setShowSignOut(v=>!v)} style={{ cursor:'pointer' }}>
          <div style={{ fontWeight:700, fontSize:'15px', color: C.textPrimary }}>
            {mimoUser?.displayName || 'User'}
          </div>
          <div style={{ fontSize:'11px', color: C.textSecondary, textTransform:'capitalize', marginTop:'2px' }}>
            {mimoUser?.role} - {mimoUser?.department}
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
        <div style={{ display:'flex', gap:'4px', background:C.surface, padding:'4px', borderRadius:'12px', border:`1px solid ${C.border}` }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => handleTabClick(t)}
              style={{
                background: (dashboardTab === t && pathname === '/dashboard') ? '#333' : 'transparent',
                color: (dashboardTab === t && pathname === '/dashboard') ? C.textPrimary : C.textSecondary,
                border: 'none', padding: '6px 20px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: (dashboardTab === t && pathname === '/dashboard') ? 600 : 400, fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ RIGHT: Timer ═══ */}
      <div style={{ minWidth:'180px', display:'flex', justifyContent:'flex-end', alignItems:'center' }}>
        <div style={{
          background: isOnBreak ? '#3f3f46' : (isWorking ? '#1e293b' : C.surface),
          color: isOnBreak ? '#d4d4d8' : (isWorking ? '#f8fafc' : C.textPrimary),
          padding: '8px 16px', borderRadius: '8px', fontFamily: 'monospace',
          fontSize: '18px', fontWeight: 700, border: `1px solid ${C.border}`,
          letterSpacing: '1px'
        }}>
          {formatTime(remainingMs)}
        </div>
      </div>
    </div>
  );
}
