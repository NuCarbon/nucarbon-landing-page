import { currentUser, loginUrl, signInAndSyncDraft } from './auth';

let continuation: (() => void | Promise<void>) | undefined;
let previousFocus: HTMLElement | null = null;

export async function openLoginModal(onSuccess?: () => void | Promise<void>): Promise<void> {
  if (await currentUser()) {
    await signInAndSyncDraft();
    await onSuccess?.();
    return;
  }
  const dialog = document.querySelector<HTMLDialogElement>('[data-login-modal]');
  if (!dialog) {
    location.assign(loginUrl());
    return;
  }
  continuation = onSuccess;
  previousFocus = document.activeElement as HTMLElement;
  dialog.querySelector<HTMLElement>('[data-login-error]')!.hidden = true;
  dialog.querySelector<HTMLButtonElement>('[data-google-sign-in]')!.textContent =
    'Continuar com Google';
  dialog.showModal();
  dialog.querySelector<HTMLButtonElement>('[data-google-sign-in]')?.focus();
}

export function initializeLoginModal() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-login-modal]');
  if (!dialog) return;
  dialog.addEventListener('close', () => {
    continuation = undefined;
    previousFocus?.focus();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-modal-close]')?.addEventListener('click', () => dialog.close());
  const button = dialog.querySelector<HTMLButtonElement>('[data-google-sign-in]')!;
  const error = dialog.querySelector<HTMLElement>('[data-login-error]')!;
  button.addEventListener('click', async () => {
    button.disabled = true;
    error.hidden = true;
    try {
      await signInAndSyncDraft();
      const resume = continuation;
      dialog.close();
      await resume?.();
    } catch (cause) {
      error.textContent =
        cause instanceof Error ? cause.message : 'Não foi possível entrar. Tente novamente.';
      error.hidden = false;
      button.textContent = 'Tentar novamente';
    } finally {
      button.disabled = false;
    }
  });
}
