import { expect, it } from "vitest";
import {
  createSimulation,
  advanceSimulation,
  type Simulation,
} from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { entities, materials } from "../../src/simulation/catalog";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

const pawn = (state: Simulation, name: string) =>
  state.sites["site-1"]!.entities[`site-1:${name}`] as Pawn;
const tool = (state: Simulation) =>
  state.sites["site-1"]!.entities["site-1:tool"] as Item;
function tick(state: Simulation) {
  return advanceSimulation(state, materials).state;
}

it("does not reuse a completed subdual's work after another carrier blocks the next capture phase", () => {
  let state = instantiateSite(
    createSimulation(),
    {
      name: "Capture phase ownership fixture",
      terrain: ["......", "......", "......", "......"],
      entities: [
        {
          id: "a-carrier",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 3, y: 1 } },
          overrides: { autonomy: false },
        },
        {
          id: "z-captor",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 2, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "subject",
          definitionId: "kinetic-specimen",
          location: { kind: "ground", position: { x: 3, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "band",
          definitionId: "transport-restraint",
          location: { kind: "carried", carrierId: "z-captor" },
        },
        {
          id: "tool",
          definitionId: "intervention-tool",
          location: { kind: "carried", carrierId: "z-captor" },
          overrides: {
            equipment: {
              slot: "tool",
              worn: true,
              subdual: { charges: 2, ticks: 2, duration: 80 },
            },
          },
        },
      ],
    },
    entities,
  ).state;
  state = executeCommand(
    state,
    {
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:z-captor",
      action: {
        kind: "capture",
        targetId: "site-1:subject",
        restraintId: "site-1:band",
        destination: { x: 1, y: 2 },
        workTicks: 0,
      },
    },
    materials,
  ).state;
  state = tick(tick(state));
  expect(tool(state).equipment!.subdual!.charges).toBe(1);
  expect(pawn(state, "z-captor").queue[0]!.action).toMatchObject({
    kind: "capture",
    phase: "subdue",
    workTicks: 0,
  });
  state = executeCommand(
    state,
    {
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:a-carrier",
      action: { kind: "take", targetId: "site-1:subject" },
    },
    materials,
  ).state;
  state = tick(state);
  state = executeCommand(
    state,
    {
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:a-carrier",
      action: { kind: "move", destination: { x: 2, y: 1 } },
    },
    materials,
  ).state;
  state = tick(state);
  expect(pawn(state, "z-captor").queue[0]!.blockedReason).toContain(
    "another carrier",
  );
  const expiry = pawn(state, "subject").health!.subdual!.untilTick;
  while (state.tick < expiry - 1) state = tick(state);
  const primitive = structuredClone(state);
  pawn(primitive, "z-captor").queue[0]!.action = {
    kind: "subdue",
    targetId: "site-1:subject",
    workTicks: 0,
  };
  const resumed = tick(state);
  const fresh = tick(primitive);
  expect(pawn(resumed, "subject").canAct).toBe(true);
  expect(pawn(fresh, "subject").canAct).toBe(true);
  expect(tool(resumed).equipment!.subdual!.charges).toBe(1);
  expect(tool(fresh).equipment!.subdual!.charges).toBe(1);
  expect(pawn(resumed, "z-captor").queue[0]!.action).toMatchObject({
    phase: "subdue",
    workTicks: 1,
  });
  expect(pawn(fresh, "z-captor").queue[0]!.action).toMatchObject({
    workTicks: 1,
  });
});
