/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages等のサブパス配信用。CIで DEPLOY_BASE=/mycal/ を渡す(ローカルは '/')
const base = process.env.DEPLOY_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'MyCal - ライフログカレンダー',
        short_name: 'MyCal',
        description: 'Google予定の上に習慣・売買・食事の記録レイヤーを重ねる自分専用カレンダー',
        lang: 'ja',
        display: 'standalone',
        start_url: base,
        scope: base,
        theme_color: '#1e293b',
        background_color: '#0f172a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    port: 3000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
