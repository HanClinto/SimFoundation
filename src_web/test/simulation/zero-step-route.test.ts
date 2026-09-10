import { expect, it } from "vitest";
import {
  route,
  interactionRoute,
} from "../../src/simulation/core/site/Pathfinding";
import { createSimulation } from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import { entities } from "../../src/simulation/catalog";

function site() {
  const created = instantiateSite(
    createSimulation(),
    {
      name: "Route boundary",
      terrain: ["#####", "#...#", "#...#", "#####"],
      entities: [
        {
          id: "actor",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 1, y: 1 } },
        },
        {
          id: "target",
          definitionId: "packaged-meal",
          location: { kind: "ground", position: { x: 2, y: 1 } },
        },
      ],
    },
    entities,
  );
  return created.state.sites[created.siteId]!;
}
it("returns a true zero-step interaction without changing the site or ordinary approach tie", () => {
  const world = site();
  const before = JSON.stringify(world);
  expect(route(world, { x: 1, y: 1 }, { x: 1, y: 1 }, "site-1:actor")).toEqual(
    [],
  );
  expect(interactionRoute(world, "site-1:actor", "site-1:target")).toEqual([]);
  expect(JSON.stringify(world)).toBe(before);
});
it("still rejects occupied or invalid same-position destinations before the fast path", () => {
  const world = site();
  world.entities["blocker"] = {
    ...structuredClone(world.entities["site-1:actor"]!),
    id: "blocker",
  };
  expect(
    route(world, { x: 1, y: 1 }, { x: 1, y: 1 }, "site-1:actor"),
  ).toBeNull();
  expect(
    route(world, { x: 0, y: 0 }, { x: 0, y: 0 }, "site-1:actor"),
  ).toBeNull();
  expect(
    route(world, { x: 9, y: 9 }, { x: 9, y: 9 }, "site-1:actor"),
  ).toBeNull();
});
