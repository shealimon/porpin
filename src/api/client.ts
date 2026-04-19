import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAxiosError } from './axiosError'

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '/api'

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
