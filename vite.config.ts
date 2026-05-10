import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ohMyProfits',
        short_name: 'ohMyProfits',
        description:
          'Manage clients, products, and orders. Built for craft makers and small studios.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F2EFE9',
        theme_color: '#0B0B0C',
        categories: ['business', 'productivity', 'finance'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Supabase REST GETs — stale-while-revalidate per §5. The cache is
          // keyed on full URL which includes ?eq.owner_id=... in our queries,
          // so cross-user collisions are physically impossible. Vary on
          // Authorization to be paranoid about it.
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.pathname.startsWith('/rest/v1/') &&
              (url.host.includes('supabase.co') ||
                url.host.includes('127.0.0.1') ||
                url.host.includes('localhost')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rest',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
              matchOptions: { ignoreVary: false },
            },
          },
          // Supabase auth endpoints stay network-only (never cache tokens).
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/auth/v1/'),
            handler: 'NetworkOnly',
            options: { cacheName: 'supabase-auth-noop' },
          },
          // Writes queue while offline and replay when connectivity returns.
          // Per §5: conflicts surface a non-blocking banner — handled in
          // the React layer when the replay finishes.
          {
            urlPattern: ({ url, request }) =>
              (request.method === 'POST' ||
                request.method === 'PATCH' ||
                request.method === 'DELETE' ||
                request.method === 'PUT') &&
              url.pathname.startsWith('/rest/v1/') &&
              (url.host.includes('supabase.co') ||
                url.host.includes('127.0.0.1') ||
                url.host.includes('localhost')),
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'supabase-writes',
                options: {
                  maxRetentionTime: 60 * 24, // 24h, in minutes
                },
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/app'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@styles': path.resolve(__dirname, 'src/styles'),
      '@pwa': path.resolve(__dirname, 'src/pwa'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/ssr'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
