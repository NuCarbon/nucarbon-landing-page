// Sends the home page contact form to the Google Apps Script web app set in
// PUBLIC_GOOGLE_SCRIPT_URL. The script answers with JSON `{ message, statusCode }`.
import { requireElement } from '../dom';

const FIELDS = ['nome', 'email', 'assunto', 'mensagem'] as const;
const SENDING_LABEL = 'Enviando…';
const NETWORK_ERROR = 'Não foi possível enviar. Verifique sua conexão e tente novamente.';

type Status = 'success' | 'error';

interface ScriptResult {
  message: string;
  statusCode: number;
}

async function readResult(response: Response): Promise<ScriptResult> {
  let data: { message?: unknown; statusCode?: unknown };
  try {
    data = await response.json();
  } catch {
    data = { message: 'Resposta inválida do servidor.', statusCode: 500 };
  }
  return {
    message: String(data?.message ?? 'Erro inesperado.'),
    statusCode: Number(data?.statusCode ?? 500),
  };
}

function initContactForm(root: HTMLElement): void {
  const form = requireElement<HTMLFormElement>(root, 'form');
  const status = requireElement(root, '[data-form-status]');
  const submit = requireElement<HTMLButtonElement>(form, 'button[type="submit"]');
  const submitLabel = submit.textContent?.trim() ?? '';
  const endpoint = root.dataset.endpoint ?? '';
  const email = root.dataset.email ?? '';

  function showStatus(state: Status | null, message = ''): void {
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
    status.textContent = message;
  }

  function setBusy(busy: boolean): void {
    form.setAttribute('aria-busy', String(busy));
    submit.disabled = busy;
    submit.textContent = busy ? SENDING_LABEL : submitLabel;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!endpoint) {
      showStatus(
        'error',
        `O formulário está indisponível no momento. Envie sua mensagem para ${email}.`,
      );
      return;
    }

    const formData = new FormData(form);
    const body = new URLSearchParams();
    FIELDS.forEach((name) => body.set(name, String(formData.get(name) ?? '').trim()));

    showStatus(null);
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: 'POST', body });
      const { message, statusCode } = await readResult(response);
      const succeeded = statusCode >= 200 && statusCode < 300;
      showStatus(succeeded ? 'success' : 'error', message);
      if (succeeded) form.reset();
    } catch {
      showStatus('error', NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
  });
}

document.querySelectorAll<HTMLElement>('[data-contact-form]').forEach(initContactForm);
