import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

function sources(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "legacy") return [];
    const file = join(path, entry.name);
    return entry.isDirectory()
      ? sources(file)
      : file.endsWith(".ts")
        ? [file]
        : [];
  });
}

it("keeps the new browser and shared application independent of legacy state and CLI text", () => {
  for (const file of [
    ...sources("src/adapters/browser"),
    ...sources("src/application"),
  ]) {
    const source = readFileSync(file, "utf8");
    expect(source, file).not.toMatch(
      /(?:from|import)\s*["'][^"']*(?:simulation_legacy|browser_legacy|adapters\/cli|application\/legacy)/,
    );
  }
});
