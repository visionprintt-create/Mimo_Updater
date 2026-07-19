export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';
import AuthGuard from '@/components/AuthGuard';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import './admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard requireAdmin>
        <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
          <AdminSidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <AdminHeader />
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {children}
              </div>
            </main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
