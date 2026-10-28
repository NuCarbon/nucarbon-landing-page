// /checkout: turns the project page's selection into an order and registers interest in it.
import { formatCo2e, formatMoney } from '../../lib/format';
import type { CheckoutRequest, Order, OrderResponse } from '../../types/app';
import { ApiError, getJson, postJson } from '../api';
import { currentUser, loginUrl } from '../auth';
import { requireElement, setText } from '../dom';
import { readCheckoutIntent, readCheckoutOrderId, saveCheckoutOrderId } from './storage';

const messages = {
  expired: 'Esta seleção expirou. Escolha o projeto novamente.',
  unavailable: 'Esta seleção não está mais disponível.',
  notFound: 'Não encontramos esta seleção. Escolha o projeto novamente.',
  noSelection: 'Nenhuma seleção ativa. Escolha um projeto para contribuir.',
  load: 'Não foi possível carregar sua seleção. Tente novamente.',
  confirm: 'Não foi possível registrar seu interesse. Tente novamente.',
};

const orderPath = (id: string) => `/api/checkouts?id=${encodeURIComponent(id)}`;

function errorMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiError)) return fallback;
  switch (cause.status) {
    case 401:
      return cause.message;
    case 404:
      return messages.notFound;
    case 409:
      return messages.unavailable;
    case 410:
      return messages.expired;
    default:
      return fallback;
  }
}

/**
 * The order for this checkout. A reload reads the order created earlier instead of creating
 * another; the intent's key makes a retried creation return the same order.
 */
async function loadOrder(): Promise<Order | null> {
  const orderId = readCheckoutOrderId();
  if (orderId) return (await getJson<OrderResponse>(orderPath(orderId))).order;

  const intent = readCheckoutIntent();
  if (!intent) return null;
  const { key, slug, mode, percentage, quantity } = intent;
  const request: CheckoutRequest = { key, slug, mode, percentage, quantity };
  const { order } = await postJson<OrderResponse>('/api/checkouts', request);
  saveCheckoutOrderId(order.id);
  return order;
}

export async function initializeCheckoutPage(root: HTMLElement): Promise<void> {
  if (!(await currentUser())) {
    location.replace(loginUrl('/checkout'));
    return;
  }

  const status = requireElement(root, '[data-checkout-status]');
  const error = requireElement(root, '[data-checkout-error]');
  const orderBlock = requireElement(root, '[data-checkout-order]');
  const confirm = requireElement<HTMLButtonElement>(root, '[data-checkout-confirm]');
  const receipt = requireElement(root, '[data-checkout-receipt]');
  const back = requireElement(root, '[data-checkout-back]');

  function showError(message: string): void {
    status.hidden = true;
    error.textContent = message;
    error.hidden = false;
  }

  function render(order: Order): void {
    status.hidden = true;
    error.hidden = true;
    setText(root, '[data-order-project]', order.projectName);
    setText(root, '[data-order-quantity]', formatCo2e(order.quantityTonnes));
    setText(root, '[data-order-price]', formatMoney(order.pricePerTonneCents));
    setText(root, '[data-order-total]', formatMoney(order.totalCents));
    setText(root, '[data-order-id]', order.id);

    const registered = order.status === 'registered';
    const confirmable = order.status === 'pending' && order.expiresAt > Date.now();
    orderBlock.hidden = !registered && !confirmable;
    confirm.hidden = !confirmable;
    receipt.hidden = !registered;
    back.hidden = registered;

    if (!registered && !confirmable) {
      showError(order.status === 'pending' ? messages.expired : messages.unavailable);
    }
  }

  confirm.addEventListener('click', async () => {
    const orderId = readCheckoutOrderId();
    if (!orderId) return;
    confirm.disabled = true;
    error.hidden = true;
    try {
      const { order } = await postJson<OrderResponse>(orderPath(orderId), { action: 'confirm' });
      render(order);
    } catch (cause) {
      showError(errorMessage(cause, messages.confirm));
      // Expired or no longer pending: confirming again cannot succeed.
      if (cause instanceof ApiError && (cause.status === 409 || cause.status === 410)) {
        orderBlock.hidden = true;
      }
    } finally {
      confirm.disabled = false;
    }
  });

  try {
    const order = await loadOrder();
    if (order) render(order);
    else showError(messages.noSelection);
  } catch (cause) {
    showError(errorMessage(cause, messages.load));
  }
}
