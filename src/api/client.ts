import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAxiosError } from './axiosError'

/**
 * `/me`, `/jobs`, `/referrals` live under FastAPI `/api/...`.
 * If `VITE_API_BASE_URL` is unset or blank (e.g. empty env on Vercel), fall back to
 * `VITE_BACKEND_ORIGIN + '/api'` so production never silently uses same-origin `/api`
 * (that hits www.porpin.com and returns 404).
 */
export function resolvePublicApiBaseUrl(): string {
  const explicit = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '').trim()
  if (explicit.length > 0) return explicit
  const backend = (import.meta.env.VITE_BACKEND_ORIGIN ?? '').replace(/\/$/, '').trim()
  if (backend.length > 0) return `${backend}/api`
  return '/api'
}

const baseURL = resolvePublicApiBaseUrl()

/** Extra hint when HTTPS page + http:// API triggers mixed-content blocking (Axios "Network Error"). */
export function explainIfLikelyMixedContent(error: unknown): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (window.location.protocol !== 'https:') return undefined
  const msg = error instanceof Error ? error.message : String(error)
  if (!/\bNetwork Error\b/i.test(msg)) return undefined
  const api = resolvePublicApiBaseUrl()
  const bo = (import.meta.env.VITE_BACKEND_ORIGIN ?? '').replace(/\/$/, '').trim()
  if (api.startsWith('http://') || bo.startsWith('http://')) {
    return `${msg} — HTTPS sites cannot call http:// APIs from the browser. Use vercel.json rewrites + same-origin paths (see frontend/.env.production), or put HTTPS on your API.`
  }
  return undefined
}

export const apiClient = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 120_000,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    if (axios.isCancel(err)) return Promise.reject(err)
    return Promise.reject(normalizeAxiosError(err))
  },
)
