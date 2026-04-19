import { useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  downloadBlob,
  postTranslateSync,
  type TranslateExportFormat,
} from '@/features/translate/syncApi'

const FORMATS: { value: TranslateExportFormat; label: string }[] = [
  { value: 'docx', label: 'Word (.docx)' },
  { value: 'pdf', label: 'PDF only' },
  { value: 'both', label: 'ZIP — Word + PDF' },
]

export function SyncTranslatePage() {
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<TranslateExportFormat>('both')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Choose a file.')
      return
    }
    setError(null)
    setBusy(true)
    const ac = new AbortController()
    try {
      const blob = await postTranslateSync(file, format, ac.signal)
      const ext =
        format === 'both' ? 'zip' : format === 'pdf' ? 'pdf' : 'docx'
      downloadBlob(blob, `translated_hinglish.${ext}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
        Hinglish translate
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Upload PDF, DOCX, or TXT. The server returns a translated document (natural
        Hinglish, Roman script).
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            File
          </label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className={cn(
              'mt-1 block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800 dark:text-zinc-400 dark:file:bg-zinc-100 dark:file:text-zinc-900',
            )}
            onChange={(ev) => {
              const f = ev.target.files?.[0] ?? null
              setFile(f)
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Download as
          </label>
          <select
            value={format}
            onChange={(e) =>
              setFormat(e.target.value as TranslateExportFormat)
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          >
            {FORMATS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            PDF/ZIP needs LibreOffice or docx2pdf on the server.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !file}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? 'Translating…' : 'Translate & download'}
        </button>
      </form>
    </div>
  )
}
