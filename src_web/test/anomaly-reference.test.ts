import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createAnomalyReference } from "../src/adapters/browser/anomaly-reference-view";
afterEach(() => vi.unstubAllGlobals());
it("keeps the archive read-only except navigation", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const locate = vi.fn();
  const view = createAnomalyReference(document.body, locate);
  expect(view.element.querySelectorAll("input,select,progress")).toHaveLength(
    0,
  );
  view.element
    .querySelector<HTMLButtonElement>("[data-locate-source]")!
    .click();
  expect(locate).toHaveBeenCalledOnce();
});
