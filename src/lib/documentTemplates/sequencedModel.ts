import type { ContentBlock } from "./contentBlocks";

/**
 * Document with an explicit block order (heading / paragraph / list in any interleaving).
 */
export type SequencedDocumentModel = {
  title: string;
  blocks: ContentBlock[];
};
