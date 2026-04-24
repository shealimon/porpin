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

  const asyncMarker =
    res.headers.get('X-Translator-Response') ?? res.headers.get('x-translator-response')
  const contentType = res.headers.get('content-type') ?? ''
  const looksLikeJson =
    asyncMarker === 'async-job-enqueued' || /\bapplication\/json\b/i.test(contentType)

  if (looksLikeJson) {
    let jobId: string | undefined
    try {
      const data = (await res.json()) as { job_id?: string }
      jobId = typeof data.job_id === 'string' ? data.job_id : undefined
    } catch {
      /* ignore */
    }
    throw new Error(
      'This server returns a translation job (JSON), not a DOCX/PDF file. Use Upload in the app to get your document, ' +
        (jobId
          ? `or open the job page for id ${jobId.slice(0, 8)}… `
          : '') +
        'For direct file download from /translate, set ENABLE_SYNC_TRANSLATE=true on the API (dev only).',
    )
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

const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g
const MAX_STEM_LEN = 180

/** ``Sleep_Book.pdf`` + ``docx`` → ``Sleep_Book-Hinglish.docx`` (matches backend rules). */
export function hinglishExportFilename(uploadName: string, ext: 'docx' | 'pdf' | 'zip'): string {
  const lastDot = uploadName.lastIndexOf('.')
  let stem = lastDot > 0 ? uploadName.slice(0, lastDot) : uploadName
  stem = stem.replace(INVALID_FILENAME_CHARS, '_').replace(/^[\s.]+|[\s.]+$/g, '')
  if (!stem) stem = 'document'
  if (stem.length > MAX_STEM_LEN) {
    stem = stem.slice(0, MAX_STEM_LEN).replace(/[\s.]+$/g, '') || 'document'
  }
  return `${stem}-Hinglish.${ext}`
}
