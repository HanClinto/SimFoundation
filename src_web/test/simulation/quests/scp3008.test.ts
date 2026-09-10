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
import { operatingPhase } from "../../../src/simulation/core/site/OperatingCycle";
import { visibleThreats } from "../../../src/simulation/core/site/Visibility";
import type { Pawn } from "../../../src/simulation/core/entity/pawn/Pawn";
import type { Facility } from "../../../src/simulation/core/entity/Facility";

const store = (console: ConsoleState) =>
  console.session.state.sites["site-11"]!;
const person = (console: ConsoleState, id: string, siteId = "site-11") =>
  console.session.state.sites[siteId]!.entities[id] as Pawn;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
    const owners = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ];
    const ids = owners.flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  return console;
}

function transcript(name: string) {
  return fs
    .readFileSync(
      new URL(
        `../../../src/simulation/catalog/quests/scp3008/tests/${name}.txt`,
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
}

function visit() {
  return play(openConsole(), [
    "prepare store alex casey",
    "step 12",
    "send store alex casey",
    "step 8",
    "site store",
    "step",
  ]);
}

it("plays physical shelter repair, field recovery and a two-passenger group evacuation", () => {
  const console = play(openConsole(), transcript("shelter-and-evacuate"));
  const shelter = store(console).entities["site-11:shelter"] as Facility;
  expect(shelter.integrity).toBe(100);
  expect(shelter.service!.history.map((entry) => entry.kind)).toEqual([
    "repair",
    "service",
  ]);
  expect(store(console).entities["site-11:clinical-pack"]!.amount).toBe(0);
  expect(store(console).entities["site-1:meals:portion-action-1"]!.amount).toBe(
    1,
  );
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:clinical-packs"]!
      .amount,
  ).toBe(4);
  for (const id of ["site-11:nora", "site-11:eli"]) {
    expect(console.session.campaign!.admissions[id]).toBeDefined();
    expect(store(console).entities[id]).toBeUndefined();
    expect(person(console, id, "site-1").canAct).toBe(true);
  }
  expect(person(console, "site-11:eli", "site-1").health!.bloodLoss).toBe(75);
});

it("supports early mixed carried/walking evacuation while leaving the shelter and its supplies unchanged", () => {
  const console = play(openConsole(), transcript("carried-evacuation"));
  expect(store(console).entities["site-11:shelter"]!.integrity).toBe(40);
  expect(store(console).entities["site-11:clinical-pack"]!.amount).toBe(1);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:clinical-packs"]!
      .amount,
  ).toBe(3);
  expect(
    person(console, "site-11:eli", "site-1").health!.wounds[0]!.severity,
  ).toBe(10);
  expect(console.session.campaign!.admissions["site-11:nora"]).toBeDefined();
});

it("starts the operating clock only after physical responder entry and never resets it on revisit", () => {
  const unused = play(openConsole(), ["step 500"]);
  expect(store(unused).cycle!.startedTick).toBeNull();
  let console = visit();
  const started = store(console).cycle!.startedTick!;
  expect(started).toBe(console.session.state.tick);
  expect(operatingPhase(store(console).cycle, started)).toEqual({
    phase: "day",
    changesAt: started + 120,
  });
  console = play(console, [
    "send home alex casey",
    "step 8",
    "site home",
    "step 180",
    "prepare store alex casey",
    "step 12",
    "send store alex casey",
    "step 8",
    "site store",
  ]);
  expect(store(console).cycle!.startedTick).toBe(started);
  expect(executeLine(console, "status").output).toContain("Cycle at site-11:");
});

it("refuses night departure without losing people, then reopens the return route", () => {
  let console = visit();
  const night = store(console).cycle!.startedTick! + 120;
  console = play(console, [`step ${night - console.session.state.tick}`]);
  const before = JSON.stringify(console);
  expect(() => executeLine(console, "send home alex casey")).toThrow(
    `reopens at tick ${night + 60}`,
  );
  expect(JSON.stringify(console)).toBe(before);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 60)).toEqual(stepSession(console.session, 60));
  console = play(console, [
    "step 60",
    "send home alex casey",
    "step 8",
    "site home",
  ]);
  expect(console.session.state.transfers).toEqual({});
  expect(person(console, "site-1:alex", "site-1").canAct).toBe(true);
});

it("night employees cause actual bounded wounds, stop hostility at dawn and cannot incapacitate the crew by cumulative impacts", () => {
  let console = play(visit(), ["order alex move 12 5", "step 30"]);
  const firstNight = store(console).cycle!.startedTick! + 120;
  expect(
    visibleThreats(
      store(console),
      person(console, "site-1:alex"),
      console.session.state.tick,
    ),
  ).toEqual([]);
  console = play(console, [
    `step ${firstNight + 59 - console.session.state.tick}`,
  ]);
  const wounded = person(console, "site-1:alex");
  const severity = wounded.health!.wounds.reduce(
    (sum, wound) => sum + wound.severity,
    0,
  );
  expect(severity).toBeGreaterThan(0);
  expect(severity).toBeLessThanOrEqual(60);
  expect(wounded.canAct).toBe(true);
  const dawn = play(console, ["step"]);
  expect(operatingPhase(store(dawn).cycle, dawn.session.state.tick).phase).toBe(
    "day",
  );
  expect(
    visibleThreats(
      store(dawn),
      person(dawn, "site-1:alex"),
      dawn.session.state.tick,
    ),
  ).toEqual([]);
  console = play(dawn, ["step 360"]);
  expect(
    person(console, "site-1:alex").health!.wounds.reduce(
      (sum, wound) => sum + wound.severity,
      0,
    ),
  ).toBeLessThanOrEqual(60);
  expect(person(console, "site-1:alex").canAct).toBe(true);
});

it("partial withdrawal leaves the original casualty, night clock and unspent clinical supply at the retained sector", () => {
  const console = play(visit(), [
    "order casey move 2 5",
    "order alex escort nora 2 4",
    "step 36",
    "send home alex casey nora",
    "step 8",
    "site home",
  ]);
  expect(store(console).entities["site-11:nora"]).toBeUndefined();
  expect(person(console, "site-11:eli").canAct).toBe(false);
  expect(store(console).entities["site-11:clinical-pack"]!.amount).toBe(1);
  expect(store(console).cycle!.startedTick).not.toBeNull();
});
