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
        <div className="app-layout">
          <Sidebar />
          <Header />
          <main className="main-content">{children}</main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
