'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { isAdmin } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const { firebaseUser, mimoUser, loading } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace('/login');
      return;
    }

    if (!mimoUser) {
      router.replace('/onboarding');
      return;
    }

    if (mimoUser.status === 'pending') {
      router.replace('/pending');
      return;
    }

    if (mimoUser.status === 'rejected') {
      import('@/lib/auth').then(({ signOutUser }) => {
        signOutUser().then(() => {
          router.replace('/login');
        });
      });
      return;
    }

    if (mimoUser.status === 'suspended') {
      import('@/lib/auth').then(({ signOutUser }) => {
        signOutUser().then(() => {
          router.replace('/login');
        });
      });
      return;
    }

    if (requireAdmin && !isAdmin(mimoUser.role)) {
      router.replace('/dashboard');
      return;
    }

    setChecked(true);
  }, [firebaseUser, mimoUser, loading, requireAdmin, router]);

  if (loading || !checked) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
}
