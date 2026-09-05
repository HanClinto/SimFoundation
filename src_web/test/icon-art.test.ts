import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

describe("desktop icon art contract", () => {
  it("uses one canvas and self-contained SVGs for original subsystem icons", () => {
    for (const name of [
      "facility",
      "folder",
      "book",
      "alarm",
      "budget",
      "records",
      "work-orders",
      "control",
      "debug",
      "camera",
      "personnel",
      "medical",
    ]) {
      const source = readFileSync(
        new URL(`../src/adapters/browser/assets/${name}.svg`, import.meta.url),
        "utf8",
      );
      const document = new JSDOM(source, { contentType: "image/svg+xml" })
        .window.document;
      expect(document.documentElement.getAttribute("viewBox")).toBe(
        "0 0 32 32",
      );
      expect(
        document.querySelectorAll("script,image,foreignObject"),
      ).toHaveLength(0);
      expect(document.querySelectorAll("path").length).toBeGreaterThan(2);
    }
  });
});
