import { expect, it, vi } from "vitest";
import { createInitialState } from "../src/simulation/state";
import {
  setExposureSource,
  exposureTiles,
} from "../src/simulation/environment";
import {
  emissionMotes,
  drawEmissionEffects,
  MAX_EMISSION_MOTES,
} from "../src/adapters/browser/emission-effects";
import type { PhysicalObject } from "../src/simulation/objects";

const source = {
  name: "Effect",
  position: { x: 60, y: 54 },
  kind: "corrosion" as const,
  dose: 4,
  radius: 2,
  enabled: true,
};

it("samples only reachable source tiles without mutation or hidden recorded effects", () => {
  const state = setExposureSource(createInitialState(), source).state;
  const before = structuredClone(state);
  const motes = emissionMotes(state, "world");
  expect(motes.length).toBeGreaterThan(0);
  for (const mote of motes)
    expect(exposureTiles(state, state.environment.sources[0]!)).toContainEqual(
      mote.position,
    );
  expect(emissionMotes(state, "world")).toBe(motes);
  expect(emissionMotes(structuredClone(state), "world")).toEqual(motes);
  expect(emissionMotes(state, "recorded")).toEqual([]);
  expect(state).toEqual(before);
  const disabled = setExposureSource(
    state,
    { ...source, enabled: false },
    state.environment.sources[0]!.id,
  ).state;
  expect(emissionMotes(disabled, "world")).toEqual([]);
});

it("bounds particle counts even with many overlapping large sources", () => {
  let state = createInitialState();
  for (let index = 0; index < 32; index += 1)
    state = setExposureSource(state, { ...source, radius: 16 }).state;
  expect(emissionMotes(state, "world")).toHaveLength(MAX_EMISSION_MOTES);
});

it("shows no escaping effects from an intact sealed vessel, but reveals a breach", () => {
  const initial = createInitialState();
  const vessel: PhysicalObject = {
    id: "vessel-test",
    kind: "vessel",
    quantity: 1,
    condition: 100,
    installed: false,
    orientation: "north",
    reservedBy: null,
    location: { kind: "ground", position: { x: 60, y: 54 } },
    vessel: { material: "steel", sealed: true },
  };
  const state = {
    ...initial,
    objects: {
      ...initial.objects,
      items: [
        ...initial.objects.items.map((item) =>
          item.id === "spare-break-seat"
            ? {
                ...item,
                location: { kind: "contained" as const, vesselId: vessel.id },
              }
            : item,
        ),
        vessel,
      ],
    },
    environment: {
      ...initial.environment,
      sources: [{ ...source, id: "source", objectId: "spare-break-seat" }],
    },
  };
  expect(emissionMotes(state, "world")).toEqual([]);
  const breached = {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        item.id === vessel.id ? { ...item, condition: 0 } : item,
      ),
    },
  };
  expect(emissionMotes(breached, "world").length).toBeGreaterThan(0);
});

it("animates distinct effects, restores canvas state and skips offscreen or distant effects", () => {
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    globalAlpha: 1,
  };
  const motes = [
    {
      position: { x: 1, y: 1 },
      kind: "corrosion" as const,
      phase: 0.2,
      spread: 0.5,
    },
    {
      position: { x: 2, y: 1 },
      kind: "impact" as const,
      phase: 0.4,
      spread: 0.4,
    },
  ];
  const draw = (time: number, zoom = 1, project = () => ({ x: 40, y: 40 })) =>
    drawEmissionEffects(
      context as unknown as CanvasRenderingContext2D,
      motes,
      time,
      zoom,
      100,
      100,
      project,
    );
  draw(0);
  const first = structuredClone(context.fillRect.mock.calls);
  context.fillRect.mockClear();
  draw(400);
  expect(context.fillRect.mock.calls).not.toEqual(first);
  expect(context.save).toHaveBeenCalledTimes(2);
  expect(context.restore).toHaveBeenCalledTimes(2);
  context.fillRect.mockClear();
  draw(0, 0.2);
  draw(0, 1, () => ({ x: 1000, y: 1000 }));
  expect(context.fillRect).not.toHaveBeenCalled();
});
