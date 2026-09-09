import fs from "node:fs";
import { expect, it } from "vitest";
import {
  instantiateSite,
  disposeSite,
  type SiteTemplate,
} from "../../src/simulation/campaign/sites";
import { depart } from "../../src/simulation/campaign/transfers";
import { executeCommand } from "../../src/simulation/actions/commands";
import { createSimulation, type Pawn } from "../../src/simulation/model";
import { advanceSimulation } from "../../src/simulation/tick";
import { deserialize, serialize } from "../../src/simulation/snapshot";
import { positionOf } from "../../src/simulation/world/spatial";

const template: SiteTemplate = JSON.parse(
  fs.readFileSync(
    new URL(
      "../../src/simulation/content/acceptance-site.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

it("instantiates a shared JSON site definition twice without sharing mutable records or identities", () => {
  const first = instantiateSite(createSimulation(), template);
  const second = instantiateSite(first.state, template);
  const before = serialize(second.state);
  expect(Object.keys(second.state.sites[first.siteId]!.entities)).toEqual(
    template.entities.map((entity) => `${first.siteId}:${entity.id}`),
  );
  expect(Object.keys(second.state.sites[second.siteId]!.entities)).toEqual(
    template.entities.map((entity) => `${second.siteId}:${entity.id}`),
  );
  expect(
    second.state.sites[first.siteId]!.entities[`${first.siteId}:operator`],
  ).not.toBe(
    second.state.sites[second.siteId]!.entities[`${second.siteId}:operator`],
  );
  const result = advanceSimulation(second.state);
  expect(serialize(second.state)).toBe(before);
  expect(result.state.tick).toBe(1);
  expect(
    result.state.sites[first.siteId]!.entities[`${first.siteId}:operator`],
  ).toMatchObject({ needs: { hunger: { value: 20.1 } } });
  expect(
    positionOf(result.state.sites[second.siteId]!, `${second.siteId}:visitor`),
  ).not.toEqual({ x: 1, y: 3 });
  const reordered = {
    ...second.state,
    sites: Object.fromEntries(
      Object.entries(second.state.sites)
        .reverse()
        .map(([id, site]) => [
          id,
          {
            ...site,
            entities: Object.fromEntries(
              Object.entries(site.entities).reverse(),
            ),
          },
        ]),
    ),
  };
  expect(advanceSimulation(reordered)).toEqual(result);
});

it("remaps queued targets and carried references without altering saved snapshot identity", () => {
  const operator = template.entities[0] as Pawn;
  const carried = {
    ...template.entities[3]!,
    location: { kind: "carried" as const, carrierId: operator.id },
  };
  const authored: SiteTemplate = {
    ...template,
    entities: [
      {
        ...operator,
        queue: [
          {
            id: "initial",
            source: "script",
            elapsed: 0,
            blockedReason: null,
            action: { kind: "eat", targetId: carried.id },
          },
        ],
      },
      carried,
    ],
  };
  const created = instantiateSite(createSimulation(), authored);
  const site = created.state.sites[created.siteId]!;
  expect(site.entities[`${created.siteId}:meal`]!.location).toEqual({
    kind: "carried",
    carrierId: `${created.siteId}:operator`,
  });
  expect(
    (site.entities[`${created.siteId}:operator`] as Pawn).queue[0]!.action,
  ).toEqual({ kind: "eat", targetId: `${created.siteId}:meal` });
  expect(deserialize(serialize(created.state))).toEqual(created.state);
  expect(
    advanceSimulation(created.state).state.sites[created.siteId]!.entities[
      `${created.siteId}:meal`
    ],
  ).toBeUndefined();
});

it("transfers one pawn and its carried pawn through a snapshot without double ticking or duplication", () => {
  const operator = template.entities[0] as Pawn;
  const patient: Pawn = {
    ...operator,
    id: "patient",
    name: "Patient",
    canAct: false,
    location: { kind: "carried", carrierId: operator.id },
  };
  const first = instantiateSite(createSimulation(), {
    ...template,
    entities: [operator, patient],
  });
  const second = instantiateSite(first.state, { ...template, entities: [] });
  const actorId = `${first.siteId}:operator`;
  const patientId = `${first.siteId}:patient`;
  const request = {
    originId: first.siteId,
    destinationId: second.siteId,
    entityIds: [actorId],
    loading: { x: 1, y: 1 },
    arrival: { x: 5, y: 1 },
    duration: 3,
  };
  const sent = depart(second.state, request);
  expect(sent.reason).toBeNull();
  expect(Object.keys(sent.state.sites[first.siteId]!.entities)).toEqual([]);
  expect(
    Object.keys(sent.state.transfers[sent.transferId!]!.entities).sort(),
  ).toEqual([actorId, patientId]);
  expect(disposeSite(sent.state, first.siteId).reason).toContain("endpoint");
  expect(depart(sent.state, request).state).toBe(sent.state);
  let state = sent.state;
  let replay = deserialize(serialize(state))!;
  for (let step = 0; step < 3; step++) {
    state = advanceSimulation(state).state;
    replay = advanceSimulation(replay).state;
    expect(state).toEqual(replay);
  }
  expect(state.transfers).toEqual({});
  const destination = state.sites[second.siteId]!;
  expect(positionOf(destination, actorId)).toEqual(request.arrival);
  expect(positionOf(destination, patientId)).toEqual(request.arrival);
  expect(
    (destination.entities[patientId] as Pawn).needs.hunger!.value,
  ).toBeCloseTo(20.3);
  expect(
    (destination.entities[actorId] as Pawn).needs.hunger!.value,
  ).toBeCloseTo(20.3);
  expect(disposeSite(state, first.siteId).reason).toBeNull();
  const moved = executeCommand(state, {
    kind: "enqueue",
    siteId: second.siteId,
    entityId: actorId,
    action: { kind: "move", destination: { x: 6, y: 1 } },
  });
  expect(moved.code).toBe("accepted");
  expect(
    positionOf(
      advanceSimulation(moved.state).state.sites[second.siteId]!,
      patientId,
    ),
  ).toEqual({ x: 6, y: 1 });
});

it("retains transit ownership when arrival is blocked and accepts arrival after the tile clears", () => {
  const operator = template.entities[0] as Pawn;
  const first = instantiateSite(createSimulation(), {
    ...template,
    entities: [operator],
  });
  const second = instantiateSite(first.state, {
    ...template,
    entities: [
      {
        ...operator,
        id: "blocker",
        location: { kind: "ground", position: { x: 5, y: 1 } },
      },
    ],
  });
  const actorId = `${first.siteId}:operator`;
  const sent = depart(second.state, {
    originId: first.siteId,
    destinationId: second.siteId,
    entityIds: [actorId],
    loading: { x: 1, y: 1 },
    arrival: { x: 5, y: 1 },
    duration: 1,
  });
  expect(sent.reason).toBeNull();
  const blocked = advanceSimulation(sent.state).state;
  expect(blocked.transfers[sent.transferId!]!.blockedReason).toContain(
    "occupied",
  );
  expect(blocked.sites[second.siteId]!.entities[actorId]).toBeUndefined();
  const moved = executeCommand(blocked, {
    kind: "enqueue",
    siteId: second.siteId,
    entityId: `${second.siteId}:blocker`,
    action: { kind: "move", destination: { x: 6, y: 1 } },
  }).state;
  const arrived = advanceSimulation(moved).state;
  expect(arrived.transfers).toEqual({});
  expect(positionOf(arrived.sites[second.siteId]!, actorId)).toEqual({
    x: 5,
    y: 1,
  });
  expect(
    (arrived.sites[second.siteId]!.entities[actorId] as Pawn).needs.hunger!
      .value,
  ).toBeCloseTo(20.2);
});

it("keeps the replacement independent from legacy, application and browser code", () => {
  const root = new URL("../../src/simulation/", import.meta.url);
  function check(directory: URL) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(
        entry.name + (entry.isDirectory() ? "/" : ""),
        directory,
      );
      if (entry.isDirectory()) check(url);
      else if (entry.name.endsWith(".ts")) {
        const source = fs.readFileSync(url, "utf8");
        expect(source).not.toMatch(
          /from\s+["'][^"']*(simulation_legacy|adapters|application)/,
        );
        expect(source).not.toMatch(
          /\b(document|window|localStorage|requestAnimationFrame)\b/,
        );
      }
    }
  }
  check(root);
});
