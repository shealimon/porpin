/**
 * Single place to register document themes (CSS + template id).
 * Add a new entry here and a matching `layout` partial if the theme needs custom markup;
 * most themes only need a new stylesheet under `styles/`.
 */
import type { DocumentTemplateId } from "./documentModel";
import academicCss from "./styles/academic.css?raw";
import bilingualCss from "./styles/bilingual.css?raw";
import blogCss from "./styles/blog.css?raw";
import ebookCss from "./styles/ebook.css?raw";
import reportCss from "./styles/report.css?raw";
import minimalCss from "./styles/minimal.css?raw";

export const DOCUMENT_TEMPLATE_ORDER: readonly DocumentTemplateId[] = [
  "ebook",
  "report",
  "minimal",
  "blog",
  "academic",
  "bilingual",
] as const;

const TEMPLATE_CSS: Record<DocumentTemplateId, string> = {
  ebook: ebookCss,
  report: reportCss,
  minimal: minimalCss,
  blog: blogCss,
  academic: academicCss,
  bilingual: bilingualCss,
};

export function isDocumentTemplateId(id: string): id is DocumentTemplateId {
  return (DOCUMENT_TEMPLATE_ORDER as readonly string[]).includes(id);
}

export function getTemplateThemeCss(templateId: DocumentTemplateId): string {
  return TEMPLATE_CSS[templateId];
}

export function resolveDocumentTemplateId(requested: string | null | undefined): DocumentTemplateId {
  if (requested && isDocumentTemplateId(requested)) {
    return requested;
  }
  return "report";
}
