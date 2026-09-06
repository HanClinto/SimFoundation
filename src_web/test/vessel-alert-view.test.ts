import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { createInitialState } from "../src/simulation/state";
import { createVesselAlerts } from "../src/adapters/browser/vessel-alert-view";
import type { PhysicalObject } from "../src/simulation/objects";

afterEach(() => vi.unstubAllGlobals());
it("links recorded warnings to inspection while retaining buttons across tick updates", () => {
  const window = new JSDOM("<!doctype html><body></body>").window;
  vi.stubGlobal("document", window.document);
  const inspect = vi.fn();
  const view = createVesselAlerts(document.body, inspect);
  const initial = createInitialState();
  view.render(initial);
  expect(document.body.textContent).toContain("No recorded");
  const vessel: PhysicalObject = {
    id: "vessel-1",
    kind: "vessel",
    quantity: 1,
    condition: 12,
    installed: false,
    orientation: "north",
    reservedBy: null,
    location: { kind: "ground", position: { x: 54, y: 55 } },
    vessel: { material: "steel", sealed: true },
  };
  const state = {
    ...initial,
    tick: 10,
    observations: {
      ...initial.observations,
      objects: {
        ...initial.observations.objects,
        [vessel.id]: { object: vessel, observedTick: 5 },
      },
    },
  };
  view.render(state);
  expect(document.body.textContent).toContain("Last observed 5 minutes ago");
  const button = document.querySelector("button")!;
  view.render({ ...state, tick: 11 });
  expect(document.querySelector("button")).toBe(button);
  button.click();
  expect(inspect).toHaveBeenCalledWith("vessel-1");
  view.render(initial);
  expect(document.querySelector("button")).toBeNull();
});
