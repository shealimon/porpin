import http from 'node:http'
import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const backendTarget = 'http://40.192.24.109'

/** Pooled keep-alive to the API reduces stray ECONNRESET during dev (Node proxy ↔ uvicorn). */
const backendProxyAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 64,
})

/** Always load `.env` from this folder (next to vite.config.ts), not process.cwd(). */
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const v = loadEnv(mode, projectRoot, 'VITE_')
  const supabaseUrl = (v.VITE_SUPABASE_URL ?? '').trim()
  const supabaseAnon = (v.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const backendOrigin = (v.VITE_BACKEND_ORIGIN ?? '').trim()
  const apiBaseUrl = (v.VITE_API_BASE_URL ?? '').trim()
  const razorpayKeyId = (v.VITE_RAZORPAY_KEY_ID ?? '').trim()
  const siteOrigin = (v.VITE_SITE_ORIGIN ?? '').trim()

  if (mode === 'development' && (!supabaseUrl || !supabaseAnon)) {
    // eslint-disable-next-line no-console -- dev-only configuration nudge
    console.warn(
      '[vite] Supabase: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart Vite.',
    )
  }

  const siteHttps = siteOrigin.startsWith('https://')
  if (
    mode === 'production' &&
    siteHttps &&
    (apiBaseUrl.startsWith('http://') || backendOrigin.startsWith('http://'))
  ) {
    // eslint-disable-next-line no-console -- production misconfiguration nudge
    console.warn(
      '[vite] HTTPS deploys: http:// in VITE_API_BASE_URL / VITE_BACKEND_ORIGIN is blocked by browsers (mixed content). Prefer vercel.json rewrites + same-origin `VITE_API_BASE_URL=/api` (omit backend origin).',
    )
  }

  /** Same as dev: without this, `vite preview` serves `/api/*` as static 404. */
  const devLikeProxy: Record<string, import('vite').ProxyOptions> = {
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
    '/download': {
      target: backendTarget,
      changeOrigin: true,
      agent: backendProxyAgent,
      timeout: 120_000,
      proxyTimeout: 120_000,
    },
  }

  return {
  envDir: projectRoot,
  // Inline explicitly so the client always sees these after .env is saved (avoids empty import.meta.env when env load order/cwd differ on Windows).
  // Same for API base + backend origin: Razorpay order/verify uses backendClient → VITE_BACKEND_ORIGIN;
  // /me, /jobs, /referrals use apiClient → VITE_API_BASE_URL (client falls back to BACKEND_ORIGIN + "/api" if API URL blank).
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnon),
    ...(backendOrigin
      ? { 'import.meta.env.VITE_BACKEND_ORIGIN': JSON.stringify(backendOrigin) }
      : {}),
    ...(apiBaseUrl
      ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl) }
      : {}),
    ...(razorpayKeyId
      ? { 'import.meta.env.VITE_RAZORPAY_KEY_ID': JSON.stringify(razorpayKeyId) }
      : {}),
    ...(siteOrigin ? { 'import.meta.env.VITE_SITE_ORIGIN': JSON.stringify(siteOrigin) } : {}),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: devLikeProxy,
  },
  preview: {
    port: 4173,
    proxy: devLikeProxy,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          const n = id.replace(/\\/g, '/')
          if (n.includes('node_modules/react-dom/')) return 'react-vendor'
          if (n.includes('node_modules/react/') && !n.includes('node_modules/react-')) {
            return 'react-vendor'
          }
          if (n.includes('node_modules/scheduler/')) return 'react-vendor'
          if (n.includes('react-router')) return 'react-router'
          if (n.includes('@tanstack/react-query')) return 'tanstack-query'
          if (n.includes('@supabase')) return 'supabase'
        },
      },
    },
  },
  }
})
