import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import {
  pawnMapSprite,
  pawnPortrait,
  type PawnPose,
} from "../src/adapters/browser/pawn-art";
import { createInitialState } from "../src/simulation_legacy/state";

afterEach(() => vi.unstubAllGlobals());

it("provides distinct bounded poses and mirrored facing without changing identity", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("DOMParser", window.DOMParser);
  vi.stubGlobal("XMLSerializer", window.XMLSerializer);
  const poses: PawnPose[] = [
    "stand",
    "walk-left",
    "walk-right",
    "carry",
    "carry-left",
    "carry-right",
    "work",
    "sit",
    "sleep",
  ];
  const urls = poses.map((pose) => pawnMapSprite("person-priya-shah", pose));
  expect(new Set(urls).size).toBe(poses.length);
  for (const pose of poses) {
    const url = pawnMapSprite("person-priya-shah", pose, "left");
    expect(pawnMapSprite("person-priya-shah", pose, "left")).toBe(url);
    const sprite = new window.DOMParser().parseFromString(
      decodeURIComponent(url.split(",")[1]!),
      "image/svg+xml",
    );
    expect(sprite.querySelector("parsererror")).toBeNull();
    expect(sprite.documentElement.getAttribute("viewBox")).toBe("0 0 24 36");
    expect(sprite.getElementById("uniform")!.getAttribute("fill")).toBe(
      "#a6c7bd",
    );
    expect(
      sprite.documentElement.firstElementChild!.getAttribute("transform"),
    ).toBe("translate(24 0) scale(-1 1)");
  }
});

it("matches each map sprite to its portrait palette and caches well-formed original SVG variants", () => {
  const window = new JSDOM().window;
  vi.stubGlobal("DOMParser", window.DOMParser);
  vi.stubGlobal("XMLSerializer", window.XMLSerializer);
  const parse = (url: string) =>
    new window.DOMParser().parseFromString(
      decodeURIComponent(url.slice(url.indexOf(",") + 1)),
      "image/svg+xml",
    );
  const state = createInitialState();
  const urls = state.personnel.map((person) => pawnMapSprite(person.id));
  expect(new Set(urls).size).toBe(state.personnel.length);
  for (const person of state.personnel) {
    const spriteUrl = pawnMapSprite(person.id);
    expect(pawnMapSprite(person.id)).toBe(spriteUrl);
    const sprite = parse(spriteUrl);
    const portrait = parse(pawnPortrait(person.id));
    expect(sprite.querySelector("parsererror")).toBeNull();
    expect(sprite.documentElement.getAttribute("viewBox")).toBe("0 0 24 36");
    expect(sprite.getElementById("head")!.getAttribute("fill")).toBe(
      portrait
        .getElementById("head")!
        .querySelector("path")!
        .getAttribute("fill"),
    );
    expect(sprite.getElementById("hair")!.getAttribute("fill")).toBe(
      portrait
        .getElementById("head")!
        .querySelectorAll("path")[2]!
        .getAttribute("fill"),
    );
    expect(sprite.getElementById("uniform")!.getAttribute("fill")).toBe(
      portrait
        .getElementById("uniform")!
        .querySelectorAll("path")[1]!
        .getAttribute("fill"),
    );
    expect(
      sprite.querySelectorAll("image, script, foreignObject"),
    ).toHaveLength(0);
  }
  expect(pawnMapSprite("unknown-person")).toBe(
    pawnMapSprite("person-mara-voss"),
  );
});
