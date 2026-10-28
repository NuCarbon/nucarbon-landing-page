// Google sign-in for components/auth/LoginForm.astro, on /entrar and inside LoginModal.astro.
import { currentUser, loginUrl, signInAndSyncDraft } from './auth';
import { requireElement } from './dom';

type Continuation = () => void | Promise<void>;

/**
 * Signs in (and saves a pending calculator draft) when the form's Google button is clicked,
 * then runs `onSignedIn`. Sign-in errors are shown in the form. Returns a function that
 * restores the form's initial state.
 */
export function initializeLoginForm(form: HTMLElement, onSignedIn: Continuation): () => void {
  const button = requireElement<HTMLButtonElement>(form, '[data-google-sign-in]');
  const error = requireElement(form, '[data-login-error]');
  const label = button.textContent?.trim() ?? '';

  button.addEventListener('click', async () => {
    button.disabled = true;
    error.hidden = true;
    try {
      await signInAndSyncDraft();
    } catch (cause) {
      error.textContent =
        cause instanceof Error ? cause.message : 'Não foi possível entrar. Tente novamente.';
      error.hidden = false;
      button.textContent = 'Tentar novamente';
      return;
    } finally {
      button.disabled = false;
    }
    await onSignedIn();
  });

  return () => {
    error.hidden = true;
    button.textContent = label;
  };
}

let continuation: Continuation | undefined;
let previousFocus: HTMLElement | null = null;
let resetForm: (() => void) | undefined;

const findDialog = () => document.querySelector<HTMLDialogElement>('[data-login-modal]');

/**
 * Runs `onSuccess` once the visitor is signed in: right away when they already are, otherwise
 * after signing in through the modal. The modal is closed by then, so `onSuccess` must report
 * its own errors. Pages without the modal fall back to /entrar.
 */
export async function openLoginModal(onSuccess?: Continuation): Promise<void> {
  if (await currentUser()) {
    await signInAndSyncDraft();
    await onSuccess?.();
    return;
  }

  const dialog = findDialog();
  if (!dialog) {
    location.assign(loginUrl());
    return;
  }

  continuation = onSuccess;
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  resetForm?.();
  dialog.showModal();
  dialog.querySelector<HTMLElement>('[data-google-sign-in]')?.focus();
}

export function initializeLoginModal(): void {
  const dialog = findDialog();
  if (!dialog) return;

  resetForm = initializeLoginForm(requireElement(dialog, '[data-login-form]'), async () => {
    const resume = continuation;
    dialog.close();
    await resume?.();
  });

  dialog.addEventListener('close', () => {
    continuation = undefined;
    previousFocus?.focus();
  });
  // A click on the dialog element itself lands on the backdrop.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  requireElement(dialog, '[data-modal-close]').addEventListener('click', () => dialog.close());
}
