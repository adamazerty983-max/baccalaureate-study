import {
  auth,
  db,
  doc,
  setDoc,
  onSnapshot,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  googleProvider,
  FirebaseUser,
} from '../lib/firebase';
import { FullAppData } from '../types';

export type { FirebaseUser };

export interface DatabaseSyncState {
  status: 'connecting' | 'connected' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: string | null;
  errorMessage: string | null;
  currentUser: FirebaseUser | null;
  isAnonymous: boolean;
}

/**
 * Initializes Firebase Auth listener and attaches a real-time Firestore listener when authenticated
 */
export function initAuthListener(
  onUserStateChanged: (user: FirebaseUser | null) => void,
  onRemoteDataUpdate: (remoteData: FullAppData) => void,
  onSyncStatusChange: (status: DatabaseSyncState) => void
): () => void {
  let unsubscribeFirestoreDoc: (() => void) | null = null;

  const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
    if (user) {
      onUserStateChanged(user);
      onSyncStatusChange({
        status: 'connected',
        lastSyncedAt: null,
        errorMessage: null,
        currentUser: user,
        isAnonymous: user.isAnonymous,
      });

      // Save/update basic user record in users/{uid}
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            id: user.uid,
            email: user.email || (user.isAnonymous ? 'anonymous@bac.hub' : ''),
            displayName: user.displayName || (user.isAnonymous ? 'Élève Bac' : 'Élève'),
            isAnonymous: user.isAnonymous,
            lastLoginAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        // Non-blocking user profile touch
      }

      // Listen to real-time changes on userData/{uid}
      if (unsubscribeFirestoreDoc) {
        unsubscribeFirestoreDoc();
      }

      const userDataRef = doc(db, 'userData', user.uid);
      unsubscribeFirestoreDoc = onSnapshot(
        userDataRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as FullAppData & { userId?: string };
            onRemoteDataUpdate(data);
            onSyncStatusChange({
              status: 'synced',
              lastSyncedAt: new Date().toLocaleTimeString(),
              errorMessage: null,
              currentUser: user,
              isAnonymous: user.isAnonymous,
            });
          }
        },
        (error) => {
          console.warn('Firestore real-time listener note:', error.message);
          onSyncStatusChange({
            status: 'error',
            lastSyncedAt: null,
            errorMessage: error.message,
            currentUser: user,
            isAnonymous: user.isAnonymous,
          });
        }
      );
    } else {
      if (unsubscribeFirestoreDoc) {
        unsubscribeFirestoreDoc();
        unsubscribeFirestoreDoc = null;
      }
      onUserStateChanged(null);
      onSyncStatusChange({
        status: 'offline',
        lastSyncedAt: null,
        errorMessage: null,
        currentUser: null,
        isAnonymous: false,
      });
    }
  });

  return () => {
    if (unsubscribeFirestoreDoc) unsubscribeFirestoreDoc();
    unsubscribeAuth();
  };
}

// In-flight Google sign-in singleton promise to prevent concurrent popups
let googleSignInPromise: Promise<{ success: boolean; user?: FirebaseUser; error?: string }> | null = null;

/**
 * Auth Helper: Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  if (googleSignInPromise) {
    return googleSignInPromise;
  }

  googleSignInPromise = (async () => {
    try {
      googleProvider.setCustomParameters({
        prompt: 'select_account',
      });
      const result = await signInWithPopup(auth, googleProvider);
      return { success: true, user: result.user };
    } catch (err: any) {
      const code = err?.code || '';

      // Gracefully handle expected user cancellation & popup closing without spamming red error traces
      if (
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user'
      ) {
        return { success: false, error: 'Connexion annulée par l\'utilisateur.' };
      }

      if (code === 'auth/popup-blocked') {
        return {
          success: false,
          error: 'Le popup a été bloqué par votre navigateur. Veuillez autoriser les fenêtres surgissantes (popups) pour ce site.',
        };
      }

      if (code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: 'Ce domaine d\'hébergement n\'est pas encore autorisé dans Firebase Auth. Veuillez vérifier les domaines autorisés.',
        };
      }

      console.warn('Google Sign In note:', err?.message || err);
      return { success: false, error: err?.message || 'Erreur lors de la connexion Google.' };
    } finally {
      googleSignInPromise = null;
    }
  })();

  return googleSignInPromise;
}

/**
 * Auth Helper: Sign in with Email / Password
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { success: true, user: result.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Auth Helper: Register with Email / Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    return { success: true, user: result.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Auth Helper: Sign out (will trigger anonymous login)
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
}
