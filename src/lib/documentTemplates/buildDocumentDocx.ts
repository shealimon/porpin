import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  FileChild,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
} from "docx";
import { buildDocumentTemplateContext } from "./buildTemplateContext";
import type { DocumentTemplateContext, TemplateBlockView, TemplateChapterView } from "./buildTemplateContext";
import type { ChapteredDocumentModel, DocumentModel, DocumentTemplateId } from "./documentModel";
import type { SequencedDocumentModel } from "./sequencedModel";

const BULLET_REF = "struct-bullet";
const NUMBER_REF = "struct-numbered";

const DOC_PARA_AFTER = 200;
const H1_AFTER = 400;
const H2_BEFORE = 240;
const H2_AFTER = 120;
const H3_BEFORE = 200;
const H3_AFTER = 100;
const LIST_INTER_ITEM = 60;
const LIST_BLOCK_AFTER = 200;

type HeadingKind = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function mapHLevelToHeading(hLevel: number): HeadingKind {
  if (hLevel <= 1) return HeadingLevel.HEADING_1;
  if (hLevel === 2) return HeadingLevel.HEADING_2;
  if (hLevel === 3) return HeadingLevel.HEADING_3;
  if (hLevel === 4) return HeadingLevel.HEADING_4;
  if (hLevel === 5) return HeadingLevel.HEADING_5;
  return HeadingLevel.HEADING_6;
}

function headingSpacing(hLevel: number, isFirstInFlow: boolean): { before: number; after: number } {
  if (hLevel >= 2 && hLevel <= 3) {
    return {
      before: hLevel === 2 ? (isFirstInFlow ? 0 : H2_BEFORE) : isFirstInFlow ? 0 : H3_BEFORE,
      after: hLevel === 2 ? H2_AFTER : H3_AFTER,
    };
  }
  return { before: isFirstInFlow ? 0 : 160, after: 100 };
}

function bodyParagraphStyle(): { spacing: { after: number; line: number; lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] } } {
  return {
    spacing: {
      after: DOC_PARA_AFTER,
      line: 276,
      lineRule: LineRuleType.AUTO,
    },
  };
}

const numbering = {
  config: [
    {
      reference: BULLET_REF,
      levels: [
        {
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.START,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
      ],
    },
    {
      reference: NUMBER_REF,
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.START,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
      ],
    },
  ],
} as const;

function appendListParagraphs(
  out: FileChild[],
  items: string[],
  ordered: boolean,
  gapBefore: boolean,
): void {
  const ref = ordered ? NUMBER_REF : BULLET_REF;
  const clean = items.map((s) => s.trim()).filter((s) => s.length > 0);
  if (clean.length === 0) return;
  for (let i = 0; i < clean.length; i++) {
    out.push(
      new Paragraph({
        text: clean[i],
        numbering: { reference: ref, level: 0 },
        spacing: {
          before: i === 0 && gapBefore ? 120 : 0,
          after: i === clean.length - 1 ? LIST_BLOCK_AFTER : LIST_INTER_ITEM,
        },
      }),
    );
  }
}

function appendBlocks(
  out: FileChild[],
  blocks: TemplateBlockView[],
  startFirst: { isFirst: boolean },
  hadTitle: boolean,
): void {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    if (b.type === "heading") {
      const h = b.hLevel;
      const isFirstBlock = i === 0;
      const treatAsStart =
        (hadTitle && isFirstBlock) || (startFirst.isFirst && isFirstBlock);
      const { before, after } = headingSpacing(h, treatAsStart);
      out.push(
        new Paragraph({
          text: b.text,
          heading: mapHLevelToHeading(h),
          spacing: { before, after },
        }),
      );
      startFirst.isFirst = false;
      continue;
    }
    if (b.type === "paragraph") {
      const t = b.text.trim();
      if (!t) continue;
      out.push(
        new Paragraph({
          text: t,
          ...bodyParagraphStyle(),
        }),
      );
      startFirst.isFirst = false;
      continue;
    }
    appendListParagraphs(out, b.items, Boolean(b.ordered), out.length > 0);
    startFirst.isFirst = false;
  }
}

function appendChapter(out: FileChild[], ch: TemplateChapterView, isFirstChapter: boolean): void {
  if (ch.title) {
    const t = ch.title.trim();
    if (t) {
      out.push(
        new Paragraph({
          text: t,
          heading: HeadingLevel.HEADING_2,
          spacing: {
            before: isFirstChapter ? 0 : H2_BEFORE,
            after: H2_AFTER,
          },
        }),
      );
    }
  }
  for (const h of ch.headings) {
    const { before, after } = headingSpacing(h.hLevel, false);
    out.push(
      new Paragraph({
        text: h.text,
        heading: mapHLevelToHeading(h.hLevel),
        spacing: { before, after },
      }),
    );
  }
  for (const p of ch.paragraphs) {
    const t = p.trim();
    if (!t) continue;
    out.push(new Paragraph({ text: t, ...bodyParagraphStyle() }));
  }
  for (const list of ch.lists) {
    appendListParagraphs(out, list.items, Boolean(list.ordered), out.length > 0);
  }
}

/**
 * Map structured content to OOXML: title → Heading 1, section headings → Heading 2/3 (etc.),
 * body → justified paragraphs, lists → built-in bullet or decimal numbering. Does not use HTML,
 * Handlebars, or the PDF/WeasyPrint path.
 */
export function buildDocumentDocx(
  model: DocumentModel | ChapteredDocumentModel | SequencedDocumentModel,
  /** Unused for layout; only selects the same `DocumentTemplateContext` shape as the HTML path. */
  _templateId: DocumentTemplateId = "report",
): Document {
  const ctx: DocumentTemplateContext = buildDocumentTemplateContext(model, _templateId, "");
  return buildDocumentDocxFromContext(ctx);
}

export function buildDocumentDocxFromContext(ctx: DocumentTemplateContext): Document {
  const children: FileChild[] = [];
  const startFirst = { isFirst: true };
  const hadTitle = Boolean(ctx.title?.trim());
  if (hadTitle) {
    children.push(
      new Paragraph({
        text: ctx.title!.trim(),
        heading: HeadingLevel.HEADING_1,
        spacing: { after: H1_AFTER },
        alignment: AlignmentType.START,
      }),
    );
    startFirst.isFirst = false;
  }
  if (ctx.chapters.length > 0) {
    for (let i = 0; i < ctx.chapters.length; i++) {
      appendChapter(children, ctx.chapters[i]!, i === 0);
    }
  } else {
    appendBlocks(children, ctx.blocks, startFirst, hadTitle);
  }

  return new Document({
    title: ctx.title,
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 24,
          },
          paragraph: {
            alignment: AlignmentType.BOTH,
            spacing: { line: 276, lineRule: LineRuleType.AUTO, after: DOC_PARA_AFTER },
          },
        },
      },
    },
    numbering,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });
}

export async function buildDocumentDocxBlob(
  model: DocumentModel | ChapteredDocumentModel | SequencedDocumentModel,
  templateId: DocumentTemplateId = "report",
): Promise<Blob> {
  const doc = buildDocumentDocx(model, templateId);
  return Packer.toBlob(doc);
}

export async function buildDocumentDocxBlobFromContext(ctx: DocumentTemplateContext): Promise<Blob> {
  return Packer.toBlob(buildDocumentDocxFromContext(ctx));
}
