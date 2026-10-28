// Firebase session helpers. Rendering account markup lives in user-display.ts.
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged, signInWithPopup, signOut, type Auth, type User } from 'firebase/auth';
import { loginPath } from '../lib/urls';
import { clearCheckoutState } from './checkout/storage';

// firebase.ts throws while loading when the PUBLIC_FIREBASE_* variables are missing. Loading
// it here keeps that from breaking every script that imports this module: the visitor is
// treated as signed out (so account placeholders still resolve) and sign-in reports the error.
const firebase = import('./firebase');
const configuredAuth: Promise<Auth | null> = firebase.then(
  ({ auth }) => auth,
  () => null,
);

// Firebase restores the persisted session asynchronously. Never read
// auth.currentUser before this first state notification has fired.
export const authReady: Promise<User | null> = configuredAuth.then((auth) => {
  if (!auth) return null;

  return new Promise<User | null>((resolve) => {
    let unsubscribe: (() => void) | undefined;

    const finish = (user: User | null) => {
      unsubscribe?.();
      resolve(user);
    };

    unsubscribe = onAuthStateChanged(auth, finish, () => finish(null));
  });
});

/** The current user, including sign-ins that happened after the page loaded. */
export async function currentUser(): Promise<User | null> {
  const auth = await configuredAuth;
  await authReady;
  return auth?.currentUser ?? null;
}

/** Calls back with the restored session and on every later sign-in or sign-out. */
export function onUserChange(callback: (user: User | null) => void): () => void {
  let unsubscribe: (() => void) | undefined;
  let active = true;

  void configuredAuth.then((auth) => {
    if (!active) return;
    if (auth) unsubscribe = onAuthStateChanged(auth, callback, () => callback(null));
    else callback(null);
  });

  return () => {
    active = false;
    unsubscribe?.();
  };
}

const signInMessages: Record<string, string> = {
  'auth/popup-closed-by-user': 'O login foi cancelado.',
  'auth/cancelled-popup-request': 'O login foi cancelado.',
  'auth/popup-blocked':
    'O navegador bloqueou a janela de login. Permita pop-ups e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet e tente novamente.',
};

export async function signInWithGoogle(): Promise<User> {
  // Rejects with "A autenticação ainda não foi configurada." when Firebase is not configured.
  const { auth, googleProvider } = await firebase;
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
  // Loaded on demand so pages that only show the account menu skip the calculator code.
  const { savePendingDraft } = await import('./calculator/draft');
  await savePendingDraft(user);
  return user;
}

export async function signOutUser(): Promise<void> {
  const { clearAccountState } = await import('./calculator/draft');
  clearAccountState();
  clearCheckoutState();
  const auth = await configuredAuth;
  if (auth) await signOut(auth);
  window.location.assign('/');
}

export const loginUrl = (returnTo = `${location.pathname}${location.search}`) =>
  loginPath(returnTo);

/** Resolves the signed-in user, or sends a signed-out visitor to /entrar and resolves null. */
export async function requireSignedIn(): Promise<User | null> {
  const user = await authReady;
  if (!user) window.location.replace(loginUrl());
  return user;
}
