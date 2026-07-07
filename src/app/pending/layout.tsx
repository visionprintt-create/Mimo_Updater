export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';

export default function PendingLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
