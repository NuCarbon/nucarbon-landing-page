// Share dialog for a calculator result (components/calculator/share/ShareModal.astro): social
// links, Instagram Stories, the native share sheet, copy link and image download.
//
// Instagram Stories: the web has no deep link that posts straight into Stories
// (`instagram-stories://share` only works from a native app registered with a Facebook App ID).
// The closest path is the Web Share API with an image file: the OS share sheet then lists
// Instagram → Stories. iOS only allows `navigator.share` during the click's user activation, so
// the story PNG is fetched as a File when the modal opens, not when the button is pressed.
import { shareImagePath, sharedResultPath } from '../../lib/calculator/share';
import {
  shareMessage,
  socialShareHref,
  withShareUtm,
  type ShareMethod,
  type ShareNetwork,
} from '../../lib/share-links';
import { track } from '../analytics';
import { requireElement } from '../dom';

export interface ShareTarget {
  /** Share code from `encodeShareCode`. */
  code: string;
  /** Total footprint in tCO₂e per year. */
  total: number;
}

interface Session {
  code: string;
  url: URL;
  text: string;
  storyHref: string;
  /** The story PNG, once prefetched and accepted by `navigator.canShare`. */
  storyFile: File | null;
}

const NETWORKS: readonly ShareNetwork[] = ['whatsapp', 'x', 'facebook', 'linkedin', 'telegram'];
const STORY_FILE_NAME = 'nucarbon-pegada-de-carbono.png';
const SHARE_TITLE = 'Minha pegada de carbono';
const FEEDBACK_MS = 4000;
const PREPARING_LABEL = 'Preparando imagem…';

let initialized = false;
let session: Session | undefined;
let previousFocus: HTMLElement | null = null;
let closeCallbacks: (() => void)[] = [];
let prefetch: AbortController | undefined;
/** The last prefetched story file, reused when the same result is shared again. */
let cachedStory: { code: string; file: File } | undefined;
let feedbackTimer: number | undefined;
let instagramLabel = '';

const findDialog = () => document.querySelector<HTMLDialogElement>('[data-share-modal]');

const methodElement = <T extends HTMLElement>(dialog: HTMLDialogElement, method: ShareMethod) =>
  requireElement<T>(dialog, `[data-share-method="${method}"]`);

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

export function isShareModalOpen(): boolean {
  return findDialog()?.open ?? false;
}

/**
 * Runs `callback` once, the next time the share modal closes. Only register it while the modal
 * is open (check `isShareModalOpen()`); otherwise it waits for a later open and close.
 */
export function onShareModalClose(callback: () => void): void {
  closeCallbacks.push(callback);
}

/**
 * Opens the share dialog for a result. Does nothing while another dialog is open (the login
 * modal opens on its own after the result; dialogs never stack). Pages without the dialog fall
 * back to the native share sheet, then to copying the link.
 */
export function openShareModal(target: ShareTarget): void {
  if (document.querySelector('dialog[open]')) return;

  const next = createSession(target);
  const dialog = findDialog();
  if (!dialog) {
    track('share_click', { method: 'native' });
    void shareNatively(next);
    return;
  }

  session = next;
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  render(dialog, next);
  prepareInstagram(dialog, next);
  dialog.showModal();
  track('share_open', { surface: 'calculator_result' });
}

export function initializeShareModal(): void {
  const dialog = findDialog();
  if (!dialog || initialized) return;
  initialized = true;

  instagramLabel =
    requireElement(
      methodElement(dialog, 'instagram_stories'),
      '[data-share-method-label]',
    ).textContent?.trim() ?? '';

  const frame = requireElement(dialog, '[data-share-preview-frame]');
  const preview = requireElement<HTMLImageElement>(dialog, '[data-share-preview]');
  preview.addEventListener('load', () => {
    frame.dataset.loaded = '';
  });
  // Without a preview the share options still work.
  preview.addEventListener('error', () => {
    frame.hidden = true;
  });

  dialog.addEventListener('close', () => {
    prefetch?.abort();
    prefetch = undefined;
    session = undefined;
    clearFeedback(dialog);
    previousFocus?.focus();
    previousFocus = null;
    const callbacks = closeCallbacks;
    closeCallbacks = [];
    for (const callback of callbacks) callback();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && isOutside(dialog, event)) {
      dialog.close();
      return;
    }
    const trigger =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-share-method]')
        : null;
    if (trigger && session) handleMethod(trigger.dataset.shareMethod as ShareMethod, session);
  });
  requireElement(dialog, '[data-modal-close]').addEventListener('click', () => dialog.close());
}

function createSession({ code, total }: ShareTarget): Session {
  return {
    code,
    url: new URL(sharedResultPath(code), location.origin),
    text: shareMessage(total),
    storyHref: shareImagePath(code, 'story'),
    storyFile: null,
  };
}

function render(dialog: HTMLDialogElement, current: Session): void {
  for (const network of NETWORKS) {
    methodElement<HTMLAnchorElement>(dialog, network).href = socialShareHref(
      network,
      withShareUtm(current.url, network),
      current.text,
    );
  }

  const previewPath = shareImagePath(current.code, 'og');
  const preview = requireElement<HTMLImageElement>(dialog, '[data-share-preview]');
  // Reopening the same result keeps the loaded image (no new load event would fire).
  if (preview.getAttribute('src') !== previewPath) {
    const frame = requireElement(dialog, '[data-share-preview-frame]');
    delete frame.dataset.loaded;
    frame.hidden = false;
    preview.src = previewPath;
  }

  methodElement<HTMLAnchorElement>(dialog, 'download').href = current.storyHref;
  methodElement(dialog, 'native').hidden = typeof navigator.share !== 'function';
  clearFeedback(dialog);
}

/** Touch devices that can share image files get the Instagram button; others get the hint. */
function prepareInstagram(dialog: HTMLDialogElement, current: Session): void {
  const button = methodElement<HTMLButtonElement>(dialog, 'instagram_stories');
  const label = requireElement(button, '[data-share-method-label]');
  const hint = requireElement(dialog, '[data-share-instagram-hint]');
  const setAvailable = (available: boolean) => {
    button.hidden = !available;
    hint.hidden = available;
  };
  const setReady = (file: File) => {
    current.storyFile = file;
    button.disabled = false;
    label.textContent = instagramLabel;
  };

  prefetch?.abort();
  prefetch = undefined;

  const probe = new File([''], STORY_FILE_NAME, { type: 'image/png' });
  if (!matchMedia('(pointer: coarse)').matches || !canShareFiles([probe])) {
    setAvailable(false);
    return;
  }
  setAvailable(true);

  if (cachedStory?.code === current.code) {
    setReady(cachedStory.file);
    return;
  }

  button.disabled = true;
  label.textContent = PREPARING_LABEL;
  const controller = new AbortController();
  prefetch = controller;
  void fetchStoryFile(current.storyHref, controller.signal).then((file) => {
    // Closed, or reopened for another result, in the meantime.
    if (controller.signal.aborted || session !== current) return;
    prefetch = undefined;
    if (!file || !canShareFiles([file])) {
      setAvailable(false);
      return;
    }
    cachedStory = { code: current.code, file };
    setReady(file);
  });
}

function canShareFiles(files: File[]): boolean {
  try {
    return typeof navigator.share === 'function' && navigator.canShare?.({ files }) === true;
  } catch {
    return false;
  }
}

async function fetchStoryFile(href: string, signal: AbortSignal): Promise<File | null> {
  try {
    const response = await fetch(href, { signal });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], STORY_FILE_NAME, { type: 'image/png' });
  } catch {
    return null;
  }
}

function handleMethod(method: ShareMethod, current: Session): void {
  track('share_click', { method });
  switch (method) {
    case 'instagram_stories':
      void shareToStories(current);
      break;
    case 'native':
      void shareNatively(current);
      break;
    case 'copy_link':
      void copyLink(current);
      break;
    case 'download':
      // The same-origin anchor downloads natively.
      track('share_complete', { method });
      break;
    default:
      // Network links open in a new tab; completion is not observable.
      break;
  }
}

async function shareToStories(current: Session): Promise<void> {
  const file = current.storyFile;
  if (!file) return;
  try {
    // Files only: iOS drops the file when text or a URL is shared with it. `share` runs before
    // any await so it stays inside the click's user activation.
    await navigator.share({ files: [file] });
    track('share_complete', { method: 'instagram_stories' });
  } catch (error) {
    if (isAbortError(error)) return;
    downloadStory(current.storyHref);
    const dialog = findDialog();
    if (dialog) requireElement(dialog, '[data-share-instagram-hint]').hidden = false;
  }
}

async function shareNatively(current: Session): Promise<void> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: SHARE_TITLE,
        text: current.text,
        url: withShareUtm(current.url, 'native'),
      });
      track('share_complete', { method: 'native' });
      return;
    } catch (error) {
      if (isAbortError(error)) return;
      // Other failures (e.g. not allowed) fall back to copying.
    }
  }
  await copyLink(current);
}

async function copyLink(current: Session): Promise<void> {
  try {
    await navigator.clipboard.writeText(
      `${current.text} ${withShareUtm(current.url, 'copy_link')}`,
    );
    showFeedback('Link copiado');
    track('share_complete', { method: 'copy_link' });
  } catch {
    showFeedback('Não foi possível copiar o link.');
  }
}

function downloadStory(href: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = STORY_FILE_NAME;
  link.click();
}

/** Pages without the dialog have nowhere to show feedback. */
function showFeedback(message: string): void {
  const dialog = findDialog();
  if (!dialog) return;
  const feedback = requireElement(dialog, '[data-share-modal-feedback]');
  feedback.textContent = message;
  window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    feedback.textContent = '';
  }, FEEDBACK_MS);
}

function clearFeedback(dialog: HTMLDialogElement): void {
  window.clearTimeout(feedbackTimer);
  requireElement(dialog, '[data-share-modal-feedback]').textContent = '';
}

/**
 * Backdrop clicks also target the dialog element, but so do clicks on its own padding and on
 * the gaps between its children; only a point outside its box is the backdrop.
 */
function isOutside(dialog: HTMLDialogElement, { clientX, clientY }: MouseEvent): boolean {
  const box = dialog.getBoundingClientRect();
  return clientX < box.left || clientX > box.right || clientY < box.top || clientY > box.bottom;
}
