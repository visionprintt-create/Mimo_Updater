'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { signOutUser } from '@/lib/auth';
import { DEPARTMENTS } from '@/types';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileSidebarOpen, closeSidebar, deptFilter, setDeptFilter } = useUIStore();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const btnStyle = (active: boolean): React.CSSProperties => {
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      margin: '4px 16px',
      borderRadius: '12px',
      color: active ? '#2D3A37' : '#516863',
      background: active ? '#D69B69' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 500,
      fontSize: '15px',
      textAlign: 'left',
      width: 'calc(100% - 32px)',
      transition: 'all 0.2s',
      textDecoration: 'none'
    };
  };

  return (
    <>
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40 }} />
      )}
      
      <aside 
        className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '260px',
          background: '#A9BDB8', // Mint background matching admin sidebar
          borderRight: 'none',
          boxShadow: '2px 0 10px rgba(0,0,0,0.02)',
          overflowY: 'auto',
          height: '100vh',
          position: 'sticky',
          top: 0
        }}
      >
        {/* Logo Area */}
        <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#2D3A37', letterSpacing: '1px' }}>
            MIMO <span style={{ color: '#D69B69', fontStyle: 'italic' }}>MONITOR</span>
          </div>
        </div>

        {/* Departments Section */}
        <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', color: '#516863', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, paddingLeft: '32px', marginBottom: '8px' }}>
            Departments
          </div>
          {DEPARTMENTS.map(d => {
            const isActive = deptFilter === d;
            return (
              <button
                key={d}
                onClick={() => {
                  if (pathname !== '/dashboard') router.push('/dashboard');
                  setDeptFilter(isActive ? null : d);
                  closeSidebar();
                }}
                style={btnStyle(isActive)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.color = '#2D3A37';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#516863';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {d}
                </div>
                {isActive && (
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
          
          {deptFilter && (
            <button 
              onClick={() => setDeptFilter(null)} 
              style={{ ...btnStyle(false), color: '#516863', fontSize: '13px', paddingLeft: '52px', marginTop: '4px' }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#2D3A37';
              }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#516863';
              }}
            >
              Clear filter
            </button>
          )}
        </nav>

        {/* Bottom Actions */}
        <div style={{ marginTop: 'auto', padding: '32px 16px', borderTop: 'none' }}>
          <div 
            onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#2D3A37', cursor: 'pointer', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 500 }}>Sign Out</span>
          </div>
        </div>

      </aside>
    </>
  );
}
