import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../src/application/ScenarioSession";
import { directWatchers } from "../../src/simulation/core/entity/pawn/Attention";
import { secureContainment } from "../../src/simulation/core/entity/Containment";

const read = (file: string) =>
  fs
    .readFileSync(
      new URL(
        `../../src/simulation/catalog/quests/scp173/tests/${file}`,
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
const entry = read("watch-maintenance.txt");
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    c = result.console;
  }
  return c;
}
function prepared() {
  return play(openConsole(), entry.slice(0, entry.indexOf("status") + 1));
}
function alex(c: ConsoleState) {
  const entity = c.session.state.sites[c.siteId]!.entities["site-1:alex"];
  if (entity?.kind !== "pawn") throw new Error("Expected local Alex.");
  return entity;
}

it("moves a real guest bed to the annex, rests an assigned observer and returns to the same post while another human holds coverage", () => {
  let c = prepared();
  let wasWatching = false;
  let rested = false;
  let returned = false;
  let warning = false;
  let replayed = false;
  for (const line of read("watch-duty.txt")) {
    if (line === "step 25") {
      const restored = restoreSession(JSON.stringify(c.session))!;
      expect(stepSession(restored, 25)).toEqual(stepSession(c.session, 25));
      c = { ...c, session: restored };
      replayed = true;
    }
    const oldTick = c.session.state.tick;
    const result = executeLine(c, line);
    expect(result.rejected, line).not.toBe(true);
    expect(result.output, line).not.toMatch(
      /Advanced.*(?:blocked|failed|interrupted|1000-tick limit)/i,
    );
    c = result.console;
    const annexId = c.session.campaign!.siteIds.statue!;
    const annex = c.session.state.sites[annexId]!;
    const observer = annex.entities["site-1:alex"];
    if (observer?.kind === "pawn" && observer.watchDuty) {
      if (observer.queue[0]?.action.kind === "watch") {
        wasWatching = true;
        if (observer.needs.fatigue!.value < 20 && warning) returned = true;
      }
      for (const event of c.session.events.filter(
        (event) => (event.tick ?? 0) > oldTick,
      )) {
        if (
          event.entityId === observer.id &&
          event.kind === "warning" &&
          event.reason?.includes("restorative")
        )
          warning = true;
        if (
          event.entityId === observer.id &&
          event.actionKind === "sleep" &&
          event.kind === "completed"
        )
          rested = true;
      }
      expect(
        directWatchers(annex, `${annexId}:subject`).length,
      ).toBeGreaterThanOrEqual(1);
    }
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect({ wasWatching, rested, returned, warning, replayed }).toEqual({
    wasWatching: true,
    rested: true,
    returned: true,
    warning: true,
    replayed: true,
  });
  const { state, campaign } = c.session;
  const home = state.sites[campaign!.homeId]!;
  const annexId = campaign!.siteIds.statue!;
  expect(home.entities["site-1:guest-bed"]).toBeUndefined();
  expect(state.sites[annexId]!.entities["site-1:guest-bed"]).toMatchObject({
    definitionId: "bed",
    location: { kind: "ground", position: { x: 7, y: 1 } },
  });
  expect(home.entities["site-1:bed"]).toBeDefined();
  expect(state.sites[annexId]!.entities[`${annexId}:gate`]).toMatchObject({
    open: false,
  });
  expect(home.entities["site-1:alex"]).not.toHaveProperty("watchDuty");
  expect(campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
  for (const id of campaign!.staffIds) {
    const worker = home.entities[id];
    if (worker?.kind !== "pawn") throw new Error("Missing returned worker.");
    expect(worker.health!.death).toBeUndefined();
  }
  const holding = home.entities["site-1:holding"];
  if (holding?.kind !== "facility") throw new Error("Missing home holding.");
  expect(secureContainment(holding, state.tick)).toBe(true);
  expect(holding.containment!.lockdown!.untilTick).toBeGreaterThan(state.tick);
  expect(home.entities["site-13:specimen"]).toMatchObject({
    location: { kind: "carried", carrierId: holding.id },
  });
  expect(state.transfers).toEqual({});
});

it("assignment changes future duty without erasing current player Watch or other queued work", () => {
  let c = prepared();
  const original = structuredClone(alex(c).queue);
  c = play(c, ["assign-watch alex subject 10 3"]);
  expect(alex(c).watchDuty).toMatchObject({
    targetId: `${c.siteId}:subject`,
    post: { x: 10, y: 3 },
  });
  expect(alex(c).queue).toEqual(original);
  c = play(c, ["assign alex station"]);
  expect(alex(c).watchDuty).toBeUndefined();
  expect(alex(c).serviceDuty).toBe(`${c.siteId}:station`);
  expect(alex(c).queue).toEqual(original);
  c = play(c, ["assign-watch alex subject 10 3"]);
  expect(alex(c).serviceDuty).toBeUndefined();
  c = play(c, ["assign-watch alex none"]);
  expect(alex(c).queue).toEqual(original);
  expect(alex(c).watchDuty).toBeUndefined();
});

it("a genuine care interruption runs treatment rather than reselecting the same watch every tick", () => {
  let c = play(prepared(), [
    "assign-watch casey subject 9 4",
    "relieve casey alex",
    "step 1",
  ]);
  const site = c.session.state.sites[c.siteId]!;
  const medic = site.entities["site-1:casey"];
  const patientId = "site-1:ben";
  const patient = site.entities[patientId];
  if (medic?.kind !== "pawn" || patient?.kind !== "pawn")
    throw new Error("Expected actual staff.");
  expect(medic.queue[0]!.action.kind).toBe("watch");
  patient.location = { kind: "ground", position: { x: 9, y: 5 } };
  patient.health!.wounds.push({
    id: "urgent-injury",
    severity: 20,
    bleeding: 2,
  });
  const start = c.session.state.tick;
  c = play(c, ["step 6"]);
  const nextSite = c.session.state.sites[c.siteId]!;
  const treated = nextSite.entities[patientId];
  const returned = nextSite.entities[medic.id];
  expect(treated).toMatchObject({
    health: {
      wounds: [
        {
          id: "urgent-injury",
          bleeding: 0,
          stabilization: { actorId: medic.id },
        },
      ],
    },
  });
  expect(returned).toMatchObject({
    queue: [{ action: { kind: "watch", workTicks: 2 } }],
  });
  expect(
    c.session.events.filter(
      (event) =>
        event.entityId === medic.id &&
        (event.tick ?? 0) > start &&
        event.kind === "interrupted",
    ),
  ).toHaveLength(1);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({
      entityId: medic.id,
      kind: "warning",
      reason:
        "Direct watch interrupted for injury; maintain replacement coverage.",
    }),
  );
});

it("rejects malformed/nonhuman/nonfloor assignments without mutation and exposes a post with no view", () => {
  const c = prepared();
  const before = JSON.stringify(c);
  expect(() => executeLine(c, "assign-watch alex subject 2")).toThrow(
    "Use assign-watch",
  );
  expect(executeLine(c, "assign-watch alex subject 0 0").rejected).toBe(true);
  expect(executeLine(c, "assign-watch alex subject nope 1").rejected).toBe(
    true,
  );
  expect(executeLine(c, "assign-watch subject subject 4 1").rejected).toBe(
    true,
  );
  expect(JSON.stringify(c)).toBe(before);
  let blocked = play(c, [
    "assign-watch alex subject 1 3",
    "relieve alex casey",
    "step 20",
  ]);
  expect(alex(blocked).watchDuty).toBeDefined();
  expect(
    directWatchers(
      blocked.session.state.sites[blocked.siteId]!,
      `${blocked.siteId}:subject`,
    ).map((observer) => observer.id),
  ).not.toContain("site-1:alex");
  expect(executeLine(blocked, "status work").output).toContain("watch duty");
  expect(executeLine(blocked, "status work").output).toMatch(
    /BLOCKED|UNAVAILABLE/,
  );
});
