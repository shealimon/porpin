import http from 'node:http'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget = 'http://127.0.0.1:8000'

/** Pooled keep-alive to the API reduces stray ECONNRESET during dev (Node proxy ↔ uvicorn). */
const backendProxyAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 64,
})

/** Always load `.env` from this folder (next to vite.config.ts), not process.cwd(). */
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  envDir: projectRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendProxyAgent,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
      '/upload': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendProxyAgent,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
      '/job': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendProxyAgent,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
      '/translate': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendProxyAgent,
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
      '/jobs': {
        target: backendTarget,
        changeOrigin: true,
        agent: backendProxyAgent,
        timeout: 120_000,
        proxyTimeout: 120_000,
      },
    },
  },
})
