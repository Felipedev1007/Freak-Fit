import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suprime warnings, mostra apenas erros
  plugins: [
    base44({
  // Suporte para código legado que importa o SDK base44 com @/integrations, @/entities, etc.
  // Pode ser removido se o código foi atualizado para usar os novos imports do @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ]
});