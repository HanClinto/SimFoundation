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
import type { Item } from "../../src/simulation/core/entity/Item";
import { restraintFor } from "../../src/simulation/core/entity/pawn/Custody";
import { advanceTransfers } from "../../src/simulation/core/site/Transfer";

function entity(c: ConsoleState, id: string) {
  const value = [
    ...Object.values(c.session.state.sites),
    ...Object.values(c.session.state.transfers),
  ]
    .map((owner) => owner.entities[id])
    .find(Boolean);
  if (!value) throw new Error(`Missing ${id}`);
  return value;
}
const subject = (c: ConsoleState) => entity(c, "site-13:specimen") as Pawn;
const band = (c: ConsoleState) => entity(c, "site-1:restraint") as Item;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  return c;
}
function field() {
  return play(openConsole(), [
    "order alex equip suppressor",
    "order alex equip vest",
    "order alex take restraint",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "step 8",
    "site intervention",
  ]);
}
function bound() {
  return play(field(), [
    "order alex subdue specimen",
    "finish alex",
    "order alex restrain specimen @held",
    "finish alex",
  ]);
}

it("returns the same subdued living hostile with real restraint and worn equipment", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/restrained-return.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const c = play(openConsole(), transcript.split(/\r?\n/));
  expect(subject(c).acceptsEscort).toBe(false);
  expect(subject(c).health!.death).toBeUndefined();
  expect(subject(c).location).toEqual({
    kind: "ground",
    position: { x: 12, y: 7 },
  });
  expect(band(c).location).toEqual({
    kind: "carried",
    carrierId: "site-13:specimen",
  });
  expect(
    restraintFor(c.session.state.sites["site-1"]!.entities, subject(c).id)!.id,
  ).toBe(band(c).id);
});

it("requires subdual before restraint and a physical restraint before hostile departure", () => {
  let c = field();
  expect(executeLine(c, "order alex restrain specimen @held").output).toContain(
    "Subdue",
  );
  c = play(c, [
    "order alex drop @held",
    "finish alex",
    "order alex subdue specimen",
    "finish alex",
    "order alex take specimen",
    "finish alex",
    "prepare home alex",
    "finish alex",
  ]);
  expect(() => executeLine(c, "send home alex")).toThrow(
    "effective physical restraint",
  );
});

it("temporary subdual can expire under restraint without granting cooperation or independent attacks", () => {
  let c = bound();
  c = play(c, ["step 90"]);
  expect(subject(c).canAct).toBe(true);
  expect(subject(c).acceptsEscort).toBe(false);
  expect(subject(c).queue).toEqual([]);
  expect(band(c).integrity).toBeLessThan(200);
  expect(
    c.session.events.some(
      (event) => event.entityId === subject(c).id && event.kind === "attacked",
    ),
  ).toBe(false);
  c = play(c, [
    "order alex escort specimen 2 3",
    "finish alex",
    "send home alex specimen",
    "step 8",
  ]);
  expect(
    c.session.state.sites["site-1"]!.entities[subject(c).id],
  ).toBeDefined();
});

it("breakage during transit retains all records, emits escape and never mutates the input snapshot", () => {
  let c = play(bound(), [
    "order alex take specimen",
    "finish alex",
    "prepare home alex",
    "finish alex",
    "send home alex",
  ]);
  subject(c).health!.subdual!.untilTick = c.session.state.tick;
  band(c).integrity = 1;
  const before = JSON.stringify(c.session.state);
  const advanced = advanceTransfers({
    ...c.session.state,
    tick: c.session.state.tick + 1,
  });
  expect(JSON.stringify(c.session.state)).toBe(before);
  expect(Object.keys(advanced.transfers)).toHaveLength(1);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 8)).toEqual(stepSession(c.session, 8));
  c = play(c, ["step 8"]);
  expect(band(c).integrity).toBe(0);
  expect(band(c).location.kind).toBe("ground");
  expect(subject(c).location.kind).toBe("ground");
  expect(c.session.events).toContainEqual(
    expect.objectContaining({ kind: "escaped", entityId: subject(c).id }),
  );
});

it("cancelled attachment leaves the actual loose band and death halts attached-band wear", () => {
  let c = play(field(), [
    "order alex subdue specimen",
    "finish alex",
    "order alex restrain specimen @held",
    "step",
    "cancel alex",
  ]);
  expect(band(c).restraint!.attached).toBe(false);
  expect(band(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
  c = play(c, ["order alex restrain specimen @held", "finish alex"]);
  subject(c).health!.death = {
    tick: c.session.state.tick,
    cause: "critical-trauma",
  };
  subject(c).canAct = false;
  const condition = band(c).integrity;
  c = play(c, ["step 100"]);
  expect(band(c).integrity).toBe(condition);
});
