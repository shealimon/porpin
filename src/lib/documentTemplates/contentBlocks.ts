import { escapeHtml } from "./escapeHtml";

/**
 * Ordered body content — use when section flow must interleave headings, paragraphs, and lists.
 */
export type ContentBlock =
  | { type: "heading"; text: string; level?: 2 | 3 }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean };

const DEFAULT_LEVEL = 2 as const;

export function buildBodyHtmlFromContentBlocks(blocks: ContentBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "heading") {
      const L = b.level ?? DEFAULT_LEVEL;
      parts.push(
        `<h${L} class="doc-heading doc-heading--${L}">${escapeHtml(b.text)}</h${L}>`,
      );
    } else if (b.type === "paragraph") {
      parts.push(`<p class="doc-paragraph">${escapeHtml(b.text)}</p>`);
    } else {
      const tag = b.ordered ? "ol" : "ul";
      const items = b.items
        .map((item) => `<li class="doc-list-item">${escapeHtml(item)}</li>`)
        .join("");
      parts.push(`<${tag} class="doc-list">${items}</${tag}>`);
    }
  }
  return parts.join("\n");
}
