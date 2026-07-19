import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { MimoUser, UserRole, Department } from '@/types';

// ─── Sign Up ───────────────────────────────────────────────────────
export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  departments: Department[],
  phoneNumber: string,
  internshipStartDate: string,
  internshipEndDate: string
): Promise<MimoUser> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;

  await updateProfile(user, { displayName });

  const mimoUser: MimoUser = {
    uid: user.uid,
    email: email,
    displayName: displayName,
    role: role,
    departments: departments,
    phoneNumber: phoneNumber,
    status: 'pending',
    internshipStartDate,
    internshipEndDate,
    joinedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', user.uid), mimoUser);

  return mimoUser;
}

// ─── Complete Onboarding (for Google Sign In) ──────────────────────
export async function completeOnboarding(
  user: User,
  role: UserRole,
  departments: Department[],
  phoneNumber: string,
  internshipStartDate: string,
  internshipEndDate: string
): Promise<MimoUser> {
  const mimoUser: MimoUser = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || 'Unknown User',
    role: role,
    departments: departments,
    phoneNumber: phoneNumber,
    status: 'pending',
    internshipStartDate,
    internshipEndDate,
    joinedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', user.uid), mimoUser);

  return mimoUser;
}

// ─── Sign In ───────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, 'users', credential.user.uid));

  if (!userDoc.exists()) {
    throw new Error('User profile not found. Please contact admin.');
  }

  const mimoUser = userDoc.data() as MimoUser;

  if (mimoUser.status === 'pending') {
    throw new Error('PENDING_APPROVAL');
  }

  if (mimoUser.status === 'rejected') {
    throw new Error('ACCOUNT_REJECTED');
  }

  if (mimoUser.status === 'suspended') {
    throw new Error('ACCOUNT_SUSPENDED');
  }

  return mimoUser;
}

// ─── Google Sign In ────────────────────────────────────────────────
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // Prompt users to select an account, allowing multiple accounts
  provider.setCustomParameters({ prompt: 'select_account' });
  
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;
  
  // Check if profile exists
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  
  if (userDoc.exists()) {
    const mimoUser = userDoc.data() as MimoUser;
    
    if (mimoUser.status === 'pending') {
      throw new Error('PENDING_APPROVAL');
    }
    if (mimoUser.status === 'rejected') {
      throw new Error('ACCOUNT_REJECTED');
    }
    if (mimoUser.status === 'suspended') {
      throw new Error('ACCOUNT_SUSPENDED');
    }
    
    return mimoUser;
  }
  
  // Return null to indicate they need onboarding
  return null;
}

// ─── Sign Out ──────────────────────────────────────────────────────
export async function signOutUser() {
  await firebaseSignOut(auth);
}

// ─── Get Current User Profile ──────────────────────────────────────
export async function getUserProfile(uid: string): Promise<MimoUser | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as MimoUser;
}

// ─── Auth State Listener ───────────────────────────────────────────
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ─── Check if user is admin ────────────────────────────────────────
export function isAdmin(role: UserRole): boolean {
  return ['founder', 'co-founder', 'hr'].includes(role);
}
