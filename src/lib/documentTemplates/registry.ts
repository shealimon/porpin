import type { DocumentTemplateId } from "./documentModel";

/**
 * Reusable, modular template metadata (no copy — consumers choose id + data).
 */
export const DOCUMENT_TEMPLATE_REGISTRY: Record<
  DocumentTemplateId,
  { id: DocumentTemplateId; label: string; description: string }
> = {
  ebook: {
    id: "ebook",
    label: "Ebook",
    description: "Serif typography, large margins, warm paper-like background.",
  },
  report: {
    id: "report",
    label: "Report",
    description: "Clean sans-serif, strong title rule, business-ready layout.",
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Spacious, subtle dividers, modern sans with restrained color.",
  },
  blog: {
    id: "blog",
    label: "Blog",
    description: "Large readable type, light canvas, accent rule under the title.",
  },
  academic: {
    id: "academic",
    label: "Academic",
    description: "Formal serif, generous line height, justified body text.",
  },
  bilingual: {
    id: "bilingual",
    label: "Bilingual",
    description:
      "Two-column source/target layout for PDF export (preview may show single column).",
  },
} as const;

export function listDocumentTemplateIds(): DocumentTemplateId[] {
  return Object.keys(DOCUMENT_TEMPLATE_REGISTRY) as DocumentTemplateId[];
}
