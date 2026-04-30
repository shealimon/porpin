import type {
  ChapteredDocumentModel,
  DocumentChapter,
  DocumentModel,
  DocumentTemplateId,
} from "./documentModel";
import type { SequencedDocumentModel } from "./sequencedModel";

export type TemplateBlockView =
  | { type: "heading"; text: string; hLevel: number }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean };

export type TemplateChapterView = {
  title?: string;
  headings: { text: string; hLevel: number }[];
  paragraphs: string[];
  lists: { items: string[]; ordered?: boolean }[];
};

export type DocumentTemplateContext = {
  title: string;
  themeId: DocumentTemplateId;
  /** Injected inside `<style>` (trusted CSS only). */
  css: string;
  chapters: TemplateChapterView[];
  blocks: TemplateBlockView[];
};

const DEFAULT_LEVEL = 2 as const;

function normalizeChapter(ch: DocumentChapter): TemplateChapterView {
  return {
    title: ch.title,
    headings: (ch.headings ?? []).map((h) => ({
      text: h.text,
      hLevel: h.level ?? DEFAULT_LEVEL,
    })),
    paragraphs: ch.paragraphs ?? [],
    lists: (ch.lists ?? []).map((l) => ({ items: l.items, ordered: l.ordered })),
  };
}

function blocksFromDocumentModel(model: DocumentModel): TemplateBlockView[] {
  const out: TemplateBlockView[] = [];
  for (const h of model.headings) {
    out.push({ type: "heading", text: h.text, hLevel: h.level ?? DEFAULT_LEVEL });
  }
  for (const p of model.paragraphs) {
    out.push({ type: "paragraph", text: p });
  }
  for (const l of model.lists) {
    out.push({ type: "list", items: [...l.items], ordered: l.ordered });
  }
  return out;
}

function blocksFromSequenced(model: SequencedDocumentModel): TemplateBlockView[] {
  return model.blocks.map((b): TemplateBlockView => {
    if (b.type === "heading") {
      return { type: "heading", text: b.text, hLevel: b.level ?? DEFAULT_LEVEL };
    }
    if (b.type === "paragraph") {
      return { type: "paragraph", text: b.text };
    }
    return {
      type: "list",
      items: [...b.items],
      ordered: b.ordered,
    };
  });
}

function isChaptered(m: unknown): m is ChapteredDocumentModel {
  return (
    typeof m === "object" &&
    m !== null &&
    "chapters" in m &&
    Array.isArray((m as ChapteredDocumentModel).chapters)
  );
}

function isSequenced(m: unknown): m is SequencedDocumentModel {
  return (
    typeof m === "object" &&
    m !== null &&
    "blocks" in m &&
    Array.isArray((m as SequencedDocumentModel).blocks) &&
    !("chapters" in m)
  );
}

/**
 * Plain data for Handlebars (strings are escaped at render time via `{{…}}`).
 */
export function buildDocumentTemplateContext(
  model: DocumentModel | ChapteredDocumentModel | SequencedDocumentModel,
  templateId: DocumentTemplateId,
  css: string,
): DocumentTemplateContext {
  const title = model.title;

  if (isChaptered(model)) {
    return {
      title,
      themeId: templateId,
      css,
      chapters: model.chapters.map(normalizeChapter),
      blocks: [],
    };
  }

  if (isSequenced(model)) {
    return {
      title,
      themeId: templateId,
      css,
      chapters: [],
      blocks: blocksFromSequenced(model),
    };
  }

  return {
    title,
    themeId: templateId,
    css,
    chapters: [],
    blocks: blocksFromDocumentModel(model),
  };
}
