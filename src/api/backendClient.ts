import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAxiosError } from './axiosError'

/** Same origin + Vite proxy in dev, or full origin (e.g. http://127.0.0.1:8000) in production. */
const baseURL =
  import.meta.env.VITE_BACKEND_ORIGIN?.replace(/\/$/, '') ?? ''

export const backendClient = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
  timeout: 120_000,
})

backendClient.interceptors.request.use((config) => {
  const { accessToken: token, uploadTier } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  config.headers['X-Upload-Tier'] = uploadTier === 'payg' ? 'payg' : 'trial'
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
