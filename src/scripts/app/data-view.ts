import { fetchAppData } from './api';

export abstract class AppDataView<T> extends HTMLElement {
  private initialized = false;

  protected abstract readonly endpoint: string;

  connectedCallback(): void {
    if (this.initialized) return;

    this.initialized = true;
    void this.initialize();
  }

  protected abstract renderData(data: T): void | Promise<void>;

  private async initialize(): Promise<void> {
    try {
      const data = await fetchAppData<T>(this.endpoint);
      await this.renderData(data);
      this.finishLoading();
    } catch {
      const errorTemplate = this.querySelector<HTMLTemplateElement>(
        'template[data-app-error]',
      );

      if (errorTemplate) {
        this.replaceChildren(errorTemplate.content.cloneNode(true));
      }

      this.setAttribute('aria-busy', 'false');
    }
  }

  private finishLoading(): void {
    this.querySelectorAll<HTMLElement>('[data-app-loading]').forEach((element) => {
      element.hidden = true;
    });
    this.querySelectorAll<HTMLElement>('[data-app-content]').forEach((element) => {
      element.hidden = false;
    });
    this.setAttribute('aria-busy', 'false');
  }
}
