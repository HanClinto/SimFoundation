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
  }
  return console;
}

it("physically collects a chosen quantity, retaining source amount and condition across reload", () => {
  let console = play(openConsole(), ["order alex take meals 3", "step"]);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBe(8);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
  console = play(console, ["step 20"]);
  const home = console.session.state.sites["site-1"]!;
  expect(home.entities["site-1:meals"]!.amount).toBe(5);
  expect(home.entities["site-1:meals:portion-action-1"]).toMatchObject({
    definitionId: "packaged-meal",
    amount: 3,
    location: { kind: "carried", carrierId: "site-1:alex" },
  });
  expect(executeLine(console, "inspect alex").output).toContain(
    '"id": "site-1:meals:portion-action-1"',
  );
});

it("whole-stack collection retains identity and source shortfall waits instead of inventing supplies", () => {
  const whole = play(openConsole(), ["order alex take meals 8", "step 20"]);
  expect(
    whole.session.state.sites["site-1"]!.entities["site-1:meals"],
  ).toMatchObject({
    amount: 8,
    location: { kind: "carried", carrierId: "site-1:alex" },
  });
  const initial = openConsole();
  expect(executeLine(initial, "order alex take meals 9").output).toContain(
    "less than",
  );
  let console = play(initial, ["order alex take meals 3"]);
  console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount = 2;
  console = play(console, ["step 20"]);
  expect(executeLine(console, "queue alex").output).toContain("less than");
});

it("splitting supplies preserves per-unit condition rather than damaging or repairing either stack", () => {
  const console = play(openConsole(), [
    "order alex take clinical-packs 1",
    "step 20",
  ]);
  const home = console.session.state.sites["site-1"]!;
  expect(home.entities["site-1:clinical-packs"]).toMatchObject({
    amount: 3,
    integrity: 100,
  });
  expect(home.entities["site-1:clinical-packs:portion-action-1"]).toMatchObject(
    {
      amount: 1,
      integrity: 100,
    },
  );
});

it("cancellation before arrival does not split and objects/people/cases cannot be duplicated", () => {
  const console = play(openConsole(), [
    "order alex take meals 3",
    "step",
    "cancel alex",
    "step 20",
  ]);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBe(8);
  expect(
    console.session.state.sites["site-1"]!.entities[
      "site-1:meals:portion-action-1"
    ],
  ).toBeUndefined();
  expect(executeLine(console, "order alex take case 1").output).toContain(
    "ordinary stackable",
  );
  expect(executeLine(console, "order alex take ben 1").output).toContain(
    "active mobile pawn",
  );
  expect(() => executeLine(console, "order alex take meals -1")).toThrow(
    "positive finite",
  );
  expect(() => executeLine(console, "order alex take meals no")).toThrow(
    "positive finite",
  );
});

it("travelling with a collected stack conserves quantities and never clones the portion", () => {
  let console = play(openConsole(), [
    "order alex take meals 3",
    "step 20",
    "prepare gallery alex",
    "step 12",
    "send gallery alex",
  ]);
  const before = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(before, 6)).toEqual(stepSession(console.session, 6));
  console = play(console, ["step 6", "site gallery"]);
  expect(
    console.session.state.sites["site-3"]!.entities[
      "site-1:meals:portion-action-1"
    ]!.amount,
  ).toBe(3);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBe(5);
  const actor = console.session.state.sites["site-3"]!.entities[
    "site-1:alex"
  ] as Pawn;
  expect(actor.queue).toHaveLength(0);
  expect(executeLine(console, "order alex take exhibit").output).toContain(
    "already carrying",
  );
});
