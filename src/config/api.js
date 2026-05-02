if (import.meta.env.VITE_BACKEND_ORIGIN === undefined) {
  console.error('VITE_BACKEND_ORIGIN is not set')
}

function normalizeBase(value) {
  if (value == null || typeof value !== 'string') return ''
  let s = value.trim().replace(/\/$/, '')
  if (s.toLowerCase().endsWith('/api')) {
    s = s.slice(0, -4)
  }
  return s
}

const API_BASE = normalizeBase(import.meta.env.VITE_BACKEND_ORIGIN)

export function apiUrl(path) {
  const p = typeof path === 'string' && path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}
