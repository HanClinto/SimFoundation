import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function setup() {
  let console = openConsole("scp1867");
  for (const command of [
    "deploy field-agent alex",
    "deploy medic ben",
    "start",
  ])
    console = executeLine(console, command).console;
  return console;
}

function pawn(console: ConsoleState, name = "alex"): Pawn {
  const entity =
    console.session.state.sites[console.siteId]!.entities[
      `${console.siteId}:${name}`
    ];
  if (entity?.kind !== "pawn") throw new Error("Expected test pawn.");
  return entity;
}

function carrying(console: ConsoleState) {
  return (
    console.session.state.sites[console.siteId]!.entities[
      `${console.siteId}:journal`
    ]!.location.kind === "carried"
  );
}

it("delegates collection, travel and drop through the CLI and replays mid-carry", () => {
  let console = setup();
  const ordered = executeLine(console, "order alex deliver journal 2 4");
  expect(ordered.output).toContain("deliver site-1:journal to (2,4)");
  console = ordered.console;
  for (let tick = 0; tick < 40 && !carrying(console); tick++)
    console = executeLine(console, "step").console;
  expect(carrying(console)).toBe(true);
  expect(pawn(console).queue).toHaveLength(1);
  const restored = {
    ...console,
    session: restoreSession(JSON.stringify(console.session))!,
  };
  const finish = executeLine(console, "step 40").console;
  expect(finish).toEqual(executeLine(restored, "step 40").console);
  expect(
    finish.session.state.sites[finish.siteId]!.entities["site-1:journal"],
  ).toMatchObject({
    amount: 1,
    integrity: 100,
    location: { kind: "ground", position: { x: 2, y: 4 } },
  });
  expect(pawn(finish).queue).toHaveLength(0);
  expect(finish.session.events).toContainEqual(
    expect.objectContaining({ kind: "completed", actionKind: "deliver" }),
  );
});

it("keeps cancelled cargo physical and resumes delivery without a second pickup", () => {
  let console = executeLine(setup(), "order alex deliver journal 2 4").console;
  for (let tick = 0; tick < 40 && !carrying(console); tick++)
    console = executeLine(console, "step").console;
  console = executeLine(console, "cancel alex").console;
  expect(carrying(console)).toBe(true);
  expect(
    executeLine(console, "order ben deliver journal 2 4").output,
  ).toContain("rejected");
  console = executeLine(console, "order alex deliver journal 2 4").console;
  console = executeLine(console, "step 40").console;
  expect(carrying(console)).toBe(false);
  expect(pawn(console).queue).toHaveLength(0);
});

it("shows blocked delivery, retains pending orders and recovers after obstruction moves", () => {
  let console = setup();
  console = executeLine(console, "order alex deliver journal 2 5").console;
  console = executeLine(console, "order alex wait 2").console;
  console = executeLine(console, "step 40").console;
  expect(carrying(console)).toBe(true);
  expect(executeLine(console, "queue alex").output).toContain(
    "blocked: The destination is occupied.",
  );
  expect(executeLine(console, "queue alex").output).toContain("2. pending");
  console = executeLine(console, "order ben move 3 5").console;
  console = executeLine(console, "step 40").console;
  expect(pawn(console).queue).toHaveLength(0);
  expect(carrying(console)).toBe(false);
});

it("incapacity interrupts a delivery without erasing cargo or refunding resources", () => {
  let console = executeLine(setup(), "order alex deliver journal 2 4").console;
  for (let tick = 0; tick < 40 && !carrying(console); tick++)
    console = executeLine(console, "step").console;
  pawn(console).canAct = false;
  console = executeLine(console, "step").console;
  expect(pawn(console).queue).toHaveLength(0);
  expect(carrying(console)).toBe(true);
  expect(console.session.events).toContainEqual(
    expect.objectContaining({ kind: "interrupted", actionKind: "deliver" }),
  );
});

it("rejects malformed destinations without mutation and fails a removed target explicitly", () => {
  const initial = setup();
  const before = JSON.stringify(initial);
  expect(() =>
    executeLine(initial, "order alex deliver journal nowhere 4"),
  ).toThrow("integer");
  expect(JSON.stringify(initial)).toBe(before);
  expect(
    executeLine(initial, "order alex deliver journal 0 0").output,
  ).toContain("Invalid movement destination");
  let console = executeLine(initial, "order alex deliver journal 2 4").console;
  delete console.session.state.sites[console.siteId]!.entities[
    "site-1:journal"
  ];
  console = executeLine(console, "step").console;
  expect(pawn(console).queue).toHaveLength(0);
  expect(console.session.events).toContainEqual(
    expect.objectContaining({
      kind: "failed",
      reason: "The target is no longer present.",
    }),
  );
});
