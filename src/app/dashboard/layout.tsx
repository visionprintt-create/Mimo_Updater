export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div style={{ width: '100vw', minHeight: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'auto' }}>
          {children}
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
