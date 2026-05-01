/**
 * End-to-end client path after structured content exists: pick theme → HTML (Handlebars) → PDF or DOCX.
 * Extraction, classification, and translation run on the API; this module covers steps 5–7 for downloads.
 */
import { postHtmlToPdf, postStructuredDocumentToPdf } from "@/api/documentPdf";
import {
  buildDocumentDocxBlob,
} from "@/lib/documentTemplates/buildDocumentDocx";
import type { DocumentModel, DocumentTemplateId, ChapteredDocumentModel } from "@/lib/documentTemplates/documentModel";
import { renderDocumentHtml, renderSequencedDocumentHtml } from "@/lib/documentTemplates/renderDocument";
import type { SequencedDocumentModel } from "@/lib/documentTemplates/sequencedModel";
import { resolveDocumentTemplateId } from "@/lib/documentTemplates/templateRegistry";

export type TemplatedContent =
  | DocumentModel
  | ChapteredDocumentModel
  | SequencedDocumentModel;

export type ClientDocumentExportOptions = {
  /** Theme; invalid values fall back to `report` (see `resolveDocumentTemplateId`). */
  templateId?: DocumentTemplateId;
  filename?: string;
  baseUrl?: string;
};

export type ClientDocumentExportFormat = "pdf" | "docx";

function renderHtml(model: TemplatedContent, templateId: DocumentTemplateId): string {
  if ("blocks" in model && model.blocks) {
    return renderSequencedDocumentHtml(
      model as SequencedDocumentModel,
      templateId,
    );
  }
  return renderDocumentHtml(model as DocumentModel | ChapteredDocumentModel, templateId);
}

/**
 * 5) Resolve template → 6) Render HTML in-browser → 7) Request PDF (WeasyPrint) or build DOCX locally.
 */
export async function exportTemplatedDocument(
  model: TemplatedContent,
  format: ClientDocumentExportFormat,
  options?: ClientDocumentExportOptions,
): Promise<Blob> {
  const templateId = resolveDocumentTemplateId(options?.templateId);
  if (format === "docx") {
    return buildDocumentDocxBlob(model, templateId);
  }
  const html = renderHtml(model, templateId);
  return postHtmlToPdf(html, {
    filename: options?.filename,
    baseUrl: options?.baseUrl,
  });
}

/**
 * Same as PDF in `exportTemplatedDocument`, but sends JSON so the server applies the theme (no client HTML).
 */
export async function exportTemplatedDocumentAsPdfServerRendered(
  model: TemplatedContent,
  options?: ClientDocumentExportOptions,
): Promise<Blob> {
  return postStructuredDocumentToPdf(model, {
    templateType: resolveDocumentTemplateId(options?.templateId),
    filename: options?.filename,
    baseUrl: options?.baseUrl,
  });
}
