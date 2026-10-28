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
            weight: 'normal',
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
  vite: {
    optimizeDeps: {
      exclude: ['js-big-decimal'],
    },
  },
  devToolbar: {
    enabled: false,
  },
});
