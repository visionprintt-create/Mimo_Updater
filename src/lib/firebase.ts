import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyChRUWDi_hmkBXFsOZR7m85IJF0-MKAaGA',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mimo-updater.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mimo-updater',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mimo-updater.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '609460084395',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:609460084395:web:dc3a77f04d19cb187261ee',
};

function initFirebase() {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApp();
}

const app = initFirebase();
const auth = getAuth(app);
// Use initializeFirestore with long polling to fix "Could not reach Cloud Firestore backend" timeout errors
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const storage = getStorage(app);

export { app, auth, db, storage };
