import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

function setUser(user: User) {
  document.querySelectorAll<HTMLElement>('[data-user-name], [data-greeting-name]').forEach((element) => { element.textContent = user.displayName?.split(' ')[0] || 'você'; });
  document.querySelectorAll<HTMLImageElement>('[data-user-avatar]').forEach((image) => {
    if (user.photoURL) { image.src = user.photoURL; image.alt = `Foto de ${user.displayName || 'usuário'}`; image.hidden = false; }
  });
}

export function protectPage() {
  onAuthStateChanged(auth, (user) => { if (!user) window.location.replace('/entrar'); else setUser(user); });
}

export function redirectIfAuthenticated() {
  onAuthStateChanged(auth, (user) => { if (user) window.location.replace('/app'); });
}

export async function signInWithGoogle() { await signInWithPopup(auth, googleProvider); }
export async function signOutUser() { await signOut(auth); window.location.assign('/'); }
export async function authorizationHeader() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sua sessão expirou. Entre novamente.');
  return `Bearer ${await user.getIdToken()}`;
}
