import { execFileSync } from "node:child_process";

import { defineConfig } from "vite";

function resolveBuildVersion(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 12);

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "development";
  }
}

const buildVersion = resolveBuildVersion();

export default defineConfig({
  base: "/SimFoundation/",
  define: {
    "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(buildVersion),
  },
  plugins: [
    {
      name: "deployment-version",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: `${JSON.stringify({ version: buildVersion })}\n`,
        });
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssMinify: "esbuild",
  },
});
