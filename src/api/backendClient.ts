import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { normalizeAxiosError } from './axiosError'

export const backendClient = axios.create({
  baseURL: '',
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
