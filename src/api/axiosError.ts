import axios, { isAxiosError } from 'axios'

export class ApiRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

export function normalizeAxiosError(err: unknown): Error {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { detail?: unknown; message?: unknown }
      | undefined
    const detail = data?.detail
    const message = data?.message
    const text =
      (typeof detail === 'string' && detail) ||
      (typeof message === 'string' && message) ||
      err.message ||
      'Request failed'
    return new ApiRequestError(text, err.response?.status)
  }
  if (err instanceof Error) return err
  return new Error(String(err))
}

export function isApiRequestError(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError
}

export function isAxiosUnauthorized(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401
}
