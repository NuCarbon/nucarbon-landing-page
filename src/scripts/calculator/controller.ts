// Drives /calculadora: step navigation, the results screen, sharing, funnel analytics, and
// keeping the latest answers as a draft that is saved to the visitor's account.
import { calculatorCompleteParams, sanitizeRef, stepParams } from '../../lib/analytics';
import {
  SUPPORTED_ANSWERS,
  type CalculatorAnswers,
  type StepId,
} from '../../lib/calculator/answers';
import { calculateFootprint, type CalculationResult } from '../../lib/calculator/calculate';
import { createCalculatorFlow } from '../../lib/calculator/flow';
import { encodeShareCode } from '../../lib/calculator/share';
import { safeReturnTo } from '../../lib/urls';
import { track } from '../analytics';
import { currentUser } from '../auth';
import { openLoginModal } from '../login-modal';
import { loadSavedAnswers, readDraft, savePendingDraft, writeDraft } from './draft';
import { renderResults } from './results';
import { isShareModalOpen, onShareModalClose, openShareModal } from './share-modal';

const STEP_IDS = Object.keys(SUPPORTED_ANSWERS) as StepId[];

export function initializeCalculator(root: HTMLElement): void {
  const flowView = root.querySelector<HTMLElement>('[data-calculator-flow]')!;
  const form = flowView.querySelector<HTMLFormElement>('[data-calculator-form]')!;
  const panels = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const distance = form.querySelector<HTMLInputElement>('input[name="distance"]')!;
  const progress = flowView.querySelector<HTMLElement>('[data-progress]')!;
  const dots = [...flowView.querySelectorAll<HTMLElement>('[data-dot]')];
  const backButton = flowView.querySelector<HTMLButtonElement>('[data-back]')!;
  const continueButton = flowView.querySelector<HTMLButtonElement>('[data-continue]')!;
  const resultsView = root.querySelector<HTMLElement>('[data-result]')!;
  const saveError = resultsView.querySelector<HTMLElement>('[data-save-error]')!;
  const params = new URLSearchParams(location.search);
  const returnTo = safeReturnTo(params.get('returnTo'), '');
  const fromProject = returnTo.startsWith('/projetos/');

  const flow = createCalculatorFlow(panels.map((panel) => panel.dataset.step as StepId));
  let result: CalculationResult | null = null;
  /** The answers `result` was calculated from (the flow may change after it is shown). */
  let resultAnswers: CalculatorAnswers | null = null;
  let started = false;

  form.addEventListener('change', recordChoice);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    advance();
  });
  distance.addEventListener('input', () => flow.setAnswer('distance', Number(distance.value)));
  continueButton.addEventListener('click', advance);
  backButton.addEventListener('click', goBack);
  resultsView.querySelector('[data-recalculate]')!.addEventListener('click', restart);
  resultsView.querySelector('[data-save-retry]')!.addEventListener('click', () => void syncDraft());
  resultsView.querySelectorAll('[data-share]').forEach((button) => {
    button.addEventListener('click', shareResult);
  });

  track('calculator_view', {
    entry: fromProject ? 'project' : 'direct',
    ref: sanitizeRef(params.get('ref')),
  });
  applyReturnTo();
  renderStep();
  void restorePreviousResult();

  // Steps

  function recordChoice(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
    if (!STEP_IDS.includes(input.name as StepId)) return;
    flow.setAnswer(input.name as StepId, input.value as CalculatorAnswers[StepId]);
    trackStart();
  }

  function advance(): void {
    trackStart();
    track('calculator_step_complete', stepParams(flow.currentStep, flow.index));
    if (flow.isLastStep) {
      finish();
      return;
    }
    flow.next();
    renderStep();
    revealScreen(panels[flow.index]);
  }

  function goBack(): void {
    track('calculator_back', stepParams(flow.currentStep, flow.index));
    if (flow.index === 0) {
      window.location.assign('/');
      return;
    }
    flow.back();
    renderStep();
    revealScreen(panels[flow.index]);
  }

  function renderStep(): void {
    const { index } = flow;
    const step = panels[index];
    panels.forEach((panel) => {
      panel.hidden = panel !== step;
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('calculator__dot--complete', dotIndex < index);
      dot.classList.toggle('calculator__dot--active', dotIndex === index);
    });
    flowView.querySelector('[data-current-step]')!.textContent = String(index + 1);
    flowView.querySelector('[data-step-name]')!.textContent = step.dataset.stepLabel ?? '';
    progress.setAttribute('aria-valuenow', String(index + 1));
    progress.setAttribute('aria-valuetext', `Etapa ${index + 1}: ${step.dataset.stepLabel}`);
    progress.style.setProperty('--progress', `${((index + 1) / panels.length) * 100}%`);
    backButton.textContent = index === 0 ? 'Voltar' : 'Anterior';
    continueButton.textContent = flow.isLastStep ? 'Ver resultado' : 'Continuar';
  }

  /** The funnel start: the first answer picked or the first step completed on this page load. */
  function trackStart(): void {
    if (started) return;
    started = true;
    track('calculator_start', { step_id: flow.currentStep });
  }

  // Results

  function finish(): void {
    writeDraft(flow.snapshot().answers);
    const shown = showResults();
    track('calculator_complete', calculatorCompleteParams(shown));
    revealScreen(resultsView);
    void saveOrAskToSignIn();
  }

  function showResults(): CalculationResult {
    resultAnswers = flow.snapshot().answers;
    result = calculateFootprint(resultAnswers);
    renderResults(resultsView, result);
    flowView.hidden = true;
    resultsView.hidden = false;
    return result;
  }

  function restart(): void {
    track('calculator_restart', {});
    flow.restart();
    resultsView.hidden = true;
    flowView.hidden = false;
    renderStep();
    revealScreen(panels[flow.index]);
  }

  /**
   * Coming from a project (?returnTo=/projetos/<slug>), the main action leads back to it. With
   * the projects CTA off, sharing then moves from the main action to the secondary row.
   */
  function applyReturnTo(): void {
    if (!fromProject) return;
    const link = resultsView.querySelector<HTMLAnchorElement>('[data-projects-link]')!;
    link.href = returnTo;
    link.textContent = 'Voltar ao projeto';
    link.hidden = false;
    const primaryShare = resultsView.querySelector<HTMLElement>('[data-share-primary]');
    if (!primaryShare) return;
    primaryShare.hidden = true;
    resultsView.querySelector<HTMLElement>('[data-share-secondary]')!.hidden = false;
  }

  function shareResult(): void {
    if (!result || !resultAnswers) return;
    openShareModal({ code: encodeShareCode(resultAnswers), total: result.total });
  }

  // Draft and account

  /** Reopens the last result: the local draft first, otherwise the one saved to the account. */
  async function restorePreviousResult(): Promise<void> {
    const draft = readDraft();
    if (draft) {
      restoreAnswers(draft.answers);
      showResults();
      track('calculator_result_restored', { source: 'draft' });
      await syncDraft();
      return;
    }
    try {
      const saved = await loadSavedAnswers();
      // Leave the visitor alone if they started answering in the meantime.
      if (!saved || readDraft() || flow.index > 0 || !resultsView.hidden) return;
      restoreAnswers(saved);
      showResults();
      track('calculator_result_restored', { source: 'account' });
    } catch {
      // The calculator still works from the first step.
    }
  }

  function restoreAnswers(answers: CalculatorAnswers): void {
    const radios = [...form.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    for (const key of STEP_IDS) {
      flow.setAnswer(key, answers[key]);
      for (const radio of radios) {
        if (radio.name === key) radio.checked = radio.value === answers[key];
      }
    }
    distance.value = String(answers.distance);
    // Also updates the slider readout.
    distance.dispatchEvent(new Event('input'));
  }

  async function saveOrAskToSignIn(): Promise<void> {
    if (await currentUser()) {
      await syncDraft();
      return;
    }
    track('login_prompt_shown', { context: 'calculator_result' });
    // Dialogs never stack: if the visitor opened the share modal meanwhile, ask after it closes.
    if (isShareModalOpen()) onShareModalClose(() => void openLoginModal());
    else await openLoginModal();
  }

  /** Saves the draft for a signed-in visitor; a failure shows a retry next to the result. */
  async function syncDraft(): Promise<void> {
    const user = await currentUser();
    if (!user) return;
    try {
      await savePendingDraft(user);
      saveError.hidden = true;
    } catch {
      saveError.hidden = false;
    }
  }
}

/** Scrolls to the top and focuses the screen's heading so screen readers announce it. */
function revealScreen(screen: HTMLElement): void {
  window.scrollTo({ top: 0 });
  screen.querySelector<HTMLElement>('[data-screen-heading]')?.focus({ preventScroll: true });
}
