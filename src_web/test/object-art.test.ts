import { expect, it, vi } from "vitest";
import { createInitialState } from "../src/simulation_legacy/state";
import {
  drawObjectGlyph,
  vesselAppearance,
} from "../src/adapters/browser/object-art";
import type { PhysicalObject } from "../src/simulation_legacy/objects";

const vessel: PhysicalObject = {
  id: "case",
  kind: "vessel",
  quantity: 1,
  condition: 100,
  orientation: "north",
  installed: false,
  reservedBy: null,
  location: { kind: "ground", position: { x: 60, y: 54 } },
  vessel: { material: "steel", sealed: true },
};

it("distinguishes open, sealed, worn, critical and breached cases from physical state", () => {
  expect(vesselAppearance(vessel)).toBe("sealed");
  expect(vesselAppearance({ ...vessel, condition: 60 })).toBe("worn");
  expect(vesselAppearance({ ...vessel, condition: 25 })).toBe("critical");
  expect(vesselAppearance({ ...vessel, condition: 0 })).toBe("breached");
  expect(
    vesselAppearance({
      ...vessel,
      vessel: { material: "steel", sealed: false },
    }),
  ).toBe("open");
});

it("draws distinct cargo silhouettes independent of ground or carrier location", () => {
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
  };
  const items = [
    ...createInitialState().objects.items.filter((item) => !item.installed),
    vessel,
  ];
  const silhouettes = new Map<string, string>();
  for (const item of items) {
    context.fillRect.mockClear();
    drawObjectGlyph(context as unknown as CanvasRenderingContext2D, item);
    const signature = JSON.stringify(context.fillRect.mock.calls);
    silhouettes.set(item.kind, signature);
    context.fillRect.mockClear();
    drawObjectGlyph(context as unknown as CanvasRenderingContext2D, {
      ...item,
      location: { kind: "carried", personId: "worker" },
    });
    expect(JSON.stringify(context.fillRect.mock.calls)).toBe(signature);
  }
  expect(new Set(silhouettes.values()).size).toBe(9);
  expect(context.save.mock.calls.length).toBe(
    context.restore.mock.calls.length,
  );
});
