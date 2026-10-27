import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

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

export function showAuthenticatedUser(
  user: User,
  root: ParentNode = document,
): void {
  const firstName = user.displayName?.trim().split(/\s+/)[0] || 'você';
  const initial =
    user.displayName?.trim().charAt(0) || user.email?.trim().charAt(0) || 'V';

  root
    .querySelectorAll<HTMLElement>('[data-user-name], [data-greeting-name]')
    .forEach((element) => {
      element.textContent = firstName;
    });

  root.querySelectorAll<HTMLImageElement>('[data-user-avatar]').forEach((image) => {
    if (!user.photoURL) {
      image.hidden = true;
      return;
    }

    image.src = user.photoURL;
    image.alt = `Foto de ${user.displayName || 'usuário'}`;
    image.hidden = false;
  });

  root.querySelectorAll<HTMLElement>('[data-user-initial]').forEach((element) => {
    element.textContent = initial.toLocaleUpperCase('pt-BR');
    element.hidden = Boolean(user.photoURL);
  });

  root.querySelectorAll<HTMLElement>('[data-auth-loading]').forEach((element) => {
    element.hidden = true;
  });
  root.querySelectorAll<HTMLElement>('[data-auth-user]').forEach((element) => {
    element.hidden = false;
  });
}

export async function protectPage() {
  const user = await authReady;

  if (!user) {
    window.location.replace('/entrar');
    return;
  }

  showAuthenticatedUser(user);
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  const { clearAccountState } = await import('./calculator/draft');
  clearAccountState();
  sessionStorage.removeItem('nucarbon:checkout-order');
  sessionStorage.removeItem('nucarbon:checkout-intent');
  await signOut(auth);
  window.location.assign('/');
}

export async function authorizationHeader() {
  const user = await authReady;

  if (!user) throw new Error('Sua sessão expirou. Entre novamente.');

  return `Bearer ${await user.getIdToken(true)}`;
}
