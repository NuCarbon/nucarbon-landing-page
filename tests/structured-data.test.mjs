import assert from 'node:assert/strict';
import test from 'node:test';
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  serializeJsonLd,
  webApplicationJsonLd,
} from '../src/lib/structured-data.ts';

test('serialized JSON-LD cannot close its script tag', () => {
  const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' });
  assert.ok(!json.includes('<'));
  assert.equal(JSON.parse(json).name, '</script><script>alert(1)</script>');
});

test('breadcrumbs resolve hrefs against the origin and number items from 1', () => {
  assert.deepEqual(
    breadcrumbListJsonLd(
      [
        { label: 'Início', href: '/' },
        { label: 'Sem link' },
        { label: 'Calculadora', href: '/calculadora/' },
      ],
      'https://nucarbon.com.br',
    ),
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://nucarbon.com.br/' },
        { '@type': 'ListItem', position: 2, name: 'Sem link' },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'Calculadora',
          item: 'https://nucarbon.com.br/calculadora/',
        },
      ],
    },
  );
});

test('FAQ pages list every question with its answer', () => {
  assert.deepEqual(faqPageJsonLd([{ question: 'Pergunta?', answer: 'Resposta.' }]), {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Pergunta?',
        acceptedAnswer: { '@type': 'Answer', text: 'Resposta.' },
      },
    ],
  });
});

test('web applications are free, in pt-BR and published by Nucarbon', () => {
  const data = webApplicationJsonLd({
    url: 'https://nucarbon.com.br/calculadora/',
    name: 'Calculadora',
    description: 'Descrição',
  });
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data['@type'], 'WebApplication');
  assert.equal(data.url, 'https://nucarbon.com.br/calculadora/');
  assert.equal(data.applicationCategory, 'UtilitiesApplication');
  assert.equal(data.operatingSystem, 'Web');
  assert.equal(data.inLanguage, 'pt-BR');
  assert.equal(data.isAccessibleForFree, true);
  assert.deepEqual(data.offers, { '@type': 'Offer', price: '0', priceCurrency: 'BRL' });
  assert.deepEqual(data.publisher, {
    '@type': 'Organization',
    name: 'Nucarbon',
    url: 'https://nucarbon.com.br/',
  });
});
