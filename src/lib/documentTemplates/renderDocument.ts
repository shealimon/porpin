import type {
  ChapteredDocumentModel,
  DocumentModel,
  DocumentTemplateId,
} from "./documentModel";
import { buildDocumentTemplateContext } from "./buildTemplateContext";
import type { SequencedDocumentModel } from "./sequencedModel";
import { getTemplateThemeCss, isDocumentTemplateId } from "./templateRegistry";
import { renderTemplatedDocumentHtml } from "./templateEngine";

/**
 * Renders a full HTML document from `templates/layout.hbs`, theme CSS, and structured data.
 */
export function renderDocumentHtml(
  model: DocumentModel | ChapteredDocumentModel,
  templateId: DocumentTemplateId = "report",
): string {
  if (!isDocumentTemplateId(templateId)) {
    throw new Error(`Unknown document template: ${templateId}`);
  }
  const css = indentCssForStyleTag(getTemplateThemeCss(templateId));
  const context = buildDocumentTemplateContext(model, templateId, css);
  return renderTemplatedDocumentHtml(context);
}

/**
 * Full HTML document with explicit block order (interleaved sections).
 */
export function renderSequencedDocumentHtml(
  model: SequencedDocumentModel,
  templateId: DocumentTemplateId = "report",
): string {
  if (!isDocumentTemplateId(templateId)) {
    throw new Error(`Unknown document template: ${templateId}`);
  }
  const css = indentCssForStyleTag(getTemplateThemeCss(templateId));
  const context = buildDocumentTemplateContext(model, templateId, css);
  return renderTemplatedDocumentHtml(context);
}

/** Indent injected CSS to match the shell for readable source (optional for consumers). */
function indentCssForStyleTag(css: string): string {
  return css
    .split("\n")
    .map((line) => (line.length ? `      ${line}` : line))
    .join("\n");
}
