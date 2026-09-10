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

it("recovers a home-pad deadlock using a finite responder, actual landing space and physical casualty work", () => {
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
    if (line === "reserve home devon") {
      const home = c.session.state.sites["site-1"]!;
      expect(
        ["alex", "ben", "casey"].every((id) => !home.entities[`site-1:${id}`]),
      ).toBe(true);
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
    if (line.startsWith("reserve ") || line.startsWith("send "))
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
  const reserveId = c.session.campaign!.siteIds.reserve!;
  expect(
    c.session.state.sites[reserveId]!.entities[`${reserveId}:dispatches`]!
      .amount,
  ).toBe(1);
});

it("alternate floor admission does not bypass a sealed door or impassable primary terrain", () => {
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
    entityIds: ["site-1:actor"],
    loading: { x: 1, y: 1 },
    arrival: { x: 2, y: 1 },
    arrivalMode: "area" as const,
    arrivalRadius: 2,
    duration: 1,
  };
  const sent = depart(destination.state, request);
  expect(sent.reason).toBeNull();
  const blocked = advanceSimulation(sent.state, materials).state;
  expect(Object.values(blocked.transfers)[0]!.blockedReason).toContain("door");
  expect(blocked.sites["site-2"]!.entities["site-1:actor"]).toBeUndefined();
  expect(
    depart(destination.state, { ...request, arrivalRadius: 0 }).reason,
  ).toContain("positive bounded");
  destination.state.sites["site-2"]!.terrain = [".....", "..#..", "....."];
  expect(depart(destination.state, request).reason).toContain(
    "valid endpoints",
  );
});
