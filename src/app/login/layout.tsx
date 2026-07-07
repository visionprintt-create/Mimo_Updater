export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
