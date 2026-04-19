/**
 * Direct sync translation against FastAPI POST /translate (no job queue).
 */
export type TranslateExportFormat = 'docx' | 'pdf' | 'both'

/** Empty string = same origin (Vite proxy to backend in dev). */
function apiBase(): string {
  return import.meta.env.VITE_BACKEND_ORIGIN?.replace(/\/$/, '') ?? ''
}

export async function postTranslateSync(
  file: File,
  exportFormat: TranslateExportFormat,
  signal?: AbortSignal,
): Promise<Blob> {
  const fd = new FormData()
  fd.append('file', file)
  const base = apiBase()
  const path = `/translate?export=${encodeURIComponent(exportFormat)}`
  const url = base ? `${base}${path}` : path
  const res = await fetch(url, {
    method: 'POST',
    body: fd,
    signal,
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { detail?: string | unknown }
      if (typeof data.detail === 'string') message = data.detail
      else if (Array.isArray(data.detail)) message = JSON.stringify(data.detail)
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.blob()
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
