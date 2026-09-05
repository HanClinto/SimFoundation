import { describe, expect, it } from "vitest";
import {
  projectPosition,
  unprojectPosition,
} from "../src/adapters/browser/renderer";

describe("isometric camera", () => {
  it("round-trips tile coordinates across zoom and viewport sizes", () => {
    for (const zoom of [0.3, 0.7, 1, 2.5]) {
      for (const width of [320, 960, 1400]) {
        const camera = { center: { x: 62.5, y: 40 }, zoom, selectedId: null };
        const position = { x: 75, y: 22 };
        const result = unprojectPosition(
          projectPosition(position, camera, width, 540),
          camera,
          width,
          540,
        );
        expect(result.x).toBeCloseTo(position.x);
        expect(result.y).toBeCloseTo(position.y);
      }
    }
  });
});
