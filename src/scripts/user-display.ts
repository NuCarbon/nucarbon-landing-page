// Fills account markup: [data-user-name], [data-user-avatar], [data-user-initial],
// and toggles [data-auth-loading], [data-auth-user] and [data-auth-guest].
import type { User } from 'firebase/auth';

export const firstName = (user: User) => user.displayName?.trim().split(/\s+/)[0] || 'você';

function toggle(root: ParentNode, state: 'user' | 'guest'): void {
  root.querySelectorAll<HTMLElement>('[data-auth-loading]').forEach((element) => {
    element.hidden = true;
  });
  root.querySelectorAll<HTMLElement>('[data-auth-user]').forEach((element) => {
    element.hidden = state !== 'user';
  });
  root.querySelectorAll<HTMLElement>('[data-auth-guest]').forEach((element) => {
    element.hidden = state !== 'guest';
  });
}

export function renderUser(root: ParentNode, user: User): void {
  const name = firstName(user);
  const initial = (
    user.displayName?.trim().charAt(0) ||
    user.email?.trim().charAt(0) ||
    'V'
  ).toLocaleUpperCase('pt-BR');

  root.querySelectorAll<HTMLElement>('[data-user-name]').forEach((element) => {
    element.textContent = name;
  });
  root.querySelectorAll<HTMLImageElement>('[data-user-avatar]').forEach((image) => {
    image.hidden = !user.photoURL;
    if (user.photoURL) image.src = user.photoURL;
  });
  root.querySelectorAll<HTMLElement>('[data-user-initial]').forEach((element) => {
    element.textContent = initial;
    element.hidden = Boolean(user.photoURL);
  });
  toggle(root, 'user');
}

export function renderGuest(root: ParentNode): void {
  toggle(root, 'guest');
}
