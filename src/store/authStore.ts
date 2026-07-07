'use client';

import { create } from 'zustand';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { MimoUser } from '@/types';
import { onAuthChange, signOutUser, isAdmin } from '@/lib/auth';
import { db } from '@/lib/firebase';

interface AuthState {
  firebaseUser: User | null;
  mimoUser: MimoUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdminUser: boolean;
  setFirebaseUser: (user: User | null) => void;
  setMimoUser: (user: MimoUser | null) => void;
  setLoading: (loading: boolean) => void;
  initAuth: () => () => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  mimoUser: null,
  loading: true,
  isAuthenticated: false,
  isAdminUser: false,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setMimoUser: (user) =>
    set({
      mimoUser: user,
      isAuthenticated: !!user && user.status === 'approved',
      isAdminUser: !!user && isAdmin(user.role),
    }),
  setLoading: (loading) => set({ loading }),

  initAuth: () => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthChange((firebaseUser) => {
      // Clean up previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (firebaseUser) {
        set({ firebaseUser, loading: true });

        // Real-time listener on user profile — detects status changes instantly
        profileUnsubscribe = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          async (snap) => {
            if (!snap.exists()) {
              set({ mimoUser: null, isAuthenticated: false, isAdminUser: false, loading: false });
              return;
            }

            const profile = { ...snap.data(), uid: snap.id } as MimoUser;

            // Auto sign-out if suspended or rejected
            if (profile.status === 'suspended' || profile.status === 'rejected') {
              await signOutUser();
              set({
                firebaseUser: null,
                mimoUser: null,
                isAuthenticated: false,
                isAdminUser: false,
                loading: false,
              });
              return;
            }

            set({
              mimoUser: profile,
              isAuthenticated: profile.status === 'approved',
              isAdminUser: isAdmin(profile.role),
              loading: false,
            });
          },
          () => {
            // On error (e.g. permission denied after suspend), sign out
            signOutUser();
            set({ firebaseUser: null, mimoUser: null, isAuthenticated: false, isAdminUser: false, loading: false });
          }
        );
      } else {
        set({
          firebaseUser: null,
          mimoUser: null,
          isAuthenticated: false,
          isAdminUser: false,
          loading: false,
        });
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  },

  reset: () =>
    set({
      firebaseUser: null,
      mimoUser: null,
      loading: false,
      isAuthenticated: false,
      isAdminUser: false,
    }),
}));
