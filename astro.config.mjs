// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
    site: 'https://nucarbon.com.br',
    fonts: [{
        provider: fontProviders.local(),
        name: "Kollektif",
        cssVariable: "--font-kollektif",
        options: {
          variants: [{
            src: ['./src/assets/fonts/kollektif/Kollektif.ttf'],
            weight: 'normal',
            style: 'normal'
          }]
        }
      }],
    integrations: [sitemap()],
});
