import { render } from "ink";
import { createElement } from "react";

import { App } from "./app.js";
import type { MessageSource } from "./types/index.js";

export { loadMessages } from "./services/loader.js";
export { search } from "./services/matcher.js";
export type {
  MessageSource,
  ParsedMessage,
  SearchResult,
} from "./types/index.js";

export function run(
  cwd: string,
  projectFilter?: string,
  sources?: MessageSource[]
) {
  render(
    createElement(App, {
      cwd,
      initialProjectFilter: projectFilter,
      sources,
    })
  );
}
