import { expect, it } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  sceneOrder,
  foregroundWallOpacity,
} from "../src/adapters/browser/scene-order";

it("keeps same-depth pawns above ground objects regardless of which is selected", () => {
  const initial = createInitialState();
  const object = initial.objects.items.find((item) => item.id === "spare-bed")!;
  const state = {
    ...initial,
    objects: {
      ...initial.objects,
      items: [
        {
          ...object,
          location: { kind: "ground" as const, position: { x: 60, y: 60 } },
        },
      ],
    },
  };
  const positions = {
    rear: { x: 59, y: 60 },
    worker: { x: 60, y: 60 },
    front: { x: 61, y: 60 },
  };
  expect(sceneOrder(state, positions, null).map(({ id }) => id)).toEqual([
    "rear",
    "object:spare-bed",
    "worker",
    "front",
  ]);
  expect(
    sceneOrder(state, positions, "object:spare-bed").map(({ id }) => id),
  ).toEqual(["rear", "object:spare-bed", "worker", "front"]);
  expect(sceneOrder(state, positions, "worker").map(({ id }) => id)).toEqual([
    "rear",
    "object:spare-bed",
    "worker",
    "front",
  ]);
  expect(
    sceneOrder(state, { ...positions, other: positions.worker }, "worker").map(
      ({ id }) => id,
    ),
  ).toEqual(["rear", "object:spare-bed", "other", "worker", "front"]);
  expect(
    sceneOrder(initial, {}, null).some(
      (entry) => entry.object?.kind === "cable" && entry.object.installed,
    ),
  ).toBe(false);
});

it("fades only nearby foreground walls around the displayed selection", () => {
  expect(foregroundWallOpacity({ x: 61, y: 60 }, { x: 60, y: 60 })).toBe(0.35);
  expect(foregroundWallOpacity({ x: 59, y: 60 }, { x: 60, y: 60 })).toBe(1);
  expect(foregroundWallOpacity({ x: 65, y: 60 }, { x: 60, y: 60 })).toBe(1);
  expect(foregroundWallOpacity({ x: 61, y: 60 }, undefined)).toBe(1);
});
