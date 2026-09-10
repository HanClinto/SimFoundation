import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../../src/adapters/cli/Console";
import {
  restoreSession,
  stepSession,
} from "../../../src/application/ScenarioSession";
import type { Facility } from "../../../src/simulation/core/entity/Facility";
import { serviceStatus } from "../../../src/simulation/core/entity/Service";

const annex = (console: ConsoleState) =>
  console.session.state.sites["site-10"]!;
const rig = (console: ConsoleState) =>
  annex(console).entities["site-10:rig"] as Facility;
const rehearsal = (console: ConsoleState) =>
  annex(console).entities["site-10:rehearsal"] as Facility;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
  }
  return console;
}

function visit() {
  return play(openConsole(), [
    "prepare screening ben alex",
    "step 12",
    "send screening ben alex",
    "step 8",
    "site screening",
  ]);
}

function ready() {
  return play(visit(), [
    "order ben study rehearsal acting-rehearsal",
    "step 12",
    "order ben deliver teapot 7 5",
    "step 30",
  ]);
}

it("plays trained hosting of three distinct retained programmes and exposes eventual depletion", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../../src/simulation/catalog/quests/scp2006/tests/curated-hosting.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const console = play(openConsole(), transcript.split(/\r?\n/));
  const records = rig(console).service!.history.filter(
    (entry) => entry.kind === "service",
  );
  expect(records).toHaveLength(3);
  expect(new Set(records.map((entry) => entry.supplyId)).size).toBe(3);
  expect(records.every((entry) => entry.consumed === false)).toBe(true);
  for (const id of ["teapot", "moon", "fog"])
    expect(annex(console).entities[`site-10:${id}`]!.amount).toBe(1);
  expect(serviceStatus(rig(console).service!, console.session.state.tick)).toBe(
    "overdue",
  );
  expect(executeLine(console, "queue ben").output).toContain("unused instance");
  expect(
    rehearsal(console)
      .study!.findings.map((entry) => entry.actorId)
      .sort(),
  ).toEqual(["site-1:alex", "site-1:ben"]);
});

it("requires each host's own physical rehearsal and does not duplicate a repeated qualification", () => {
  let console = visit();
  expect(executeLine(console, "order ben service rig").output).toContain(
    "acting-rehearsal",
  );
  console = play(console, [
    "order ben study rehearsal acting-rehearsal",
    "step 12",
  ]);
  expect(executeLine(console, "order alex service rig").output).toContain(
    "acting-rehearsal",
  );
  console = play(console, [
    "order ben study rehearsal acting-rehearsal",
    "step",
    "order alex study rehearsal acting-rehearsal",
    "step 12",
  ]);
  expect(rehearsal(console).study!.findings).toHaveLength(2);
});

it("rejects unapproved or previously completed prints without consuming or cloning them", () => {
  let console = play(visit(), [
    "order ben study rehearsal acting-rehearsal",
    "step 12",
    "order ben deliver unreviewed 7 5",
    "step 30",
    "order ben service rig",
    "step 12",
  ]);
  expect(executeLine(console, "queue ben").output).toContain(
    "approved-programme",
  );
  expect(annex(console).entities["site-10:unreviewed"]!.amount).toBe(1);
  console = play(console, [
    "cancel ben",
    "order ben deliver teapot 7 5",
    "step 30",
    "order ben service rig",
    "step 12",
    "step 180",
    "order ben service rig",
    "step 12",
  ]);
  expect(executeLine(console, "queue ben").output).toContain("unused instance");
  expect(rig(console).service!.history).toHaveLength(1);
  expect(annex(console).entities["site-10:teapot"]!.amount).toBe(1);
  console = play(console, [
    "cancel ben",
    "order ben deliver moon 9 5",
    "step 30",
    "order ben service rig",
    "step 12",
  ]);
  expect(rig(console).service!.history).toHaveLength(2);
  expect(rig(console).service!.history.at(-1)!.lateBy).toBeGreaterThan(0);
});

it("claims an in-use programme until the presentation ends and replays ongoing work", () => {
  let console = play(ready(), ["order ben service rig", "step"]);
  expect(executeLine(console, "order alex take teapot").output).toContain(
    "active presentation",
  );
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 12)).toEqual(stepSession(console.session, 12));
  console = play(console, ["cancel ben"]);
  expect(rig(console).service!.history).toHaveLength(0);
  expect(annex(console).entities["site-10:teapot"]!.amount).toBe(1);
  expect(executeLine(console, "order alex take teapot").output).toMatch(
    /^accepted/,
  );
});

it("needs the actual audience and does not complete when an active print disappears", () => {
  let console = ready();
  const audience = annex(console).entities["site-10:audience"]!;
  audience.location = { kind: "ground", position: { x: 1, y: 1 } };
  expect(executeLine(console, "order ben service rig").output).toContain(
    "Bring scp-2006",
  );
  audience.location = { kind: "ground", position: { x: 8, y: 4 } };
  console = play(console, ["order ben service rig", "step"]);
  delete annex(console).entities["site-10:teapot"];
  console = play(console, ["step"]);
  expect(console.session.events).toContainEqual(
    expect.objectContaining({
      kind: "failed",
      reason: "The active service input is no longer present.",
    }),
  );
  expect(rig(console).service!.history).toHaveLength(0);
});

it("does not spend a programme in place of missing physical repair parts", () => {
  let console = ready();
  rig(console).integrity = 40;
  console = play(console, ["order ben service rig", "step 12"]);
  expect(executeLine(console, "queue ben").output).toContain(
    "maintenance-parts",
  );
  expect(rig(console).integrity).toBe(40);
  expect(rig(console).service!.history).toHaveLength(0);
  expect(annex(console).entities["site-10:teapot"]!.amount).toBe(1);
});
