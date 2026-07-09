export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard requireAdmin>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header />
            <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
