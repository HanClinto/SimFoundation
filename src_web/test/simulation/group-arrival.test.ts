import { expect, it } from "vitest";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import { depart } from "../../src/simulation/core/site/Transfer";
import { entities, materials } from "../../src/simulation/catalog";
import { serialize, deserialize } from "../../src/simulation/core/Snapshot";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function setup() {
  const origin = instantiateSite(
    createSimulation(),
    {
      name: "Group staging",
      terrain: [".....", ".....", "....."],
      entities: [
        {
          id: "a",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 1, y: 1 } },
          overrides: { autonomy: false },
        },
        {
          id: "b",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 2, y: 1 } },
          overrides: { autonomy: false },
        },
        {
          id: "c",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 1, y: 2 } },
          overrides: { autonomy: false },
        },
        {
          id: "kit",
          definitionId: "survey-kit",
          location: { kind: "carried", carrierId: "a" },
        },
      ],
    },
    entities,
  );
  const destination = instantiateSite(
    origin.state,
    {
      name: "Landing area",
      terrain: [".....", ".....", "....."],
      entities: [],
    },
    entities,
  );
  const request = {
    originId: origin.siteId,
    destinationId: destination.siteId,
    loading: { x: 1, y: 1 },
    loadingRadius: 1,
    arrival: { x: 2, y: 1 },
    arrivalRadius: 1,
    entityIds: ["site-1:a", "site-1:b", "site-1:c"],
    duration: 2,
  };
  return { state: destination.state, request };
}
it("admits the entire group to distinct free tiles and retains children with once-only physiology", () => {
  const { state, request } = setup();
  let next = depart(state, request).state;
  let replay = deserialize(serialize(next))!;
  for (let i = 0; i < 2; i++) {
    next = advanceSimulation(next, materials).state;
    replay = advanceSimulation(replay, materials).state;
    expect(replay).toEqual(next);
  }
  const landed = next.sites["site-2"]!;
  const positions = request.entityIds.map(
    (id) => landed.entities[id]!.location,
  );
  expect(
    new Set(positions.map((position) => JSON.stringify(position))).size,
  ).toBe(3);
  for (const id of request.entityIds)
    expect((landed.entities[id] as Pawn).needs.hunger!.value).toBeCloseTo(20.2);
  expect(landed.entities["site-1:kit"]!.location).toEqual({
    kind: "carried",
    carrierId: "site-1:a",
  });
  expect(next.transfers).toEqual({});
});
it("retains the complete manifest until enough landing space exists, rather than partial admission", () => {
  const { state, request } = setup();
  state.sites["site-2"]!.terrain = ["#####", "#..##", "#####"];
  let next = depart(state, request).state;
  next = advanceSimulation(next, materials).state;
  next = advanceSimulation(next, materials).state;
  expect(Object.keys(next.transfers)).toHaveLength(1);
  expect(Object.keys(next.sites["site-2"]!.entities)).toHaveLength(0);
  expect(Object.values(next.transfers)[0]!.blockedReason).toContain(
    "complete travelling group",
  );
  next.sites["site-2"]!.terrain = [".....", ".....", "....."];
  next = advanceSimulation(next, materials).state;
  expect(next.transfers).toEqual({});
  expect(Object.keys(next.sites["site-2"]!.entities)).toHaveLength(4);
});
it("keeps the default point-arrival contract and rejects invalid explicit areas", () => {
  const { state, request } = setup();
  expect(depart(state, { ...request, arrivalRadius: -1 }).reason).toContain(
    "Arrival radius",
  );
  expect(depart(state, { ...request, arrivalRadius: 4 }).reason).toContain(
    "Arrival radius",
  );
  const { arrivalRadius: _radius, ...pointRequest } = request;
  let next = depart(state, pointRequest).state;
  next = advanceSimulation(next, materials).state;
  next = advanceSimulation(next, materials).state;
  for (const id of request.entityIds)
    expect(next.sites["site-2"]!.entities[id]!.location).toEqual({
      kind: "ground",
      position: request.arrival,
    });
});

it("publishes simultaneous transit health events in identity order regardless of dictionary insertion", () => {
  const { state, request } = setup();
  const sent = depart(state, request).state;
  const transfer = Object.values(sent.transfers)[0]!;
  for (const entity of Object.values(transfer.entities)) {
    if (entity.kind === "pawn")
      entity.health = {
        wounds: [{ id: "critical", severity: 150, bleeding: 0 }],
        bloodLoss: 0,
        mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
      };
  }
  const reversed = structuredClone(sent);
  const reversedTransfer = Object.values(reversed.transfers)[0]!;
  reversedTransfer.entities = Object.fromEntries(
    Object.entries(reversedTransfer.entities).reverse(),
  );
  const normal = advanceSimulation(sent, materials);
  expect(advanceSimulation(reversed, materials)).toEqual(normal);
  expect(
    normal.events
      .filter((event) => event.kind === "died")
      .map((event) => event.entityId),
  ).toEqual(["site-1:a", "site-1:b", "site-1:c"]);
  expect(Object.keys(normal.state.transfers)).toHaveLength(1);
});
