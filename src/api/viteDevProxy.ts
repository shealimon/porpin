/**
 * In development, `.env` often repeats production API URLs. The browser cannot use Vite's
 * `server.proxy` when axios/fetch uses an absolute origin — requests go straight to that host
 * (often unreachable or firewalled locally). Prefer same-origin relative paths so the dev
 * server forwards to `vite.config.ts`'s target (default http://127.0.0.1:8000).
 *
 * Set `VITE_DEV_USE_VITE_PROXY=false` in `.env.development.local` to call `VITE_BACKEND_ORIGIN` directly.
 */
export function devShouldUseViteProxy(): boolean {
  return (
    Boolean(import.meta.env.DEV) &&
    (import.meta.env.VITE_DEV_USE_VITE_PROXY ?? 'true').trim().toLowerCase() !== 'false'
  )
}

/** True when `url` is empty, relative, or http(s)://localhost|127.0.0.1. */
export function isLoopbackHttpOrigin(url: string): boolean {
  const o = url.replace(/\/$/, '').trim()
  if (!o) return true
  if (!/^https?:\/\//i.test(o)) return true
  try {
    const h = new URL(o).hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1'
  } catch {
    return false
  }
}

function normalizeBackendOriginEnv(value: string | undefined): string {
  if (!value) return ''
  let v = value.trim().replace(/\/$/, '')
  if (v.toLowerCase().endsWith('/api')) {
    v = v.slice(0, -4)
  }
  return v || ''
}

/** Backend origin from env (host only), same rules as `getConfiguredBackendOrigin`. */
export function configuredBackendOriginFromEnv(): string {
  return normalizeBackendOriginEnv(import.meta.env.VITE_BACKEND_ORIGIN as string | undefined)
}

/** Axios `baseURL` for `/upload`, `/job`, `/api/create-order`, … */
export function resolveBackendAxiosBaseUrl(): string {
  const c = configuredBackendOriginFromEnv()
  if (!devShouldUseViteProxy() || !c) return c
  if (isLoopbackHttpOrigin(c)) return c
  return ''
}
