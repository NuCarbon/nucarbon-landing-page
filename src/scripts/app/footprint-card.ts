import { formatFootprint, formatUpdatedAt } from '../../lib/format';
import type { Footprint } from '../../types/app';
import { setText } from '../dom';

/** Fills components/app/dashboard/FootprintCard.astro; `null` before the first calculation. */
export function fillFootprintCard(card: ParentNode, footprint: Footprint | null): void {
  if (footprint) {
    setText(card, '[data-footprint-value]', formatFootprint(footprint.annualEmissionsTonnes));
    setText(card, '[data-footprint-date]', formatUpdatedAt(footprint.updatedAt));
    setText(card, '[data-footprint-link]', 'Recalcular');
  } else {
    setText(card, '[data-footprint-value]', '—');
    setText(card, '[data-footprint-date]', 'Calcule sua pegada para ver seu resultado aqui.');
    setText(card, '[data-footprint-link]', 'Calcular minha pegada');
  }
}
