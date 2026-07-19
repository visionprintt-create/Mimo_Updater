'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { isAdmin } from '@/lib/auth';
import { DEPARTMENTS } from '@/types';
import { getTheme } from '@/lib/theme';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const { isMobileSidebarOpen, closeSidebar, deptFilter, setDeptFilter } = useUIStore();
  const admin = mimoUser && isAdmin(mimoUser.role);

  const depts = mimoUser?.departments || (mimoUser?.department ? [mimoUser.department] : []);
  const activeDept = deptFilter || depts[0];
  const C = getTheme(activeDept);

  const btnStyle = (active: boolean, specificDept?: string): React.CSSProperties => {
    const theme = specificDept ? getTheme(specificDept) : C;
    return {
      background: active ? theme.gradient : 'transparent',
      color: active ? '#ffffff' : C.textSecondary,
      border: 'none',
      borderRadius: '12px',
      padding: '12px 16px',
      cursor: 'pointer',
      fontWeight: active ? 600 : 400,
      fontSize: '13px',
      textAlign: 'left',
      width: '100%',
      transition: 'all 0.3s ease',
      display: 'block',
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
          padding: '24px 16px',
          gap: '32px',
          overflowY: 'auto',
          background: C.surface,
          borderRight: 'none',
          boxShadow: '2px 0 10px rgba(0,0,0,0.02)'
        }}
      >
        {/* Departments Section */}
        {!admin && (
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
                  style={btnStyle(deptFilter === d, d)}
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
        )}

        {/* Admin Navigation Section */}
        {admin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', color: C.textSecondary, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, paddingLeft: '8px' }}>
              Admin
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link href="/admin" onClick={closeSidebar} style={btnStyle(pathname === '/admin')}>
                Dashboard
              </Link>
              <Link href="/admin/analytics" onClick={closeSidebar} style={btnStyle(pathname === '/admin/analytics')}>
                Analytics
              </Link>
              <Link href="/admin/approvals" onClick={closeSidebar} style={btnStyle(pathname === '/admin/approvals')}>
                Team & Approvals
              </Link>
              <Link href="/admin/reviews" onClick={closeSidebar} style={btnStyle(pathname === '/admin/reviews')}>
                Work Reviews
              </Link>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
