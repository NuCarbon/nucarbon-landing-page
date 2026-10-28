import { ApiError, getJson } from '../api';
import { currentUser } from '../auth';
import { cloneTemplate, requireElement, setText } from '../dom';

/**
 * Fetches a view's data and swaps its skeleton for the rendered content.
 *
 * Expected hooks inside `view`: [data-app-loading] (skeleton), [data-app-content] (hidden until
 * `render` succeeds), [data-app-status] (where errors are shown) and a <template data-app-error>
 * holding components/app/AppError.astro. Anything else in the view, such as its intro, stays put.
 */
export async function loadView<T>(
  view: HTMLElement,
  endpoint: string,
  render: (data: T) => void,
): Promise<void> {
  const loading = requireElement(view, '[data-app-loading]');
  const content = requireElement(view, '[data-app-content]');
  const status = requireElement(view, '[data-app-status]');

  const showError = (error: unknown) => {
    const alert = cloneTemplate(view, 'template[data-app-error]');
    // ApiError messages are written for users; anything else keeps AppError's default copy.
    if (error instanceof ApiError) setText(alert, '[data-app-error-message]', error.message);
    requireElement(alert, '[data-app-retry]').addEventListener('click', () => void load());
    status.replaceChildren(alert);
    status.hidden = false;
  };

  const load = async () => {
    status.hidden = true;
    status.replaceChildren();
    loading.hidden = false;

    try {
      render(await getJson<T>(endpoint));
      content.hidden = false;
    } catch (error) {
      showError(error);
    }

    loading.hidden = true;
  };

  // AppLayout sends signed-out visitors to /entrar; keep the skeleton until the page changes.
  if (await currentUser()) await load();
}
