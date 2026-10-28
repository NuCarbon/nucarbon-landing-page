// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  adapter: netlify(),
  site: 'https://nucarbon.com.br',
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Kollektif',
      cssVariable: '--font-kollektif',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/kollektif/Kollektif.ttf'],
            weight: 400,
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/kollektif/Kollektif-Bold.ttf'],
            weight: 700,
            style: 'normal',
          },
        ],
      },
    },
  ],
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/app') && !page.includes('/entrar') && !page.includes('/checkout'),
    }),
  ],
  devToolbar: {
    enabled: false,
  },
});
