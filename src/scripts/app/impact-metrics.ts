import type { FormattedMetric } from '../../lib/format';
import { setText } from '../dom';

/** Fills a cloned ImpactMetric template (components/app/dashboard/ImpactMetric.astro). */
export function fillImpactMetric(root: ParentNode, metric: FormattedMetric): void {
  setText(root, '[data-metric-icon]', metric.icon);
  setText(root, '[data-metric-label]', metric.label);
  setText(root, '[data-metric-value]', metric.value);
}
