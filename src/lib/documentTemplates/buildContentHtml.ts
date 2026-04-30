import type { DocumentModel } from "./documentModel";
import { buildDocumentTemplateContext } from "./buildTemplateContext";
import type { SequencedDocumentModel } from "./sequencedModel";
import { renderTemplatedArticleBodyHtml } from "./templateEngine";

/**
 * Renders the logical document content (no outer html/body) from structured data.
 * Default order: title (h1) → all headings (h2/h3) → all paragraphs → all lists.
 */
export function buildContentHtml(model: DocumentModel): string {
  const context = buildDocumentTemplateContext(model, "report", "");
  return renderTemplatedArticleBodyHtml(context);
}

/**
 * Renders when block order is explicit (e.g. intro paragraph → h2 → list).
 */
export function buildSequencedContentHtml(model: SequencedDocumentModel): string {
  const context = buildDocumentTemplateContext(model, "report", "");
  return renderTemplatedArticleBodyHtml(context);
}
