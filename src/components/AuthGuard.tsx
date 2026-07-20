'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { hasPermission, Permission } from '@/lib/permissions';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export default function AuthGuard({ children, requiredPermission }: AuthGuardProps) {
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

    if (requiredPermission && !hasPermission(mimoUser.role, requiredPermission)) {
      if (mimoUser.role === 'admin') router.replace('/admin/dashboard');
      else if (mimoUser.role === 'lead') router.replace('/lead/dashboard');
      else router.replace('/employee/dashboard');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [firebaseUser, mimoUser, loading, requiredPermission, router]);

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
