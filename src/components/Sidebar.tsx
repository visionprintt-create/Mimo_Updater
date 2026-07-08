'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { signOutUser, isAdmin } from '@/lib/auth';

const DEPT_COLORS: Record<string, string> = {
  'Marketing': 'var(--dept-marketing)',
  'Technical Team': 'var(--dept-technical)',
  'Hardware Team': 'var(--dept-hardware)',
  'Finance': 'var(--dept-finance)',
  'Design': 'var(--dept-design)',
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mimoUser } = useAuthStore();
  const { isMobileSidebarOpen, closeSidebar } = useUIStore();
  const admin = mimoUser && isAdmin(mimoUser.role);

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const avatarColor = mimoUser ? DEPT_COLORS[mimoUser.department] || 'var(--mimo-primary)' : 'var(--mimo-primary)';
  const initials = mimoUser?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <>
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}
      
      <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div>
            <div className="sidebar-logo">Mimo</div>
            <div className="sidebar-subtitle">WorkTracker</div>
          </div>
        </div>

        <nav className="sidebar-nav" onClick={closeSidebar}>
          {admin ? (
          <>
            <div className="sidebar-section-title">Admin</div>
            <Link
              href="/admin"
              className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}
            >
              <span className="nav-icon">📊</span>
              Overview
            </Link>
            <Link
              href="/admin/approvals"
              className={`nav-link ${pathname === '/admin/approvals' ? 'active' : ''}`}
            >
              <span className="nav-icon">✅</span>
              Approvals
            </Link>
            <Link
              href="/admin/reviews"
              className={`nav-link ${pathname === '/admin/reviews' ? 'active' : ''}`}
            >
              <span className="nav-icon">📋</span>
              Work Reviews
            </Link>
            <Link
              href="/admin/analytics"
              className={`nav-link ${pathname === '/admin/analytics' ? 'active' : ''}`}
            >
              <span className="nav-icon">📈</span>
              Analytics
            </Link>
            <Link
              href="/admin/team"
              className={`nav-link ${pathname === '/admin/team' ? 'active' : ''}`}
            >
              <span className="nav-icon">👥</span>
              Team
            </Link>

            <div className="sidebar-section-title" style={{ marginTop: '8px' }}>
              My Work
            </div>
            <Link
              href="/dashboard"
              className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <span className="nav-icon">⏱️</span>
              My Dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="sidebar-section-title">Workspace</div>
            <Link
              href="/dashboard"
              className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <span className="nav-icon">⏱️</span>
              Dashboard
            </Link>
            <Link
              href="/dashboard/history"
              className={`nav-link ${pathname === '/dashboard/history' ? 'active' : ''}`}
            >
              <span className="nav-icon">📅</span>
              Work History
            </Link>
            <Link
              href="/dashboard/notifications"
              className={`nav-link ${pathname === '/dashboard/notifications' ? 'active' : ''}`}
            >
              <span className="nav-icon">🔔</span>
              Notifications
            </Link>
            <Link
              href="/dashboard/profile"
              className={`nav-link ${pathname === '/dashboard/profile' ? 'active' : ''}`}
            >
              <span className="nav-icon">👤</span>
              Profile
            </Link>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="avatar"
            style={{ background: avatarColor }}
          >
            {initials}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{mimoUser?.displayName || 'User'}</div>
            <div className="sidebar-user-role">{mimoUser?.role || 'Intern'}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleSignOut}
          style={{ width: '100%', marginTop: '8px' }}
        >
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
}
