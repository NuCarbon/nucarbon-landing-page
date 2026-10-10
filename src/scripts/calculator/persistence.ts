import type { CalculatorAnswers } from './state';
import { savePendingDraft, writeDraft } from './draft';

export function initializeResultSaving(calculator: HTMLElement) {
  const error = calculator.querySelector<HTMLElement>('[data-save-error]')!;
  const retry = calculator.querySelector<HTMLButtonElement>('[data-save-retry]')!;
  async function save() {
    try {
      const { authReady } = await import('../auth');
      const user = await authReady;
      if (!user) return;
      await savePendingDraft(user);
      error.hidden = true;
    } catch { error.hidden = false; }
  }
  retry.addEventListener('click', () => void save());
  return (answers: CalculatorAnswers, newRevision = true) => { if (newRevision) writeDraft(answers); void save(); };
}
