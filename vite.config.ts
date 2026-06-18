import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { changelogsPlugin } from './build-tools/vite-plugin-changelogs'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },

  plugins: [
    changelogsPlugin(),

    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: false, // main.js で手動登録するため無効化

      manifest: {
        name: 'PenAno',
        short_name: 'PenAno',
        description: 'iPad + Apple Pencil対応 ローカルアノテーションツール',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d0d14',
        theme_color: '#0d0d14',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        runtimeCaching: [
          {
            // changelogs以下のJSON/HTMLはネットワーク優先
            urlPattern: /\/changelogs\/.+\.(json|html)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'changelog-cache',
            }
          }
        ]
      }
    })
  ]
})
