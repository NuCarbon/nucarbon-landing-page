// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://nucarbon.netlify.app',
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
      }]
});
