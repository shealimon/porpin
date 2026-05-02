import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAxiosError } from './axiosError'

/** Extra hint when HTTPS page + http:// API triggers mixed-content blocking (Axios "Network Error"). */
export function explainIfLikelyMixedContent(error: unknown): string | undefined {
  if (typeof window === 'undefined') return undefined
  if (window.location.protocol !== 'https:') return undefined
  const msg = error instanceof Error ? error.message : String(error)
  if (!/\bNetwork Error\b/i.test(msg)) return undefined
  const bo = String(import.meta.env.VITE_BACKEND_ORIGIN ?? '')
    .trim()
    .replace(/\/$/, '')
  if (bo.startsWith('http://')) {
    return `${msg} — HTTPS sites cannot call http:// APIs from the browser. Put HTTPS on your API (e.g. api.porpin.com) and set VITE_BACKEND_ORIGIN to that HTTPS URL at build time.`
  }
  return undefined
}

export const apiClient = axios.create({
  baseURL: '',
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
