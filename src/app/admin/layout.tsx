export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ThemeWrapper from '@/components/ThemeWrapper';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard requireAdmin>
        <ThemeWrapper>
          <div className="app-layout">
            <Sidebar />
            <Header />
            <main className="main-content">{children}</main>
          </div>
        </ThemeWrapper>
      </AuthGuard>
    </AuthProvider>
  );
}
