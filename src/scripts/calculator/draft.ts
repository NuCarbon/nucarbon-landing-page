// The latest calculator answers live in localStorage as a draft until a
// signed-in user saves them. A saved marker records which draft revision was
// stored for which user, so the same draft is never posted twice.
import { isCalculatorAnswers, type CalculatorAnswers } from '../../lib/calculator/answers';
import { getJson, postJson } from '../api';
import { currentUser } from '../auth';

const DRAFT_KEY = 'nucarbon:calculator';
const SAVED_KEY = 'nucarbon:calculator:saved';
const RESULT_API = '/api/calculator-result';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SAVE_FAILED = 'Não foi possível salvar seu cálculo. Tente novamente.';

export interface Draft {
  answers: CalculatorAnswers;
  revision: string;
  createdAt: number;
}

interface SavedMarker {
  uid: string;
  revision: string;
}

// Storage can be unavailable (privacy modes) or hold corrupt JSON; both read as empty.
function readStored(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Without storage the result is shown but cannot be kept for later.
  }
}

function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove when storage is unavailable.
  }
}

function isFreshDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const { answers, revision, createdAt } = value as Partial<Draft>;
  if (typeof revision !== 'string' || !revision || typeof createdAt !== 'number') return false;
  const age = Date.now() - createdAt;
  return age >= 0 && age <= MAX_AGE_MS && isCalculatorAnswers(answers);
}

function readSavedMarker(): SavedMarker | null {
  const marker = readStored(SAVED_KEY) as Partial<SavedMarker> | null;
  return typeof marker?.uid === 'string' && typeof marker.revision === 'string'
    ? { uid: marker.uid, revision: marker.revision }
    : null;
}

/** The stored draft, or null after discarding an expired or invalid one. */
export function readDraft(): Draft | null {
  const draft = readStored(DRAFT_KEY);
  if (isFreshDraft(draft)) return draft;
  if (draft !== null) removeStored(DRAFT_KEY);
  return null;
}

export function writeDraft(answers: CalculatorAnswers): Draft {
  const draft: Draft = {
    answers: { ...answers },
    revision: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  writeStored(DRAFT_KEY, draft);
  return draft;
}

/** On sign-out: forgets the saved marker and the draft it refers to. */
export function clearAccountState(): void {
  const saved = readSavedMarker();
  if (saved && readDraft()?.revision === saved.revision) removeStored(DRAFT_KEY);
  removeStored(SAVED_KEY);
}

let pendingSave: Promise<void> | null = null;

/** Saves the stored draft to the user's account unless that revision is already saved. */
export async function savePendingDraft(user: { uid: string }): Promise<void> {
  // One request at a time; a concurrent call re-checks once the first settles.
  if (pendingSave) {
    await pendingSave.catch(() => undefined);
    return savePendingDraft(user);
  }
  const draft = readDraft();
  if (!draft) return;
  const saved = readSavedMarker();
  if (saved?.uid === user.uid && saved.revision === draft.revision) return;

  pendingSave = postJson(RESULT_API, { answers: draft.answers }).then(
    () => writeStored(SAVED_KEY, { uid: user.uid, revision: draft.revision }),
    (cause: unknown) => {
      throw new Error(SAVE_FAILED, { cause });
    },
  );
  try {
    await pendingSave;
  } finally {
    pendingSave = null;
  }
}

/** The signed-in user's last saved answers; null when signed out or nothing is saved. */
export async function loadSavedAnswers(): Promise<CalculatorAnswers | null> {
  if (!(await currentUser())) return null;
  const { result } = await getJson<{ result: { answers: unknown } | null }>(RESULT_API);
  return result && isCalculatorAnswers(result.answers) ? result.answers : null;
}
