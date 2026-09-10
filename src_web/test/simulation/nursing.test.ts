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
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { materials } from "../../src/simulation/catalog";

const actor = (console: ConsoleState, id: string) =>
  console.session.state.sites["site-1"]!.entities[`site-1:${id}`] as Pawn;
const packs = (console: ConsoleState) =>
  console.session.state.sites["site-1"]!.entities["site-1:clinical-packs"]!;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
  }
  return console;
}

function prepared() {
  const console = openConsole();
  const patient = actor(console, "alex");
  patient.location = { kind: "ground", position: { x: 3, y: 1 } };
  patient.health = {
    wounds: [{ id: "test", severity: 10, bleeding: 0 }],
    bloodLoss: 100,
  };
  return play(console, ["step"]);
}

it("a late ordinary CLI rescue carries, stabilizes and clinically restores one living patient before admission", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/carried-recovery.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const console = play(openConsole(), lines);
  const patient = console.session.state.sites["site-1"]!.entities[
    "site-5:mira"
  ] as Pawn;
  expect(patient.canAct).toBe(true);
  expect(patient.health!.bloodLoss).toBe(75);
  expect(patient.health!.wounds).toEqual([
    {
      id: "laceration",
      severity: 10,
      bleeding: 0,
      treatedBy: "site-1:casey",
    },
  ]);
  expect(patient.health!.incapacity).toBeUndefined();
  expect(packs(console).amount).toBe(3);
  expect(console.session.campaign!.admissions["site-5:mira"]).toBeDefined();
  expect(
    console.session.state.sites["site-5"]!.entities["site-5:mira"],
  ).toBeUndefined();
});

it("requires an actual clinical bed, a nearby patient, a trained worker and stopped bleeding", () => {
  const console = prepared();
  expect(executeLine(console, "order ben nurse alex clinic").output).toContain(
    "medically trained",
  );
  expect(executeLine(console, "order casey nurse alex bed").output).toContain(
    "clinical bed",
  );
  actor(console, "alex").location = {
    kind: "ground",
    position: { x: 1, y: 7 },
  };
  expect(
    executeLine(console, "order casey nurse alex clinic").output,
  ).toContain("Position the patient");
  actor(console, "alex").health!.wounds[0]!.bleeding = 0.1;
  expect(
    executeLine(console, "order casey nurse alex clinic").output,
  ).toContain("Stabilize active bleeding");
});

it("paid partial recovery survives cancellation and current-version replay without restoring unsupported agency", () => {
  let console = play(prepared(), ["order casey nurse alex clinic"]);
  for (let tick = 0; tick < 20 && packs(console).amount === 4; tick++)
    console = play(console, ["step"]);
  expect(packs(console).amount).toBe(3);
  const blood = actor(console, "alex").health!.bloodLoss;
  expect(blood).toBeLessThan(100);
  expect(actor(console, "alex").canAct).toBe(false);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(console.session, 20));
  console = play(console, ["cancel casey"]);
  expect(packs(console).amount).toBe(3);
  expect(actor(console, "alex").health!.bloodLoss).toBe(blood);
  console = play(console, ["order casey nurse alex clinic", "step 24"]);
  expect(packs(console).amount).toBe(2);
  expect(actor(console, "alex").canAct).toBe(true);
  expect(actor(console, "alex").health!.wounds[0]!.severity).toBe(10);
});

it("empty supplies block without benefit and queued clinical care prevents a second bed user", () => {
  let console = prepared();
  packs(console).amount = 0;
  console = play(console, ["order casey nurse alex clinic", "step 12"]);
  expect(executeLine(console, "queue casey").output).toContain(
    "Bring clinical-pack",
  );
  expect(actor(console, "alex").health!.bloodLoss).toBe(100);
  packs(console).amount = 1;
  console = play(console, ["step"]);
  expect(executeLine(console, "order ben sleep clinic").output).toContain(
    "occupied",
  );
  expect(packs(console).amount).toBe(0);
});

it("ordinary care does not cure severe wounds or an arbitrary non-health incapacity", () => {
  let console = prepared();
  actor(console, "alex").health!.wounds[0]!.severity = 100;
  console = play(console, ["step", "order casey nurse alex clinic", "step 24"]);
  expect(actor(console, "alex").canAct).toBe(false);
  expect(actor(console, "alex").health!.incapacity).toBe("wounds");
  expect(actor(console, "alex").health!.wounds[0]!.severity).toBe(100);
  console = openConsole();
  actor(console, "alex").canAct = false;
  actor(console, "alex").health!.bloodLoss = 20;
  actor(console, "alex").location = {
    kind: "ground",
    position: { x: 3, y: 1 },
  };
  console = play(console, ["order casey nurse alex clinic", "step 24"]);
  expect(actor(console, "alex").canAct).toBe(false);
});

it("new care orders cannot forge a consumed physical pack", () => {
  const console = prepared();
  const result = executeCommand(
    console.session.state,
    {
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:casey",
      action: {
        kind: "nurse",
        targetId: "site-1:alex",
        bedId: "site-1:clinic",
        workTicks: 16,
        supplyId: "forged",
      },
    },
    materials,
  );
  const nurse = result.state.sites["site-1"]!.entities["site-1:casey"] as Pawn;
  expect(nurse.queue[0]!.action).toEqual({
    kind: "nurse",
    targetId: "site-1:alex",
    bedId: "site-1:clinic",
    workTicks: 0,
  });
});
