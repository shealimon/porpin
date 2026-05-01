import { buildDocumentDocxBlob } from '../lib/documentTemplates/buildDocumentDocx'
import type {
  ChapteredDocumentModel,
  DocumentModel,
  DocumentTemplateId,
} from '../lib/documentTemplates/documentModel'
import type { SequencedDocumentModel } from '../lib/documentTemplates/sequencedModel'

export type DocxExportOptions = {
  filename?: string
  templateId?: DocumentTemplateId
}

function safeDocxDownloadName(filename: string | undefined): string {
  const raw =
    (filename?.trim() || 'document').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+|[._]+$/g, '') ||
    'document'
  return raw.toLowerCase().endsWith('.docx') ? raw.slice(0, 180) : `${raw.slice(0, 176)}.docx`
}

/**
 * Build a structured DOCX from the same `DocumentModel` / chaptered / sequenced types as the HTML
 * templates — without HTML or the PDF WeasyPrint path.
 */
export async function buildStructuredDocumentDocxBlob(
  model: DocumentModel | ChapteredDocumentModel | SequencedDocumentModel,
  options?: Pick<DocxExportOptions, 'templateId'>,
): Promise<Blob> {
  return buildDocumentDocxBlob(model, options?.templateId ?? 'report')
}

export async function downloadStructuredDocumentAsDocx(
  model: DocumentModel | ChapteredDocumentModel | SequencedDocumentModel,
  options?: DocxExportOptions,
): Promise<void> {
  const blob = await buildStructuredDocumentDocxBlob(model, { templateId: options?.templateId })
  const name = safeDocxDownloadName(options?.filename)
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
