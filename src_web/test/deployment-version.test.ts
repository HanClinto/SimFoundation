import { afterEach, describe, expect, it, vi } from "vitest";

import {
  refreshForNewDeployment,
  versionedPageUrl,
} from "../src/adapters/browser_shared/deployment-version";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("deployment version navigation", () => {
  it("adds a build version without removing existing query parameters or hashes", () => {
    expect(
      versionedPageUrl(
        "https://hanclinto.github.io/SimFoundation/?debug=1#personnel",
        "abc1234",
      ),
    ).toBe(
      "https://hanclinto.github.io/SimFoundation/?debug=1&v=abc1234#personnel",
    );
  });

  describe("production deployment refresh", () => {
    it("bypasses the manifest cache and navigates to a versioned page without losing query/hash", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("BASE_URL", "/SimFoundation/");
      vi.stubEnv("VITE_BUILD_VERSION", "old");
      const replace = vi.fn();
      vi.stubGlobal("location", {
        origin: "https://hanclinto.github.io",
        href: "https://hanclinto.github.io/SimFoundation/?debug=1#record",
        replace,
      });
      const fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ version: "new" }),
      });
      vi.stubGlobal("fetch", fetch);
      await refreshForNewDeployment();
      const manifest = new URL(fetch.mock.calls[0]![0]);
      expect(manifest.pathname).toBe("/SimFoundation/version.json");
      expect(manifest.searchParams.has("cache")).toBe(true);
      expect(fetch.mock.calls[0]![1]).toEqual({ cache: "no-store" });
      expect(replace).toHaveBeenCalledWith(
        "https://hanclinto.github.io/SimFoundation/?debug=1&v=new#record",
      );
    });

    it("does not loop when the requested deployed version is already in the page URL", async () => {
      vi.stubEnv("PROD", true);
      vi.stubEnv("BASE_URL", "/SimFoundation/");
      vi.stubEnv("VITE_BUILD_VERSION", "old");
      const replace = vi.fn();
      vi.stubGlobal("location", {
        origin: "https://hanclinto.github.io",
        href: "https://hanclinto.github.io/SimFoundation/?v=new",
        replace,
      });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ version: "new" }),
        }),
      );
      await refreshForNewDeployment();
      expect(replace).not.toHaveBeenCalled();
    });
  });

  it("replaces an outdated build version", () => {
    expect(
      versionedPageUrl(
        "https://hanclinto.github.io/SimFoundation/?v=old-build",
        "new-build",
      ),
    ).toBe("https://hanclinto.github.io/SimFoundation/?v=new-build");
  });
});
