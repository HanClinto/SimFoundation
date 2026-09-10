import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import {
  createSimulation,
  advanceSimulation,
} from "../../src/simulation/core/Simulation";
import { instantiateSite } from "../../src/simulation/core/site/Site";
import { depart } from "../../src/simulation/core/site/Transfer";
import { entities, materials } from "../../src/simulation/catalog";

it("recovers a home-pad deadlock with a retained colleague and physical casualty work", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/blocked-home-recovery.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  let confirmedBlocked = false;
  for (const line of lines) {
    if (line === "order ben deliver mira 3 1") {
      const home = c.session.state.sites["site-1"]!;
      expect(
        ["alex", "casey"].every((id) => !home.entities[`site-1:${id}`]),
      ).toBe(true);
      expect((home.entities["site-1:ben"] as Pawn).canAct).toBe(true);
      expect(home.entities["site-5:mira"]!.location).toEqual({
        kind: "ground",
        position: { x: 2, y: 7 },
      });
      expect(
        Object.values(c.session.state.transfers).filter(
          (transfer) => transfer.destinationId === "site-1",
        ),
      ).toHaveLength(2);
      expect(
        Object.values(c.session.state.transfers).every(
          (transfer) => transfer.blockedReason,
        ),
      ).toBe(true);
      confirmedBlocked = true;
    }
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(
      /^rejected|Advanced.*(?:Blocked|blocked|failed|1000-tick limit)/,
    );
    c = result.console;
    if (line.startsWith("send "))
      c = { ...c, session: restoreSession(JSON.stringify(c.session))! };
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(confirmedBlocked).toBe(true);
  const home = c.session.state.sites["site-1"]!;
  for (const name of ["alex", "ben", "casey"])
    expect(home.entities[`site-1:${name}`]).toBeDefined();
  expect((home.entities["site-5:mira"] as Pawn).canAct).toBe(true);
  expect(c.session.state.transfers).toEqual({});
  expect(c.session.campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
});

it("ordinary arrival preserves primary-door, terrain and whole-group landing rules", () => {
  const origin = instantiateSite(
    createSimulation(),
    {
      name: "Origin",
      terrain: [".....", ".....", "....."],
      entities: [
        {
          id: "actor",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 1, y: 1 } },
          overrides: { autonomy: false },
        },
        {
          id: "colleague",
          definitionId: "field-agent",
          location: { kind: "ground", position: { x: 1, y: 2 } },
          overrides: { autonomy: false },
        },
      ],
    },
    entities,
  );
  const destination = instantiateSite(
    origin.state,
    {
      name: "Sealed entry",
      terrain: [".....", ".....", "....."],
      entities: [
        {
          id: "door",
          definitionId: "automatic-steel-door",
          location: { kind: "ground", position: { x: 2, y: 1 } },
          overrides: { open: false, policy: "held-closed" },
        },
      ],
    },
    entities,
  );
  const request = {
    originId: "site-1",
    destinationId: "site-2",
    entityIds: ["site-1:actor", "site-1:colleague"],
    loading: { x: 1, y: 1 },
    loadingRadius: 1,
    arrival: { x: 2, y: 1 },
    arrivalRadius: 2,
    duration: 1,
  };
  const sent = depart(destination.state, request);
  expect(sent.reason).toBeNull();
  const blocked = advanceSimulation(sent.state, materials).state;
  expect(Object.values(blocked.transfers)[0]!.blockedReason).toContain("door");
  expect(blocked.sites["site-2"]!.entities["site-1:actor"]).toBeUndefined();
  expect(blocked.sites["site-2"]!.entities["site-1:colleague"]).toBeUndefined();
  expect(
    depart(destination.state, { ...request, arrivalRadius: -1 }).reason,
  ).toContain("zero to three");
  destination.state.sites["site-2"]!.terrain = [".....", "..#..", "....."];
  expect(depart(destination.state, request).reason).toContain(
    "valid endpoints",
  );

  const landingSite = blocked.sites["site-2"]!;
  const door = landingSite.entities["site-2:door"]!;
  if (door.kind !== "door") throw new Error("Expected an arrival door.");
  door.open = true;
  door.policy = "held-open";
  Object.values(blocked.transfers)[0]!.arrivalRadius = 0;
  const crowded = advanceSimulation(blocked, materials).state;
  expect(Object.values(crowded.transfers)[0]!.blockedReason).toContain(
    "complete travelling group",
  );
  expect(crowded.sites["site-2"]!.entities["site-1:actor"]).toBeUndefined();
  expect(crowded.sites["site-2"]!.entities["site-1:colleague"]).toBeUndefined();
  Object.values(crowded.transfers)[0]!.arrivalRadius = 1;
  const admitted = advanceSimulation(crowded, materials).state;
  expect(admitted.transfers).toEqual({});
  const landed = request.entityIds.map(
    (id) => admitted.sites["site-2"]!.entities[id]!.location,
  );
  expect(landed.every((location) => location.kind === "ground")).toBe(true);
  expect(landed[0]).not.toEqual(landed[1]);
});
