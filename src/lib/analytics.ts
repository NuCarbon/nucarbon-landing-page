// Analytics contract: every event the site sends and its parameters (GA4 snake_case).
// Never send calculator answers or user ids, only aggregate values.
import type { StepId } from './calculator/answers.ts';
import type { CategoryId } from './calculator/categories.ts';
import type { ShareMethod } from './share-links.ts';

export type ConsentChoice = 'granted' | 'denied';

export interface AnalyticsEvents {
  calculator_view: { entry: 'direct' | 'project'; ref?: string };
  calculator_start: { step_id: StepId };
  /** `step_index` is 1-based. */
  calculator_step_complete: { step_id: StepId; step_index: number };
  calculator_back: { step_id: StepId; step_index: number };
  calculator_complete: { total_tonnes: number; largest_category: CategoryId | 'none' };
  calculator_restart: Record<string, never>;
  calculator_result_restored: { source: 'draft' | 'account' };
  share_open: { surface: 'calculator_result' };
  share_click: { method: ShareMethod };
  /** Only where completion is observable: native share, Instagram, copy and download. */
  share_complete: { method: ShareMethod };
  shared_result_view: {
    share_version: number;
    total_tonnes: number;
    largest_category: CategoryId | 'none';
  };
  shared_result_cta_click: { location: string };
  calculator_cta_click: { location: string; page_path: string };
  login_prompt_shown: { context: 'calculator_result' };
}

export type AnalyticsEventName = keyof AnalyticsEvents;
