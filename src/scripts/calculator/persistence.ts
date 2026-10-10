import type { CalculatorAnswers } from './state';

async function saveAnswers(answers: CalculatorAnswers, signIn: boolean): Promise<'saved' | 'signed-out'> {
  // Load auth only when saving; the public calculator still works if Firebase
  // configuration is unavailable, and save errors are surfaced in the UI.
  const [{ authReady, signInWithGoogle }, { auth }] = await Promise.all([
    import('../auth'), import('../firebase'),
  ]);
  await authReady;
  if (signIn) await signInWithGoogle();
  const user = auth.currentUser;
  if (!user) return 'signed-out';
  const response = await fetch('/api/calculator-result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ answers }),
  });
  if (response.status === 401) return 'signed-out';
  if (!response.ok) throw new Error('Could not save calculator result');
  return 'saved';
}

export function initializeResultSaving(calculator: HTMLElement) {
  const status = calculator.querySelector<HTMLElement>('[data-save-status]')!;
  const retry = calculator.querySelector<HTMLButtonElement>('[data-save-retry]')!;
  const signIn = calculator.querySelector<HTMLButtonElement>('[data-save-sign-in]')!;
  const navigation = calculator.querySelectorAll<HTMLButtonElement>('[data-recalculate], [data-continue]');
  let answers: CalculatorAnswers | undefined;
  let saving = false;

  async function save(withSignIn = false) {
    if (!answers || saving) return;
    saving = true;
    retry.hidden = true;
    signIn.hidden = true;
    navigation.forEach((button) => { button.disabled = true; });
    status.textContent = withSignIn ? 'Entrando para salvar seu resultado…' : 'Salvando seu resultado…';
    try {
      const outcome = await saveAnswers(answers, withSignIn);
      if (outcome === 'signed-out') {
        status.textContent = 'Entre na sua conta para salvar este resultado no seu painel.';
        signIn.hidden = false;
      } else {
        status.textContent = 'Resultado salvo na sua conta.';
      }
    } catch {
      status.textContent = 'Não foi possível salvar. Seu resultado continua nesta página.';
      retry.hidden = false;
      // Keep sign-in available if the user closed or rejected the Google popup.
      signIn.hidden = !withSignIn;
    } finally {
      saving = false;
      navigation.forEach((button) => { button.disabled = false; });
    }
  }

  retry.addEventListener('click', () => { void save(); });
  signIn.addEventListener('click', () => { void save(true); });
  return (currentAnswers: CalculatorAnswers) => {
    answers = { ...currentAnswers };
    void save();
  };
}
