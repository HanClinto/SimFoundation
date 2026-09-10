import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../../src/application/ScenarioSession";

const walkthrough = fs
  .readFileSync(
    new URL(
      "../../../src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);

it("plays prior-research authorization, actual three-person coverage, maintenance, overlapping relief and safe locked withdrawal", () => {
  let c = openConsole();
  expect(() => executeLine(c, "prepare statue alex")).toThrow(
    "Home study required",
  );
  let replayed = false;
  for (const line of walkthrough) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    expect(result.output, line).not.toMatch(
      /Advanced.*(?:blocked|failed|interrupted|1000-tick limit)/i,
    );
    c = result.console;
    if (line === "order riley study station direct-watch-protocol") {
      const details = JSON.parse(executeLine(c, "inspect subject").output);
      expect(details.directWatchers).toHaveLength(2);
      expect(details).not.toHaveProperty("concern");
      expect(details).not.toHaveProperty("needCandidate");
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 12)).toEqual(stepSession(c.session, 12));
      c = { ...c, session: restored };
      replayed = true;
    }
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(replayed).toBe(true);
  const { state, campaign } = c.session;
  const annexId = campaign!.siteIds.statue!;
  const annex = state.sites[annexId]!;
  const reserveId = campaign!.siteIds.reserve!;
  expect(annex.entities[`${annexId}:subject`]).toMatchObject({
    definitionId: "scp-173",
    location: { kind: "ground", position: { x: 8, y: 3 } },
  });
  expect(annex.entities[`${annexId}:gate`]).toMatchObject({
    open: false,
    policy: "held-closed",
  });
  expect(annex.entities[`${annexId}:cleaning`]!.amount).toBe(2);
  expect(annex.entities[`${annexId}:station`]).toMatchObject({
    study: {
      findings: [
        {
          planId: "direct-watch-protocol",
          actorId: `${reserveId}:riley`,
          sourceIds: [`${annexId}:subject`],
        },
      ],
    },
    service: {
      history: [{ kind: "service", amount: 1, actorId: `${reserveId}:riley` }],
    },
  });
  for (const id of ["site-1:alex", "site-1:casey", `${reserveId}:riley`]) {
    const actor = state.sites[campaign!.homeId]!.entities[id];
    if (actor?.kind !== "pawn") throw new Error("Missing returned worker.");
    expect(actor.health!.death).toBeUndefined();
  }
  expect(state.transfers).toEqual({});
  expect(Object.keys(state.sites[reserveId]!.entities)).toEqual([
    `${reserveId}:devon`,
  ]);
});

it("loses actual workers when both direct observers abandon an open enclosure", () => {
  let c = openConsole();
  const prefix = walkthrough.slice(
    0,
    walkthrough.indexOf("order riley watch subject 120"),
  );
  for (const line of [...prefix, "cancel alex", "cancel casey", "step 80"]) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  const { state, campaign } = c.session;
  const annex = state.sites[campaign!.siteIds.statue!]!;
  const bodies = Object.values(annex.entities).filter(
    (entity) => entity.kind === "pawn" && entity.health?.death,
  );
  expect(bodies.length).toBeGreaterThan(0);
  expect(annex.entities[`${annex.id}:gate`]).toMatchObject({ open: true });
  expect(annex.entities[`${annex.id}:subject`]).toMatchObject({
    definitionId: "scp-173",
  });
  expect(annex.entities[`${annex.id}:cleaning`]!.amount).toBe(2);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 5)).toEqual(stepSession(c.session, 5));
});
