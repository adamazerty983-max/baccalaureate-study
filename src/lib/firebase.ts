import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Initialize Firebase Auth
export const auth = getAuth(firebaseApp);

// Configure Firestore log level to avoid benign transport warning flood in iframe/proxy environments
try {
  setLogLevel('error');
} catch (e) {
  // Ignore
}

// Initialize Firestore with robust long-polling connection settings to prevent WebChannel stream disconnect warnings in web container / iframe proxies
export const db = (() => {
  try {
    const firestoreSettings = {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: true,
    };
    if (firebaseConfig.firestoreDatabaseId) {
      return initializeFirestore(firebaseApp, firestoreSettings, firebaseConfig.firestoreDatabaseId);
    }
    return initializeFirestore(firebaseApp, firestoreSettings);
  } catch (err) {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(firebaseApp);
  }
})();

export const googleProvider = new GoogleAuthProvider();

export {
  signInAnonymously,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
};

export type { FirebaseUser };
