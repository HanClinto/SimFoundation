import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";

it("recovers a dead observer's actual record, engineers better short-burst protection, and recaptures without erasing losses", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/incident-research.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  let replayed = false;
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    expect(result.output, line).not.toMatch(
      /Advanced.*(?:blocked|failed|interrupted|1000-tick limit)/i,
    );
    c = result.console;
    if (!replayed && line === "send home casey") {
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 8)).toEqual(stepSession(c.session, 8));
      c = { ...c, session: restored };
      replayed = true;
    }
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  expect(replayed).toBe(true);
  const { state, campaign } = c.session;
  const home = state.sites[campaign!.homeId]!;
  const yard = state.sites[campaign!.siteIds.intervention!]!;
  const observer = yard.entities["site-1:alex"];
  if (observer?.kind !== "pawn")
    throw new Error("Expected retained observer body.");
  expect(observer.health!.death).toBeDefined();
  expect(observer.queue).toEqual([]);
  expect(yard.entities["site-1:vest"]).toMatchObject({
    integrity: 0,
    location: { kind: "carried", carrierId: observer.id },
  });
  const kit = home.entities["site-1:kit"];
  if (kit?.kind !== "item" || !kit.impactRecorder)
    throw new Error("Expected recovered recorder.");
  expect(kit.impactRecorder.records).toHaveLength(1);
  const record = kit.impactRecorder.records[0]!;
  expect(record).toMatchObject({
    observerId: observer.id,
    attackerId: "site-13:specimen",
    targetId: observer.id,
    severity: 30,
    damage: 20,
    armorId: "site-1:vest",
  });
  expect(record.tick).toBeLessThan(observer.health!.death!.tick);
  const workshop = home.entities["site-1:workshop"];
  if (workshop?.kind !== "facility") throw new Error("Expected workshop.");
  const finding = workshop.study!.findings[0]!;
  expect(finding).toMatchObject({
    planId: "kinetic-impact",
    actorId: "site-1:ben",
    sourceIds: [kit.id],
    observationIds: [record.id],
  });
  expect(finding.tick).toBeGreaterThan(observer.health!.death!.tick);
  expect(home.entities["site-1:workshop:crafted-1"]).toMatchObject({
    definitionId: "impact-protective-vest",
    integrity: 60,
    location: { kind: "carried", carrierId: "site-1:casey" },
    equipment: { worn: true, armor: { reduction: 20, wear: 40 } },
    crafted: {
      recipeId: "impact-vest",
      actorId: "site-1:casey",
      inputs: [{ amount: 2 }],
      research: { stationId: workshop.id, finding },
    },
  });
  expect(home.entities["site-1:parts"]!.amount).toBe(1);
  expect(home.entities["site-1:suppressor"]).toMatchObject({
    equipment: { subdual: { charges: 0 } },
  });
  expect(home.entities["site-13:specimen"]).toMatchObject({
    playerControllable: false,
    acceptsEscort: false,
    location: { kind: "carried", carrierId: "site-1:holding" },
  });
  expect(yard.entities["site-13:specimen"]).toBeUndefined();
  const reserveId = campaign!.siteIds.reserve!;
  expect(home.entities["site-1:casey"]).toMatchObject({
    health: {
      wounds: [
        {
          severity: 10,
          bleeding: 0,
          stabilization: { actorId: `${reserveId}:devon` },
        },
      ],
    },
  });
  expect(Object.keys(state.sites[reserveId]!.entities)).toEqual([
    `${reserveId}:riley`,
  ]);
  const recorderOwner = state.sites[campaign!.siteIds.accident!]!;
  expect(recorderOwner.entities[`${recorderOwner.id}:recorder`]).toMatchObject({
    impactRecorder: { records: [] },
  });
  expect(state.transfers).toEqual({});
});
