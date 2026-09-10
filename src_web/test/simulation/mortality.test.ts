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
  expect(executeLine(console, "order devon treat rowan").output).toContain(
    "dead",
  );
  expect(
    executeLine(console, "order devon nurse rowan clinic").output,
  ).toContain("dead");
  const before = structuredClone(victim);
  console = play(console, ["step 50"]);
  expect(person(console, victim.id)).toEqual(before);
  expect(executeLine(console, "inspect rowan").output).toContain('"death"');
  console = play(console, ["order devon deliver recorder 4 3", "finish devon"]);
  expect(
    console.session.state.sites["site-1"]!.entities["site-12:recorder"]!
      .location,
  ).toEqual({ kind: "ground", position: { x: 4, y: 3 } });
});

it("prompt stabilization prevents death but retains injury and the original person", () => {
  const console = play(openConsole(), [
    "reserve accident devon",
    "step 12",
    "site accident",
    "order devon treat rowan",
    "finish devon",
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

it("two actual reserves can continue after original-crew loss, without infinite replacements or reset equipment", () => {
  let console = openConsole();
  for (const id of console.session.campaign!.staffIds)
    person(console, id).health = {
      wounds: [{ id: "catastrophe", severity: 150, bleeding: 0 }],
      bloodLoss: 0,
      mortality: { criticalTicks: 0, fatalAfterTicks: 1 },
    };
  console = play(console, [
    "step",
    "reserve home devon",
    "step 12",
    "order devon move 4 3",
    "finish devon",
    "reserve home riley",
    "step 12",
  ]);
  for (const id of ["site-1:alex", "site-1:ben", "site-1:casey"])
    expect(person(console, id).health!.death).toBeDefined();
  const reserveId = console.session.campaign!.siteIds.reserve!;
  expect(person(console, `${reserveId}:devon`).canAct).toBe(true);
  expect(person(console, `${reserveId}:riley`).canAct).toBe(true);
  expect(console.session.campaign!.staffIds).toHaveLength(5);
  expect(() => executeLine(console, "reserve home devon")).toThrow(
    "unused reserve",
  );
  expect(
    console.session.state.sites[reserveId]!.entities[`${reserveId}:dispatches`]!
      .amount,
  ).toBe(0);
  console = play(console, [
    "order riley move 5 3",
    "finish riley",
    "prepare gallery devon",
    "finish devon",
    "send gallery devon",
    "step 6",
  ]);
  expect(person(console, `${reserveId}:devon`).location.kind).toBe("ground");
});
