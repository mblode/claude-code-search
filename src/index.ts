import { render } from "ink";
import { createElement } from "react";
import { App } from "./app.js";

export function run(cwd: string, projectFilter?: string) {
  render(createElement(App, { cwd, initialProjectFilter: projectFilter }));
}
