import { backendClient } from './backendClient'
import type {
  ChapteredDocumentModel,
  DocumentModel,
  DocumentTemplateId,
} from '@/lib/documentTemplates/documentModel'
import type { SequencedDocumentModel } from '@/lib/documentTemplates/sequencedModel'

export type HtmlToPdfOptions = {
  /** Suggested download filename; .pdf added if missing. */
  filename?: string
  /** Base URL for relative link href and CSS url() (optional). */
  baseUrl?: string
}

export type TemplatedDocumentPayload =
  | DocumentModel
  | ChapteredDocumentModel
  | SequencedDocumentModel

export type DocumentToPdfOptions = HtmlToPdfOptions & {
  /** Server-side theme: ebook, report, or minimal. Omitted or invalid → report. */
  templateType?: DocumentTemplateId
}

function safePdfDownloadName(filename: string | undefined): string {
  const raw = (filename?.trim() || 'document').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+|[._]+$/g, '') || 'document'
  return raw.toLowerCase().endsWith('.pdf') ? raw.slice(0, 180) : `${raw.slice(0, 176)}.pdf`
}

/** POST full HTML (e.g. from renderDocumentHtml) to WeasyPrint; returns PDF bytes. */
export async function postHtmlToPdf(html: string, options?: HtmlToPdfOptions): Promise<Blob> {
  const res = await backendClient.post<ArrayBuffer>(
    '/api/document/html-to-pdf',
    { html, filename: options?.filename, base_url: options?.baseUrl },
    {
      responseType: 'arraybuffer',
      headers: { Accept: 'application/pdf' },
    },
  )
  return new Blob([res.data], { type: 'application/pdf' })
}

/**
 * POST structured content + optional `templateType`; the API applies the matching theme and PDF output.
 * Same data shape as the in-app `renderDocumentHtml` flow, without pre-rendering HTML on the client.
 */
export async function postStructuredDocumentToPdf(
  document: TemplatedDocumentPayload,
  options?: DocumentToPdfOptions,
): Promise<Blob> {
  const res = await backendClient.post<ArrayBuffer>(
    '/api/document/html-to-pdf',
    {
      document,
      template_type: options?.templateType,
      filename: options?.filename,
      base_url: options?.baseUrl,
    },
    {
      responseType: 'arraybuffer',
      headers: { Accept: 'application/pdf' },
    },
  )
  return new Blob([res.data], { type: 'application/pdf' })
}

/** Request PDF and trigger a browser download. */
export async function downloadHtmlAsPdf(html: string, options?: HtmlToPdfOptions): Promise<void> {
  const blob = await postHtmlToPdf(html, options)
  const name = safePdfDownloadName(options?.filename)
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.rel = 'noopener'
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
