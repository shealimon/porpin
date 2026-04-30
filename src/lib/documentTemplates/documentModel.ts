/**
 * Content model for document rendering. All string fields are treated as data — never
 * hardcode narrative copy; pass values from the caller.
 */
export type DocumentListBlock = {
  items: string[];
  /** When true, render as a numbered list (DOCX/HTML); default is bullets. */
  ordered?: boolean;
};

/**
 * A single heading line (e.g. section title). Use level 2 for most sections; 3 for subheads.
 */
export type DocumentHeading = {
  text: string;
  level?: 2 | 3;
};

export type DocumentModel = {
  title: string;
  headings: DocumentHeading[];
  paragraphs: string[];
  lists: DocumentListBlock[];
};

/**
 * One chapter: optional title, then headings / paragraphs / lists (templates loop each array).
 */
export type DocumentChapter = {
  title?: string;
  headings?: DocumentHeading[];
  paragraphs?: string[];
  lists?: DocumentListBlock[];
};

/** Multi-chapter document; rendered via template `{{#each chapters}}`. */
export type ChapteredDocumentModel = {
  title: string;
  chapters: DocumentChapter[];
};

export type DocumentTemplateId =
  | "ebook"
  | "report"
  | "minimal"
  | "blog"
  | "academic"
  | "bilingual";
