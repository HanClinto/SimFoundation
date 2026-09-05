import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("source reference catalog", () => {
  it("retains article text, provenance, and separate interpretation", () => {
    const root = new URL("../docs/references/", import.meta.url);
    const catalog = JSON.parse(
      readFileSync(new URL("catalog.json", root), "utf8"),
    );
    for (const entry of catalog.entries) {
      expect(entry.author).toBeTruthy();
      expect(entry.license).toBe("CC-BY-SA-3.0");
      expect(entry.url).toMatch(/^https:\/\//);
      const text = readFileSync(new URL(entry.text, root), "utf8");
      expect(text).toContain("Special Containment Procedures:");
      expect(text).toContain("Addendum SCP-999-A:");
      expect(text).toContain("Addendum SCP-999-B:");
      expect(text).toContain("Memo from Dr.");
      expect(readFileSync(new URL(entry.notes, root), "utf8")).toContain(
        "Game Abstractions",
      );
    }
  });
});
