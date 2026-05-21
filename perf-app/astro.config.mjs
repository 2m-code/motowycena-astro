// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Perf-app musi być SSR (output: 'server') bo:
 * - Endpoint /api/audit uruchamia Puppeteera (server-side, długo trwa)
 * - SSE stream wymaga keep-alive HTTP connection
 * Adapter Node 'standalone' = wbudowany server (npm start).
 */
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  server: {
    port: 4400,
    host: '0.0.0.0',
  },
  vite: {
    plugins: [tailwindcss()],
    // Puppeteer ma natywne deps - nie bundle'ujemy go
    ssr: {
      external: ['puppeteer'],
      noExternal: [],
    },
  },
});
