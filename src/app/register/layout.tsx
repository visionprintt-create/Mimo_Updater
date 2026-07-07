export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
