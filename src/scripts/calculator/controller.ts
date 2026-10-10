import {
  createCalculatorFlow,
  type CalculatorAnswers,
  type CalculatorPanel,
  type StepId,
} from './state';
import { calculateFootprint } from './calculate';
import { renderResults } from './results';
import { initializeResultSaving } from './persistence';

export function initializeCalculator(calculator: HTMLElement): void {
  const form = calculator.querySelector<HTMLFormElement>('[data-calculator-form]')!;
  const panels = [...form.querySelectorAll<CalculatorPanel>('[data-step]')];
  const result = calculator.querySelector<CalculatorPanel>('[data-result]')!;
  const flowElement = calculator.querySelector<HTMLElement>('[data-calculator-flow]')!;
  const flow = createCalculatorFlow(panels.map((panel) => panel.dataset.step as StepId));
  const back = calculator.querySelector<HTMLButtonElement>('[data-back]')!;
  const next = calculator.querySelector<HTMLButtonElement>('[data-continue]')!;
  const distance = form.querySelector<HTMLInputElement>('[name="distance"]')!;
  const saveResult = initializeResultSaving(calculator);

  function publishState(): void {
    for (const panel of [...panels, result]) {
      panel.calculatorState = flow.snapshot();
      panel.dispatchEvent(new CustomEvent('calculator:state', {
        detail: flow.snapshot(),
      }));
    }
  }

  function updateStep(): void {
    panels.forEach((panel, index) => { panel.hidden = index !== flow.index; });
    calculator.querySelectorAll<HTMLElement>('[data-dot]').forEach((dot, index) => {
      dot.classList.toggle('calculator__dot--complete', index < flow.index);
      dot.classList.toggle('calculator__dot--active', index === flow.index);
    });
    calculator.querySelector<HTMLElement>('[data-current-step]')!.textContent = String(flow.index + 1);
    calculator.querySelector<HTMLElement>('[data-step-name]')!.textContent = `[${panels[flow.index].dataset.stepLabel}]`;
    calculator.querySelector<HTMLElement>('[data-progress]')!.style.width = `${((flow.index + 1) / panels.length) * 100}%`;
    back.textContent = flow.index === 0 ? 'Voltar' : 'Anterior';
    next.textContent = flow.isLastStep ? 'Ver resultado' : 'Continuar';
    publishState();
    panels[flow.index].dispatchEvent(new CustomEvent('calculator:enter', { detail: flow.snapshot() }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function advance(): void {
    if (!flow.isLastStep) {
      flow.next();
      updateStep();
      return;
    }
    publishState();
    renderResults(result, calculateFootprint(flow.snapshot().answers));
    saveResult(flow.snapshot().answers);
    flowElement.hidden = true;
    result.hidden = false;
    calculator.classList.add('calculator--result');
    result.dispatchEvent(new CustomEvent('calculator:complete', {
      detail: flow.snapshot(),
      bubbles: true,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); advance(); });
  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio' || input.disabled) return;
    const key = input.name as StepId;
    if (!panels.some((panel) => panel.dataset.step === key)) return;
    flow.setAnswer(key, input.value as CalculatorAnswers[StepId]);
    form.querySelectorAll<HTMLInputElement>(`input[name="${key}"]`).forEach((radio) => {
      radio.closest('.option-card')?.classList.toggle('option-card--selected', radio.checked);
    });
    publishState();
  });

  distance.addEventListener('input', () => {
    flow.setAnswer('distance', Number(distance.value));
    calculator.querySelector<HTMLElement>('[data-distance]')!.textContent = distance.value;
    distance.style.setProperty('--range-progress', `${(Number(distance.value) / Number(distance.max)) * 100}%`);
    publishState();
  });

  next.addEventListener('click', advance);
  back.addEventListener('click', () => {
    if (flow.index === 0) {
      window.location.assign('/');
      return;
    }
    flow.back();
    updateStep();
  });
  calculator.querySelectorAll<HTMLButtonElement>('[data-recalculate]').forEach((button) => {
    button.addEventListener('click', () => {
      flow.restart();
      result.hidden = true;
      flowElement.hidden = false;
      calculator.classList.remove('calculator--result');
      updateStep();
    });
  });
  calculator.querySelector<HTMLButtonElement>('[data-share]')?.addEventListener('click', async () => {
    const total = result.querySelector('[data-total]')?.textContent;
    const shareData = {
      title: 'Minha pegada de carbono',
      text: `Minha pegada de carbono estimada é ${total} tCO₂e por ano.`,
      url: window.location.href,
    };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
  });

  distance.dispatchEvent(new Event('input'));
  updateStep();
}
