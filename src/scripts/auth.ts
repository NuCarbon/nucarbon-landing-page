import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// Firebase restores the persisted session asynchronously. Never read
// auth.currentUser before this first state notification has fired.
export const authReady = new Promise<User | null>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    resolve(user);
  });
});

function setUser(user: User) {
  document.querySelectorAll<HTMLElement>('[data-user-name], [data-greeting-name]').forEach((element) => { element.textContent = user.displayName?.split(' ')[0] || 'você'; });
  document.querySelectorAll<HTMLImageElement>('[data-user-avatar]').forEach((image) => {
    if (user.photoURL) { image.src = user.photoURL; image.alt = `Foto de ${user.displayName || 'usuário'}`; image.hidden = false; }
  });
}

export async function protectPage() {
  const user = await authReady;
  if (!user) window.location.replace('/entrar'); else setUser(user);
}

export async function redirectIfAuthenticated() {
  const user = await authReady;
  if (user) window.location.replace('/app');
}

export async function signInWithGoogle() { await signInWithPopup(auth, googleProvider); }
export async function signOutUser() { await signOut(auth); window.location.assign('/'); }
export async function authorizationHeader() {
  const user = await authReady;
  if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
  return `Bearer ${await user.getIdToken(true)}`;
}
