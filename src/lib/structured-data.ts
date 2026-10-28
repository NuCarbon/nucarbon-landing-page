// schema.org JSON-LD builders. Pages render the result with ui/JsonLd.astro.
import { site } from '../data/site.ts';

export type JsonLd = Record<string, unknown>;

export interface BreadcrumbItem {
  label: string;
  /** Site-relative or absolute. */
  href?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface WebApplicationInput {
  /** Absolute URL of the application page. */
  url: string;
  name: string;
  description: string;
}

const CONTEXT = 'https://schema.org';

/**
 * JSON for a `<script type="application/ld+json">`. Content can come from the
 * database (project names): escaping "<" keeps "</script>" from closing the tag early.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function breadcrumbListJsonLd(
  items: readonly BreadcrumbItem[],
  origin: string | URL,
): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, origin).href } : {}),
    })),
  };
}

export function faqPageJsonLd(items: readonly FaqItem[]): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** A free, browser-based tool published by Nucarbon. */
export function webApplicationJsonLd({ url, name, description }: WebApplicationInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: 'pt-BR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    publisher: { '@type': 'Organization', name: site.name, url: new URL('/', url).href },
  };
}
