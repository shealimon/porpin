import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAxiosError } from './axiosError'

/**
 * API origin (no path suffix). Strips a trailing `/api` so paths like
 * `/api/create-order` are not double-prefixed when VITE_BACKEND_ORIGIN is
 * set to e.g. `https://api.example.com/api` by mistake.
 */
export function normalizeBackendOrigin(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.replace(/\/$/, '')
  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed.slice(0, -4) || ''
  }
  return trimmed
}

/** When set (e.g. production), fetch/axios must use this host instead of the static page origin. */
export function getConfiguredBackendOrigin(): string {
  return normalizeBackendOrigin(
    (import.meta.env.VITE_BACKEND_ORIGIN as string | undefined) ?? undefined,
  )
}

/** Same origin + Vite proxy in dev / preview, or full origin in production. */
const baseURL = getConfiguredBackendOrigin()

export const backendClient = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 120_000,
})

backendClient.interceptors.request.use((config) => {
  const { accessToken: token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

backendClient.interceptors.response.use(
  (res) => res,
  (err: unknown) => {
    // Do not wrap cancellations — callers rely on axios.isCancel / clean abort handling.
    if (axios.isCancel(err)) return Promise.reject(err)
    return Promise.reject(normalizeAxiosError(err))
  },
)
