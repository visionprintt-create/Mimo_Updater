import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import type { MimoUser, UserRole, Department, Invitation } from '@/types';

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
    status: role === 'admin' ? 'approved' : 'pending',
    internshipStartDate,
    internshipEndDate,
    joinedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'users', user.uid), mimoUser);

  return mimoUser;
}

// ─── Admin Create User ─────────────────────────────────────────────
export async function adminCreateUser(
  email: string,
  password: string,
  displayName: string,
  role: UserRole,
  departments: Department[],
  phoneNumber: string,
  internshipStartDate: string,
  internshipEndDate: string,
  adminId: string
): Promise<MimoUser> {
  // Initialize secondary app to avoid logging out the current admin
  const tempAppName = `TempApp_${new Date().getTime()}`;
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
    const credential = await createUserWithEmailAndPassword(tempAuth, email, password);
    const user = credential.user;

    await updateProfile(user, { displayName });

    const mimoUser: MimoUser = {
      uid: user.uid,
      email: email,
      displayName: displayName,
      role: role,
      departments: departments,
      phoneNumber: phoneNumber,
      status: 'approved', // Directly approved since admin created it
      internshipStartDate,
      internshipEndDate,
      joinedAt: new Date().toISOString(),
      approvedBy: adminId,
      approvedAt: new Date().toISOString(),
    };

    // Write to main db instance
    await setDoc(doc(db, 'users', user.uid), mimoUser);

    return mimoUser;
  } finally {
    // Always clean up the temporary app
    await deleteApp(tempApp);
  }
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

  // Auto-migrate legacy roles
  if (['founder', 'co-founder', 'hr'].includes(mimoUser.role as string)) {
    await updateDoc(doc(db, 'users', credential.user.uid), { role: 'admin' });
    mimoUser.role = 'admin' as UserRole;
  } else if (mimoUser.role as string === 'intern') {
    await updateDoc(doc(db, 'users', credential.user.uid), { role: 'employee' });
    mimoUser.role = 'employee' as UserRole;
  }

  // Auto-approve admins
  if (mimoUser.role === 'admin' && mimoUser.status === 'pending') {
    await updateDoc(doc(db, 'users', credential.user.uid), { status: 'approved' });
    mimoUser.status = 'approved';
  }

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

    // Auto-migrate legacy roles
    if (['founder', 'co-founder', 'hr'].includes(mimoUser.role as string)) {
      await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
      mimoUser.role = 'admin' as UserRole;
    } else if (mimoUser.role as string === 'intern') {
      await updateDoc(doc(db, 'users', user.uid), { role: 'employee' });
      mimoUser.role = 'employee' as UserRole;
    }
    
    // Auto-approve admins
    if (mimoUser.role === 'admin' && mimoUser.status === 'pending') {
      await updateDoc(doc(db, 'users', user.uid), { status: 'approved' });
      mimoUser.status = 'approved';
    }

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
  
  // If user doesn't exist, check if they have an invitation
  if (user.email) {
    const inviteDoc = await getDoc(doc(db, 'invitations', user.email.toLowerCase()));
    if (inviteDoc.exists()) {
      const invite = inviteDoc.data() as Invitation;
      
      // Auto-provision the user profile
      const mimoUser: MimoUser = {
        uid: user.uid,
        email: invite.email,
        displayName: invite.displayName,
        role: invite.role,
        departments: invite.departments,
        position: invite.position || '',
        phoneNumber: '',
        status: 'approved',
        joinedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), mimoUser);
      await deleteDoc(doc(db, 'invitations', user.email.toLowerCase()));
      
      return mimoUser;
    }
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
  
  const mimoUser = userDoc.data() as MimoUser;
  
  // Auto-migrate legacy roles
  if (['founder', 'co-founder', 'hr'].includes(mimoUser.role as string)) {
    await updateDoc(doc(db, 'users', uid), { role: 'admin' });
    mimoUser.role = 'admin' as UserRole;
  } else if (mimoUser.role as string === 'intern') {
    await updateDoc(doc(db, 'users', uid), { role: 'employee' });
    mimoUser.role = 'employee' as UserRole;
  }

  // Auto-approve admins
  if (mimoUser.role === 'admin' && mimoUser.status === 'pending') {
    await updateDoc(doc(db, 'users', uid), { status: 'approved' });
    mimoUser.status = 'approved';
  }

  return mimoUser;
}

// ─── Auth State Listener ───────────────────────────────────────────
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ─── Check if user is admin ────────────────────────────────────────
export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin';
}

export function isLead(role: UserRole | undefined): boolean {
  return role === 'lead';
}

// ─── Reset Password ────────────────────────────────────────────────
export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

