import type { AxiosProgressEvent } from 'axios'
import axios from 'axios'
import { backendClient } from '@/api/backendClient'

export type UploadEstimateResponse = {
  job_id: string
  file_name: string
  word_count: number
  estimated_cost: number
  total_words: number
  free_used: number
  subscription_used: number
  remaining_words: number
  amount_to_pay: number
  user_plan_type: string
  /** When false, the document is too short for a free preview (server rule). */
  preview_eligible?: boolean
  document_page_count?: number
  preview_pages_cap?: number
}

/** Estimate step: upload + server-side text extract. Keep below proxy/backend limits. */
const UPLOAD_ESTIMATE_TIMEOUT_MS = 120_000

export async function postPdfUpload(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadEstimateResponse> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await backendClient.post<UploadEstimateResponse>(
    '/upload',
    body,
    {
      timeout: UPLOAD_ESTIMATE_TIMEOUT_MS,
      signal,
      // Do not set Content-Type: axios must add multipart/form-data with boundary.
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    },
  )
  return data
}

export function getUploadErrorMessage(err: unknown): string {
  if (axios.isCancel(err)) {
    return 'Request was cancelled.'
  }
  if (err instanceof Error) {
    const msg = err.message
    if (/timeout|timed out|ECONNABORTED/i.test(msg)) {
      return (
        'The server did not respond in time. Start the API on port 8000 (uvicorn app.main:app) ' +
        'or check that nothing else is blocking http://127.0.0.1:8000, then try again.'
      )
    }
    if (/Network Error|ERR_NETWORK|ECONNREFUSED/i.test(msg)) {
      return (
        'Cannot reach the translation API. Run the backend (e.g. uvicorn from the backend folder) ' +
        'and keep Vite’s proxy to port 8000, then retry.'
      )
    }
    return msg
  }
  return 'Something went wrong. Please try again.'
}
