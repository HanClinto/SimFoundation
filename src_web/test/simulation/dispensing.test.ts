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
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { materials } from "../../src/simulation/catalog";

const entity = (console: ConsoleState, id: string) =>
  console.session.state.sites["site-1"]!.entities[`site-1:${id}`]!;
const machine = (console: ConsoleState) =>
  entity(console, "machine") as Facility;
const pawn = (console: ConsoleState, id = "ben") => entity(console, id) as Pawn;
const coins = (console: ConsoleState) => entity(console, "coins").amount;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
  }
  return console;
}

function startPaid() {
  let console = play(openConsole(), [
    "order ben dispense machine tracer tracer",
  ]);
  for (let ticks = 0; ticks < 30 && coins(console) === 8; ticks++)
    console = executeLine(console, "step").console;
  expect(coins(console)).toBe(7);
  expect(pawn(console).queue[0]!.action).toMatchObject({
    kind: "dispense",
    workTicks: 1,
    paymentId: "site-1:coins",
  });
  return console;
}

it("plays two distinct source-conserving samples, home comparison and a paid solid rejection", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/quests/scp294/tests/repeated-tracer.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const console = play(openConsole(), transcript.split(/\r?\n/));
  expect(coins(console)).toBe(5);
  expect(entity(console, "tracer").amount).toBe(0);
  const records = machine(console).dispenser!.records;
  expect(records).toHaveLength(3);
  expect(records[2]).toMatchObject({ requestId: "diamond", amount: 0 });
  expect(records[2]!.sampleId).toBeUndefined();
  expect(records[2]!.result).toContain("OUT OF RANGE");
  expect(executeLine(console, "status").output).toContain("SCP-294: diamond");
  expect(executeLine(console, "status").output).toContain(
    "from site-1:tracer (1 cup)",
  );
  for (let index = 1; index <= 2; index++)
    expect(entity(console, `machine:sample-${index}`)).toMatchObject({
      definitionId: "tracer-sample",
      amount: 1,
      sample: {
        machineId: "site-1:machine",
        sourceId: "site-1:tracer",
        actorId: "site-1:ben",
        requestId: "tracer",
        amount: 1,
      },
    });
  expect(entity(console, "sample-bench")).toMatchObject({
    study: {
      findings: [
        {
          planId: "repeated-tracer",
          sourceIds: ["site-1:machine:sample-1", "site-1:machine:sample-2"],
        },
      ],
    },
  });
  expect(pawn(console).queue).toHaveLength(0);
  expect(machine(console).dispenser!.nextSampleId).toBe(3);
});

it("preserves paid progress across reload and strips forged payment from new orders", () => {
  const console = startPaid();
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 12)).toEqual(stepSession(console.session, 12));
  const finished = { ...console, session: stepSession(restored, 12) };
  expect(coins(finished)).toBe(7);
  expect(entity(finished, "tracer").amount).toBe(1);
  expect(machine(finished).dispenser!.records).toHaveLength(1);
  const initial = openConsole();
  const result = executeCommand(
    initial.session.state,
    {
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:ben",
      action: {
        kind: "dispense",
        targetId: "site-1:machine",
        requestId: "diamond",
        workTicks: 100,
        paymentId: "forged",
      },
    },
    materials,
  );
  const queued = result.state.sites["site-1"]!.entities["site-1:ben"] as Pawn;
  expect(queued.queue[0]!.action).toEqual({
    kind: "dispense",
    targetId: "site-1:machine",
    requestId: "diamond",
    workTicks: 0,
  });
});

it("cancellation keeps the spent coin but no liquid is withdrawn before completion", () => {
  let console = startPaid();
  console = play(console, ["cancel ben", "step 2"]);
  expect(coins(console)).toBe(7);
  expect(entity(console, "tracer").amount).toBe(2);
  expect(machine(console).dispenser!.records).toHaveLength(0);
  console = play(console, [
    "order ben dispense machine tracer tracer",
    "step 12",
  ]);
  expect(coins(console)).toBe(6);
  expect(entity(console, "tracer").amount).toBe(1);
  expect(machine(console).dispenser!.records).toHaveLength(1);
});

it("blocked output, depleted source and missing coins explain work without charging", () => {
  let console = play(openConsole(), [
    "order ben dispense machine tracer tracer",
    "step 20",
  ]);
  console = play(console, [
    "order ben dispense machine tracer tracer",
    "step 10",
  ]);
  expect(executeLine(console, "queue ben").output).toContain(
    "Clear the previous sample",
  );
  expect(coins(console)).toBe(7);
  console = play(console, [
    "cancel ben",
    "order ben deliver site-1:machine:sample-1 8 3",
    "step 12",
    "order ben dispense machine tracer tracer",
    "step 16",
    "order ben deliver site-1:machine:sample-2 9 4",
    "step 12",
    "order ben dispense machine tracer tracer",
    "step 16",
  ]);
  expect(executeLine(console, "queue ben").output).toContain(
    "less than one portion",
  );
  expect(coins(console)).toBe(6);
  console = play(console, ["cancel ben"]);
  entity(console, "coins").amount = 0;
  console = play(console, [
    "order ben dispense machine water water",
    "step 12",
  ]);
  expect(executeLine(console, "queue ben").output).toContain(
    "Bring coin-allocation",
  );
  expect(entity(console, "water").amount).toBe(4);
});

it("interruption and source removal do not refund coins or create a sample", () => {
  let console = startPaid();
  pawn(console).canAct = false;
  console = executeLine(console, "step").console;
  expect(pawn(console).queue).toHaveLength(0);
  expect(coins(console)).toBe(7);
  expect(entity(console, "tracer").amount).toBe(2);
  console = startPaid();
  const actionId = pawn(console).queue[0]!.id;
  delete console.session.state.sites["site-1"]!.entities["site-1:tracer"];
  console = executeLine(console, "step").console;
  expect(pawn(console).queue).toHaveLength(0);
  expect(console.session.events).toContainEqual(
    expect.objectContaining({
      kind: "failed",
      actionId,
      entityId: "site-1:ben",
      reason: "The named liquid source is no longer at this site.",
    }),
  );
  expect(coins(console)).toBe(7);
  expect(machine(console).dispenser!.records).toHaveLength(0);
});

it("one operator owns productive machine work and unsupported requests cannot masquerade as source retrieval", () => {
  let console = play(openConsole(), [
    "order ben dispense machine water water",
    "order alex dispense machine coffee coffee",
    "step 25",
  ]);
  expect(machine(console).dispenser!.records).toHaveLength(1);
  expect(coins(console)).toBe(7);
  const total =
    entity(console, "water").amount +
    entity(console, "coffee").amount +
    entity(console, "machine:sample-1").amount;
  expect(total).toBe(7);
  const fresh = openConsole();
  expect(
    executeLine(fresh, "order ben dispense machine anything").output,
  ).toContain("Unknown request");
  expect(
    executeLine(fresh, "order ben dispense machine diamond water").output,
  ).toContain("does not accept a source");
  console = play(fresh, [
    "order ben dispense machine tracer coffee",
    "step 20",
  ]);
  expect(executeLine(console, "queue ben").output).toContain(
    "source specified by this request",
  );
  expect(coins(console)).toBe(8);
});
