import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface CatalogEntry {
  id: string;
  title: string;
  author: string;
  license: string;
  url: string;
  requestedUrl?: string;
  canonicalUrl?: string;
  archiveTimestamp?: string;
  sourceType?: string;
  sourceStatus?: string;
  text: string;
  html?: string;
  notes?: string;
}

function readCatalog(root: URL) {
  return JSON.parse(readFileSync(new URL("catalog.json", root), "utf8")) as {
    version: number;
    entries: CatalogEntry[];
  };
}

describe("source reference catalog", () => {
  it("retains archived source material and provenance", () => {
    const root = new URL("../docs/references/", import.meta.url);
    const catalog = readCatalog(root);
    expect(catalog.version).toBeGreaterThanOrEqual(1);
    for (const entry of catalog.entries) {
      expect(entry.author).toBeTruthy();
      expect(entry.license).toBe("CC-BY-SA-3.0");
      expect(entry.url).toMatch(/^https:\/\//);
      const text = readFileSync(new URL(entry.text, root), "utf8");
      expect(text.length).toBeGreaterThan(100);
      if (entry.html) {
        const html = readFileSync(new URL(entry.html, root), "utf8");
        expect(html).toContain("<main>");
        expect(html).toContain(entry.url);
      }
      if (entry.notes) {
        expect(readFileSync(new URL(entry.notes, root), "utf8")).toMatch(
          /## Game (?:Adaptation|Abstractions)/,
        );
      }
    }
  });

  it("archives every recommended SCP Wiki page without remote media", () => {
    const root = new URL("../docs/references/", import.meta.url);
    const recommendations = readFileSync(
      new URL("AbbysSCPRecommendations.md", root),
      "utf8",
    );
    const expectedUrls = new Set(
      [
        ...recommendations.matchAll(
          /https?:\/\/(?:www\.)?scp-wiki\.net\/([^\s)]+)/g,
        ),
      ]
        .map((match) => match[1]!.replace(/[.,;:!?]+$/, "").toLowerCase())
        .filter((slug) => slug !== "top-rated-pages")
        .map((slug) => `https://scp-wiki.wikidot.com/${slug}`),
    );
    const catalog = readCatalog(root);
    const archivedUrls = new Set(
      catalog.entries.map((entry) => entry.requestedUrl ?? entry.url),
    );

    expect(expectedUrls.size).toBe(58);
    for (const url of expectedUrls) expect(archivedUrls).toContain(url);
    for (const entry of catalog.entries) {
      if (!entry.html) continue;
      const html = readFileSync(new URL(entry.html, root), "utf8");
      expect(html).not.toMatch(
        /<(?:img|audio|video|source|iframe)\b[^>]*(?:src|poster)=["'](?:https?:)?\/\//i,
      );
    }
  });

  it("retains the two pinned historical articles separately from removal notices", () => {
    const root = new URL("../docs/references/", import.meta.url);
    const catalog = readCatalog(root);
    const historical = catalog.entries.filter(
      (entry) => entry.sourceType === "internet-archive-snapshot",
    );

    expect(historical).toHaveLength(2);
    expect(historical.map((entry) => entry.canonicalUrl).sort()).toEqual([
      "https://scp-wiki.wikidot.com/scp-001-o5",
      "https://scp-wiki.wikidot.com/scp-963",
    ]);
    for (const entry of historical) {
      expect(entry.archiveTimestamp).toMatch(/^2026-01-/);
      expect(entry.url).toMatch(/^https:\/\/web\.archive\.org\/web\//);
      expect(entry.sourceStatus).toContain("Removed by the SCP Wiki");
      const text = readFileSync(new URL(entry.text, root), "utf8");
      expect(text).not.toContain("This page has been blanked");
    }
    const factory = historical.find((entry) =>
      entry.id.startsWith("scp-001-o5-historical-"),
    )!;
    const scp963 = historical.find((entry) =>
      entry.id.startsWith("scp-963-historical-"),
    )!;
    expect(readFileSync(new URL(factory.text, root), "utf8")).toContain(
      "Factory",
    );
    expect(readFileSync(new URL(scp963.text, root), "utf8")).toContain(
      "Special Containment Procedures",
    );
  });
});
