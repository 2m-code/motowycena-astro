// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// KRYTYCZNE: zachowujemy strukturę URL identyczną jak na obecnej stronie.
// trailingSlash 'always' + build.format 'directory' generuje /kontakt/index.html
// czyli URL /kontakt/ działa BEZ przekierowania 301 → zero ryzyka SEO.
export default defineConfig({
  site: 'https://www.motowycena.pl',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  integrations: [
    react(),
    sitemap({
      changefreq: 'monthly',
      priority: 0.7,
      lastmod: new Date(),
      // Strona główna ma priority 1.0, usługi 0.9, reszta 0.7.
      serialize(item) {
        if (item.url === 'https://www.motowycena.pl/') {
          item.priority = 1.0;
          item.changefreq = ChangeFreqEnum.WEEKLY;
        } else if (
          item.url.includes('/wycena-') ||
          item.url.includes('/biegly-') ||
          item.url.includes('/doradztwo-') ||
          item.url.includes('/opis-stanu-') ||
          item.url.includes('/zmiany-') ||
          item.url.includes('/pomoc-') ||
          item.url.includes('/polisy-') ||
          item.url.includes('/pojazdy-')
        ) {
          item.priority = 0.9;
        }
        return item;
      },
    }),
    mdx(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  experimental: {
    clientPrerender: true,
  },
});
