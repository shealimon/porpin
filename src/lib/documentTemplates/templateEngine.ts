import Handlebars from "handlebars";

import layoutSource from "./templates/layout.hbs?raw";
import type { DocumentTemplateContext } from "./buildTemplateContext";

const partialSources = import.meta.glob<string>("./templates/partials/*.hbs", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

type HandlebarsEnv = ReturnType<typeof Handlebars.create>;

let engine: HandlebarsEnv | null = null;
let compileLayout: ReturnType<HandlebarsEnv["compile"]> | null = null;
let compileBodyOnly: ReturnType<HandlebarsEnv["compile"]> | null = null;

function getEngine(): HandlebarsEnv {
  if (!engine) {
    const hb = Handlebars.create();
    hb.registerHelper("blockPartial", (block: { type: string }) => `block-${block.type}`);
    for (const [path, source] of Object.entries(partialSources)) {
      const name = path.match(/\/([^/]+)\.hbs$/)?.[1];
      if (name) hb.registerPartial(name, source);
    }
    engine = hb;
  }
  return engine;
}

/** Full HTML document from `templates/layout.hbs` and partials under `templates/partials/`. */
export function renderTemplatedDocumentHtml(context: DocumentTemplateContext): string {
  if (!compileLayout) {
    compileLayout = getEngine().compile(layoutSource);
  }
  return compileLayout(context);
}

/** Article inner HTML only (same partials as the layout body). */
export function renderTemplatedArticleBodyHtml(context: DocumentTemplateContext): string {
  if (!compileBodyOnly) {
    compileBodyOnly = getEngine().compile("{{> body}}");
  }
  return compileBodyOnly(context);
}

/**
 * Pre-compile layout and body templates once (call from app entry).
 * Partials and layout source are already bundled; this avoids first-render latency.
 */
export function warmDocumentTemplateCache(): void {
  getEngine();
  if (!compileLayout) {
    compileLayout = getEngine().compile(layoutSource);
  }
  if (!compileBodyOnly) {
    compileBodyOnly = getEngine().compile("{{> body}}");
  }
}
