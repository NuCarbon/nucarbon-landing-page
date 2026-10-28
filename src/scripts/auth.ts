// Firebase session helpers. Rendering account markup lives in user-display.ts.
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider } from './firebase';
import { clearCheckoutState } from './checkout/storage';

// Firebase restores the persisted session asynchronously. Never read
// auth.currentUser before this first state notification has fired.
export const authReady = new Promise<User | null>((resolve) => {
  let unsubscribe: (() => void) | undefined;

  const finish = (user: User | null) => {
    unsubscribe?.();
    resolve(user);
  };

  unsubscribe = onAuthStateChanged(auth, finish, () => finish(null));
});

/** The current user, including sign-ins that happened after the page loaded. */
export async function currentUser(): Promise<User | null> {
  await authReady;
  return auth.currentUser;
}

/** Calls back with the restored session and on every later sign-in or sign-out. */
export function onUserChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback, () => callback(null));
}

const signInMessages: Record<string, string> = {
  'auth/popup-closed-by-user': 'O login foi cancelado.',
  'auth/cancelled-popup-request': 'O login foi cancelado.',
  'auth/popup-blocked':
    'O navegador bloqueou a janela de login. Permita pop-ups e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet e tente novamente.',
};

export async function signInWithGoogle(): Promise<User> {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    return user;
  } catch (cause) {
    const code = cause instanceof FirebaseError ? cause.code : '';
    throw new Error(signInMessages[code] ?? 'Não foi possível entrar. Tente novamente.');
  }
}

/** Signs in when needed, then saves any calculator answers made while signed out. */
export async function signInAndSyncDraft(): Promise<User> {
  const user = (await currentUser()) ?? (await signInWithGoogle());
  // Loaded on demand: the calculator draft module depends on this one.
  const { savePendingDraft } = await import('./calculator/draft');
  await savePendingDraft(user);
  return user;
}

export async function signOutUser(): Promise<void> {
  const { clearAccountState } = await import('./calculator/draft');
  clearAccountState();
  clearCheckoutState();
  await signOut(auth);
  window.location.assign('/');
}

export const loginUrl = (returnTo = `${location.pathname}${location.search}`) =>
  `/entrar?returnTo=${encodeURIComponent(returnTo)}`;

/** Resolves the signed-in user, or sends a signed-out visitor to /entrar and resolves null. */
export async function requireSignedIn(): Promise<User | null> {
  const user = await authReady;
  if (!user) window.location.replace(loginUrl());
  return user;
}
