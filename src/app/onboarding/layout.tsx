export const dynamic = 'force-dynamic';

import AuthProvider from '@/components/AuthProvider';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
