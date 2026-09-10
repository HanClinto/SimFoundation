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
import type { Facility } from "../../src/simulation/core/entity/Facility";
import {
  serviceDeadline,
  serviceStatus,
} from "../../src/simulation/core/entity/Service";
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { materials } from "../../src/simulation/catalog";

const diner = (console: ConsoleState) => console.session.state.sites["site-9"]!;
const counter = (console: ConsoleState) =>
  diner(console).entities["site-9:counter"] as Facility;
const actor = (console: ConsoleState) =>
  diner(console).entities["site-1:alex"] as Pawn;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
    const ids = [
      ...Object.values(console.session.state.sites),
      ...Object.values(console.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  return console;
}

function provisioned() {
  return play(openConsole(), [
    "order alex take meals 4",
    "order casey take parts 1",
    "step 20",
    "prepare diner alex casey",
    "step 12",
    "send diner alex casey",
    "step 8",
    "site diner",
    "order alex deliver site-1:meals:portion-action-1 7 4",
    "order casey deliver site-1:parts:portion-action-2 8 3",
    "step 20",
  ]);
}

it("plays recurring service while managing home, then keeps a deliberate lapse visible after withdrawal", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/quests/scp1295/tests/staffed-service.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const console = play(openConsole(), transcript.split(/\r?\n/));
  const service = counter(console).service!;
  expect(counter(console).integrity).toBe(100);
  expect(
    service.history.filter((entry) => entry.kind === "repair"),
  ).toHaveLength(1);
  expect(
    service.history.filter((entry) => entry.kind === "service").length,
  ).toBeGreaterThanOrEqual(2);
  expect(serviceStatus(service, console.session.state.tick)).toBe("overdue");
  expect(executeLine(console, "status").output).toContain("OVERDUE");
  expect(diner(console).entities["site-9:entry"]).toMatchObject({
    open: true,
    policy: "held-open",
  });
  for (let index = 1; index <= 4; index++)
    expect(diner(console).entities[`site-9:regular-${index}`]).toBeDefined();
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:alex"],
  ).toBeDefined();
});

it("repair and meal use are physical, paid once and replay deterministically in mid-work", () => {
  let console = play(provisioned(), ["order alex service counter", "step"]);
  expect(diner(console).entities["site-1:parts:portion-action-2"]!.amount).toBe(
    0,
  );
  expect(counter(console).integrity).toBe(40);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
  console = play(console, ["step 20"]);
  expect(counter(console).integrity).toBe(100);
  expect(diner(console).entities["site-1:meals:portion-action-1"]!.amount).toBe(
    3,
  );
  expect(counter(console).service!.history).toEqual([
    expect.objectContaining({
      kind: "repair",
      supplyId: "site-1:parts:portion-action-2",
      amount: 1,
    }),
    expect.objectContaining({
      kind: "service",
      supplyId: "site-1:meals:portion-action-1",
      amount: 1,
      lateBy: 0,
    }),
  ]);
});

it("revisits a lapsed diner with an actual new food portion without resetting repair or service history", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/quests/scp1295/tests/staffed-service.txt",
      import.meta.url,
    ),
    "utf8",
  );
  let console = play(openConsole(), transcript.split(/\r?\n/));
  const previous = counter(console).service!.history.length;
  console = play(console, ["order alex take meals 2", "step 20"]);
  const portion = Object.values(
    console.session.state.sites["site-1"]!.entities,
  ).find(
    (entity) =>
      entity.location.kind === "carried" &&
      entity.location.carrierId === "site-1:alex",
  )!;
  console = play(console, [
    "prepare diner alex",
    "step 12",
    "send diner alex",
    "step 8",
    "site diner",
    `order alex deliver ${portion.id} 7 4`,
    "step 20",
    "order alex service counter",
    "step 20",
  ]);
  expect(counter(console).service!.history.length).toBe(previous + 1);
  expect(counter(console).service!.history.at(-1)).toMatchObject({
    kind: "service",
    supplyId: portion.id,
  });
  expect(counter(console).service!.history.at(-1)!.lateBy).toBeGreaterThan(0);
  expect(
    counter(console).service!.history.filter(
      (record) => record.kind === "repair",
    ),
  ).toHaveLength(1);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBe(2);
});

it("missing repair parts and meal depletion block service without inventing supplies or erasing repair", () => {
  let console = provisioned();
  diner(console).entities["site-1:parts:portion-action-2"]!.amount = 0;
  console = play(console, ["order alex service counter", "step 10"]);
  expect(executeLine(console, "queue alex").output).toContain(
    "maintenance-parts",
  );
  expect(counter(console).integrity).toBe(40);
  diner(console).entities["site-1:parts:portion-action-2"]!.amount = 1;
  diner(console).entities["site-1:meals:portion-action-1"]!.amount = 0;
  console = play(console, ["step 20"]);
  expect(counter(console).integrity).toBe(100);
  expect(executeLine(console, "queue alex").output).toContain("packaged-meal");
  expect(counter(console).service!.history).toHaveLength(1);
});

it("cancelled paid repair retains its spent part and a late service restores counter use with an honest history", () => {
  let console = play(provisioned(), [
    "order alex service counter",
    "step",
    "cancel alex",
  ]);
  expect(diner(console).entities["site-1:parts:portion-action-2"]!.amount).toBe(
    0,
  );
  expect(counter(console).integrity).toBe(40);
  diner(console).entities["site-1:parts:portion-action-2"]!.amount = 1;
  console = play(console, ["order alex service counter", "step 20"]);
  const deadline = serviceDeadline(counter(console).service!)!;
  console = play(console, [
    `step ${deadline - console.session.state.tick + 5}`,
  ]);
  expect(executeLine(console, "order casey read counter").output).toContain(
    "Restore service",
  );
  console = play(console, ["order alex service counter", "step 12"]);
  expect(counter(console).service!.history.at(-1)!.lateBy).toBeGreaterThan(0);
  expect(executeLine(console, "order casey read counter").output).toMatch(
    /^accepted/,
  );
  expect(
    counter(console).service!.history.filter(
      (entry) => entry.kind === "repair",
    ),
  ).toHaveLength(1);
});

it("a duty uses critical ordinary rest rather than trapping the worker in service", () => {
  let console = provisioned();
  actor(console).needs.fatigue!.value = 90;
  console = play(console, ["assign alex counter", "step"]);
  expect(actor(console).queue[0]!.action.kind).toBe("sleep");
  console = play(console, ["step 50"]);
  expect(actor(console).needs.fatigue!.value).toBeLessThan(60);
  expect(
    counter(console).service!.history.some((entry) => entry.kind === "service"),
  ).toBe(true);
});

it("new service orders cannot forge paid inputs, and duty assignment never edits active work", () => {
  const console = provisioned();
  const paid = executeCommand(
    console.session.state,
    {
      kind: "enqueue",
      siteId: "site-9",
      entityId: "site-1:alex",
      action: {
        kind: "service",
        targetId: "site-9:counter",
        workTicks: 99,
        supplyId: "fake",
        repairSupplyId: "fake",
      },
    },
    materials,
  );
  expect(
    (paid.state.sites["site-9"]!.entities["site-1:alex"] as Pawn).queue[0]!
      .action,
  ).toEqual({
    kind: "service",
    targetId: "site-9:counter",
    workTicks: 0,
  });
  const ordered = {
    ...console,
    session: { ...console.session, state: paid.state },
  };
  const assigned = play(ordered, ["assign alex counter"]);
  expect(actor(assigned).queue).toEqual(actor(ordered).queue);
  expect(actor(assigned).serviceDuty).toBe("site-9:counter");
});
