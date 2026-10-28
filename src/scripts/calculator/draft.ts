import { calculateFootprint } from '../../lib/calculator/calculate';
import type { CalculatorAnswers } from '../../lib/calculator/answers';

const DRAFT_KEY = 'nucarbon:calculator';
const SAVED_KEY = 'nucarbon:calculator:saved';
const WEEK = 7 * 24 * 60 * 60 * 1000;
export interface Draft {
  answers: CalculatorAnswers;
  revision: string;
  createdAt: number;
}

export function readDraft(): Draft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as Draft | null;
    if (
      !draft ||
      typeof draft.createdAt !== 'number' ||
      Date.now() - draft.createdAt > WEEK ||
      Date.now() < draft.createdAt ||
      !draft.revision
    ) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    const a = draft.answers;
    if (
      !a ||
      !Number.isFinite(a.distance) ||
      a.distance < 0 ||
      a.distance > 500 ||
      !['person'].includes(a.profile) ||
      !['apartment', 'small-house', 'large-house'].includes(a.home) ||
      !['gas', 'ethanol', 'electric', 'motorcycle', 'public', 'bike'].includes(a.transport) ||
      !['low', 'medium', 'high'].includes(a.energy) ||
      !['vegan', 'vegetarian', 'flexitarian', 'moderate', 'high'].includes(a.food) ||
      !['recycle', 'sometimes', 'trash'].includes(a.waste)
    )
      return null;
    calculateFootprint(a);
    return draft;
  } catch {
    return null;
  }
}
export function writeDraft(answers: CalculatorAnswers): Draft {
  const draft = { answers: { ...answers }, revision: crypto.randomUUID(), createdAt: Date.now() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  return draft;
}
export function clearAccountState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
    if (saved?.revision && readDraft()?.revision === saved.revision)
      localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore corrupt storage */
  }
  localStorage.removeItem(SAVED_KEY);
}
let pendingSave: Promise<void> | null = null;
export async function savePendingDraft(user: {
  uid: string;
  getIdToken: () => Promise<string>;
}): Promise<void> {
  const draft = readDraft();
  if (!draft) return;
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || 'null');
  if (saved?.uid === user.uid && saved.revision === draft.revision) return;
  if (pendingSave) {
    await pendingSave;
    return savePendingDraft(user);
  }
  pendingSave = (async () => {
    const response = await fetch('/api/calculator-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ answers: draft.answers }),
    });
    if (!response.ok) throw new Error('Não foi possível salvar seu cálculo. Tente novamente.');
    localStorage.setItem(SAVED_KEY, JSON.stringify({ uid: user.uid, revision: draft.revision }));
  })();
  try {
    await pendingSave;
  } finally {
    pendingSave = null;
  }
}
