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
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { deserialize } from "../../src/simulation/core/Snapshot";
import { hasLivingStaff } from "../../src/simulation/catalog/campaign/Campaign";

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
    const ids = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  return console;
}

function person(console: ConsoleState, id: string): Pawn {
  const entity = [
    ...Object.values(console.session.state.sites),
    ...Object.values(console.session.state.transfers),
  ]
    .map((owner) => owner.entities[id])
    .find(Boolean);
  if (entity?.kind !== "pawn") throw new Error(`Missing pawn ${id}`);
  return entity;
}

it("late rescue recovers a permanent body and its existing recorder without resurrection or duplication", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/permanent-loss.txt",
      import.meta.url,
    ),
    "utf8",
  );
  let console = play(openConsole(), transcript.split(/\r?\n/));
  const victim = person(console, "site-12:rowan");
  expect(victim.health!.death).toEqual({
    tick: 99,
    cause: "untreated-blood-loss",
  });
  expect(victim.location).toEqual({ kind: "ground", position: { x: 1, y: 1 } });
  expect(
    console.session.state.sites["site-1"]!.entities["site-12:recorder"]!
      .location,
  ).toEqual({ kind: "carried", carrierId: victim.id });
  expect(executeLine(console, "order casey treat rowan").output).toContain(
    "dead",
  );
  expect(
    executeLine(console, "order casey nurse rowan clinic").output,
  ).toContain("dead");
  const before = structuredClone(victim);
  console = play(console, ["step 50"]);
  expect(person(console, victim.id)).toEqual(before);
  expect(executeLine(console, "inspect rowan").output).toContain('"death"');
  console = play(console, ["order casey deliver recorder 4 3", "finish casey"]);
  expect(
    console.session.state.sites["site-1"]!.entities["site-12:recorder"]!
      .location,
  ).toEqual({ kind: "ground", position: { x: 4, y: 3 } });
});

it("prompt stabilization prevents death but retains injury and the original person", () => {
  const console = play(openConsole(), [
    "prepare accident casey",
    "finish casey",
    "send accident casey",
    "finish casey",
    "site accident",
    "order casey treat rowan",
    "finish casey",
    "step 150",
  ]);
  const victim = person(console, "site-12:rowan");
  expect(victim.health!.death).toBeUndefined();
  expect(victim.health!.wounds[0]).toMatchObject({ severity: 20, bleeding: 0 });
  expect(victim.health!.bloodLoss).toBeGreaterThan(20);
});

it("death interrupts every commitment once, retains held property and cannot be commanded back to life", () => {
  let console = play(openConsole(), [
    "order alex take case",
    "finish alex",
    "order alex wait 200",
    "order alex wait 4",
  ]);
  const actor = person(console, "site-1:alex");
  actor.health = {
    wounds: [{ id: "fatal", severity: 150, bleeding: 0 }],
    bloodLoss: 0,
    mortality: { criticalTicks: 0, fatalAfterTicks: 2 },
  };
  console = play(console, ["step 2"]);
  expect(person(console, actor.id).queue).toEqual([]);
  expect(
    console.session.events.filter(
      (event) => event.entityId === actor.id && event.kind === "died",
    ),
  ).toHaveLength(1);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:case"]!.location,
  ).toEqual({ kind: "carried", carrierId: actor.id });
  expect(executeLine(console, "autonomy alex on").output).toContain("dead");
  expect(executeLine(console, "order alex wait 2").output).toContain("dead");
});

it("mortality advances once in blocked transit and current-version replay cannot lose the body", () => {
  let console = play(openConsole(), [
    "prepare gallery alex",
    "finish alex",
    "send gallery alex",
  ]);
  const actor = person(console, "site-1:alex");
  actor.health = {
    wounds: [{ id: "bleed", severity: 10, bleeding: 1 }],
    bloodLoss: 100,
    mortality: { criticalTicks: 0, fatalAfterTicks: 3 },
  };
  const blocker = person(console, "site-3:exhibit");
  blocker.location = { kind: "ground", position: { x: 2, y: 3 } };
  const restored = restoreSession(JSON.stringify(console.session))!;
  const at = console.session.state.tick;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
  console = play(console, ["step 20"]);
  expect(person(console, actor.id).health!.death!.tick).toBe(at + 3);
  expect(Object.keys(console.session.state.transfers)).toHaveLength(1);
});

it("all-three loss is terminal personnel loss with no hidden dispatch or respawn", () => {
  let console = openConsole();
  const staffIds = [...console.session.campaign!.staffIds];
  const entityIds = Object.values(console.session.state.sites)
    .flatMap((site) => Object.keys(site.entities))
    .sort();
  for (const id of console.session.campaign!.staffIds)
    person(console, id).health = {
      wounds: [{ id: "catastrophe", severity: 150, bleeding: 0 }],
      bloodLoss: 0,
      mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
    };
  console = play(console, ["step"]);
  for (const id of ["site-1:alex", "site-1:ben", "site-1:casey"])
    expect(person(console, id).health!.death).toBeDefined();
  const before = JSON.stringify(console);
  expect(() => executeLine(console, "reserve home devon")).toThrow(
    "Unknown command: reserve",
  );
  expect(JSON.stringify(console)).toBe(before);
  console = {
    ...console,
    session: restoreSession(JSON.stringify(console.session))!,
  };
  console = play(console, ["step 1000"]);
  expect(executeLine(console, "status").output).toContain(
    "No surviving campaign staff. No replacement personnel are available",
  );
  expect(console.session.campaign!.staffIds).toEqual(staffIds);
  for (const id of staffIds) {
    expect(person(console, id).health!.death).toBeDefined();
    expect(person(console, id).canAct).toBe(false);
    expect(executeLine(console, `order ${id} wait 1`).output).toContain("dead");
  }
  expect(
    Object.values(console.session.state.sites)
      .flatMap((site) => Object.keys(site.entities))
      .sort(),
  ).toEqual(entityIds);
  expect(console.session.state.transfers).toEqual({});
});

it.each(["home", "field", "transit"] as const)(
  "counts an incapacitated original survivor in %s, but never substitutes non-roster people after death",
  (owner) => {
    let c = openConsole();
    if (owner !== "home")
      c = play(c, [
        "prepare gallery alex",
        "finish alex",
        "send gallery alex",
        ...(owner === "field" ? ["finish alex", "site gallery"] : []),
      ]);
    for (const id of ["site-1:ben", "site-1:casey"])
      person(c, id).health = {
        wounds: [{ id: "fatal", severity: 150, bleeding: 0 }],
        bloodLoss: 0,
        mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
      };
    const survivor = person(c, "site-1:alex");
    survivor.health = {
      wounds: [{ id: "incapacitating", severity: 100, bleeding: 0 }],
      bloodLoss: 0,
      mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
    };
    c = play(c, ["step"]);
    expect(person(c, survivor.id).canAct).toBe(false);
    expect(person(c, survivor.id).health!.death).toBeUndefined();
    const actualOwner =
      owner === "transit"
        ? Object.values(c.session.state.transfers)[0]
        : c.session.state.sites[owner === "home" ? "site-1" : "site-3"];
    expect(actualOwner!.entities[survivor.id]).toBeDefined();
    const before = JSON.stringify(c);
    expect(hasLivingStaff(c.session.state, c.session.campaign!)).toBe(true);
    expect(executeLine(c, "status").output).not.toContain(
      "No surviving campaign staff",
    );
    expect(JSON.stringify(c)).toBe(before);
    person(c, survivor.id).health!.wounds[0]!.severity = 150;
    c = play(c, ["step"]);
    expect(person(c, survivor.id).health!.death).toBeDefined();
    expect(person(c, "site-12:rowan").health!.death).toBeUndefined();
    expect(hasLivingStaff(c.session.state, c.session.campaign!)).toBe(false);
    expect(executeLine(c, "status").output).toContain(
      "No surviving campaign staff. No replacement personnel are available",
    );
    const restored = restoreSession(JSON.stringify(c.session))!;
    expect(hasLivingStaff(restored.state, restored.campaign!)).toBe(false);
  },
);

it("a pre-fatal alarm leaves time for ordinary colleague preparation, travel and stabilization", () => {
  let c = executeLine(openConsole(), "run 400").console;
  expect(c.session.state.tick).toBe(60);
  c = play(c, [
    "prepare accident casey",
    "finish casey",
    "send accident casey",
    "finish casey",
    "site accident",
    "order casey treat rowan",
    "finish casey",
  ]);
  expect(person(c, "site-12:rowan").health!.death).toBeUndefined();
  expect(person(c, "site-12:rowan").health!.wounds[0]!.bleeding).toBe(0);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 100)).toEqual(stepSession(c.session, 100));
  c = play(c, ["step 100"]);
  expect(person(c, "site-12:rowan").health!.death).toBeUndefined();
});

it("a fresh campaign has exactly the three original staff, no reserve site or dispatch command", () => {
  const c = openConsole();
  expect(c.session.version).toBe(7);
  expect(c.session.state.version).toBe(49);
  expect(
    restoreSession(JSON.stringify({ ...c.session, version: 6 })),
  ).toBeNull();
  expect(
    deserialize(
      JSON.stringify({
        ...c.session.state,
        version: 48,
      }),
    ),
  ).toBeNull();
  expect(c.session.campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
  expect(c.session.campaign!.siteIds).not.toHaveProperty("reserve");
  const pawns = Object.values(c.session.state.sites)
    .flatMap((site) => Object.values(site.entities))
    .filter((entity) => entity.kind === "pawn");
  expect(
    pawns
      .filter((pawn) => pawn.playerControllable)
      .map((pawn) => pawn.id)
      .sort(),
  ).toEqual([...c.session.campaign!.staffIds].sort());
  expect(pawns.some((pawn) => /devon|riley/i.test(pawn.name))).toBe(false);
  expect(executeLine(c, "help").output).not.toMatch(/reserve|dispatch/i);
  const before = JSON.stringify(c);
  for (const line of ["reserve home devon", "dispatch home casey"])
    expect(() => executeLine(c, line)).toThrow("Unknown command");
  expect(JSON.stringify(c)).toBe(before);
});
