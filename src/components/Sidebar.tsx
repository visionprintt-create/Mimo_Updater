'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { isAdmin } from '@/lib/auth';
import { DEPARTMENTS, Department } from '@/types';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const { isMobileSidebarOpen, closeSidebar, deptFilter, setDeptFilter } = useUIStore();
  const admin = mimoUser && isAdmin(mimoUser.role);

  const C = {
    bg: '#0A0A0A',
    surface: '#141414',
    border: '#2A2A2A',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    accent: '#FFFFFF',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? C.accent : 'transparent',
    color: active ? '#000' : C.textSecondary,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: '16px', // Pill shaped
    padding: '10px 16px',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: '13px',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s',
    display: 'block',
    textDecoration: 'none'
  });

  return (
    <>
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:40 }} />
      )}
      
      <aside 
        className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}
        style={{ 
          background: C.bg, 
          padding: '24px 16px',
          gap: '32px',
          overflowY: 'auto'
        }}
      >
        {/* Departments Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, paddingLeft: '8px' }}>
            Departments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {DEPARTMENTS.map(d => (
              <button
                key={d}
                onClick={() => {
                  if (pathname !== '/dashboard') router.push('/dashboard');
                  setDeptFilter(deptFilter === d ? null : d);
                  closeSidebar();
                }}
                style={btnStyle(deptFilter === d)}
              >
                {d}
              </button>
            ))}
            {deptFilter && (
              <button 
                onClick={() => setDeptFilter(null)} 
                style={{ ...btnStyle(false), border:'none', color:C.textSecondary, fontSize:'12px', textAlign:'center', marginTop:'4px' }}
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Admin Navigation Section */}
        {admin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, paddingLeft: '8px' }}>
              Admin
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/admin" onClick={closeSidebar} style={btnStyle(pathname === '/admin')}>
                Overview
              </Link>
              <Link href="/admin/approvals" onClick={closeSidebar} style={btnStyle(pathname === '/admin/approvals')}>
                Approvals
              </Link>
              <Link href="/admin/reviews" onClick={closeSidebar} style={btnStyle(pathname === '/admin/reviews')}>
                Work Reviews
              </Link>
              <Link href="/admin/analytics" onClick={closeSidebar} style={btnStyle(pathname === '/admin/analytics')}>
                Analytics
              </Link>
              <Link href="/admin/team" onClick={closeSidebar} style={btnStyle(pathname === '/admin/team')}>
                Team
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
