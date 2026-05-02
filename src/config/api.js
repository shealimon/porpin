function normalizeBase(value) {
  if (value == null || typeof value !== 'string') return ''
  let s = value.trim().replace(/\/$/, '')
  if (s.toLowerCase().endsWith('/api')) {
    s = s.slice(0, -4)
  }
  return s
}

/** In development, route through the Vite dev server proxy (see vite.config.ts → 127.0.0.1:8000). */
function devPreferViteProxy() {
  const flag = String(import.meta.env.VITE_DEV_USE_VITE_PROXY ?? 'true').toLowerCase()
  return flag !== 'false'
}

const rawBackend = normalizeBase(import.meta.env.VITE_BACKEND_ORIGIN)
const API_BASE =
  import.meta.env.DEV && devPreferViteProxy() ? '' : rawBackend

if (!import.meta.env.DEV && !API_BASE) {
  console.error(
    '[api] Production build requires VITE_BACKEND_ORIGIN (e.g. https://api.yourdomain.com).',
  )
}

if (
  import.meta.env.DEV &&
  !API_BASE &&
  import.meta.env.VITE_BACKEND_ORIGIN === undefined &&
  devPreferViteProxy()
) {
  console.warn(
    '[api] VITE_BACKEND_ORIGIN unset — using same-origin paths (Vite proxy → localhost:8000).',
  )
}

export function apiUrl(path) {
  const p = typeof path === 'string' && path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}
