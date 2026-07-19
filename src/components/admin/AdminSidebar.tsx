'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/auth';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  const links = [
    { name: 'Analytics', href: '/admin', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Team & Approvals', href: '/admin/approvals', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Work Reviews', href: '/admin/reviews', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { name: 'Employee View', href: '/dashboard', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  ];

  return (
    <aside className="admin-sidebar">
      {/* Logo Area */}
      <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '1px' }}>
          MIMO <span style={{ color: 'var(--mimo-primary)', fontStyle: 'italic' }}>MONITOR</span>
        </div>
        <div style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', marginLeft: 'auto' }}>
          ADMIN
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {links.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`admin-nav-item ${isActive ? 'active' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                </svg>
                {link.name}
              </div>
              {isActive && (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div style={{ marginTop: 'auto', padding: '32px 16px', borderTop: 'none' }}>
        <div 
          onClick={handleSignOut}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-primary)', cursor: 'pointer', padding: '12px 16px', borderRadius: '8px', transition: 'all 0.2s' }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span style={{ fontSize: '15px', fontWeight: 500 }}>Sign Out</span>
        </div>
      </div>
    </aside>
  );
}
