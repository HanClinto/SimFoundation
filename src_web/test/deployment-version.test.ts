import { describe, expect, it } from "vitest";

import { versionedPageUrl } from "../src/adapters/browser/deployment-version";

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

  it("replaces an outdated build version", () => {
    expect(
      versionedPageUrl(
        "https://hanclinto.github.io/SimFoundation/?v=old-build",
        "new-build",
      ),
    ).toBe("https://hanclinto.github.io/SimFoundation/?v=new-build");
  });
});
