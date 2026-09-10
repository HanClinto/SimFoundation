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

const person = (c: ConsoleState, name = "alex") =>
  c.session.state.sites["site-1"]!.entities[`site-1:${name}`] as Pawn;
const packs = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:wound-packs"]!;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function casualty() {
  let c = openConsole();
  person(c).location = { kind: "ground", position: { x: 3, y: 1 } };
  person(c).health = {
    wounds: [{ id: "retained-injury", severity: 120, bleeding: 0 }],
    bloodLoss: 10,
  };
  c = play(c, ["step"]);
  return c;
}

it("plays actual intervention injury, stabilization and separately funded wound/blood courses", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/injured-return.txt",
      import.meta.url,
    ),
    "utf8",
  );
  const c = play(openConsole(), transcript.split(/\r?\n/));
  expect(person(c).health!.wounds.length).toBeGreaterThan(0);
  expect(person(c).health!.wounds.every((wound) => wound.bleeding === 0)).toBe(
    true,
  );
  const receipts = person(c).health!.wounds.flatMap(
    (wound) => wound.recovery ?? [],
  );
  expect(receipts.length).toBeGreaterThan(0);
  expect(
    receipts.every(
      (record) =>
        record.actorId === "site-1:casey" &&
        record.supplyId === "site-1:wound-packs",
    ),
  ).toBe(true);
  expect(packs(c).amount).toBe(2);
  expect(person(c).canAct).toBe(true);
  expect(person(c).health!.death).toBeUndefined();
});

it("explicit wound course clears only supported wound incapacity and retains dated original injury", () => {
  let c = casualty();
  expect(person(c).canAct).toBe(false);
  c = play(c, ["order casey nurse alex clinic wounds", "finish casey"]);
  expect(person(c).canAct).toBe(true);
  expect(person(c).health!.wounds[0]).toMatchObject({
    id: "retained-injury",
    severity: 80,
    bleeding: 0,
    recovery: [
      {
        actorId: "site-1:casey",
        supplyId: "site-1:wound-packs",
        reduction: 40,
      },
    ],
  });
  expect(person(c).health!.bloodLoss).toBe(10);
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:clinical-packs"]!.amount,
  ).toBe(4);
});

it("partial care and consumed packs persist through interruption and reload without replaying receipts twice", () => {
  let c = play(casualty(), ["order casey nurse alex clinic wounds"]);
  while (packs(c).amount === 3) c = play(c, ["step"]);
  const severity = person(c).health!.wounds[0]!.severity;
  expect(person(c).canAct).toBe(false);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(c.session, 20));
  c = play(c, ["cancel casey"]);
  expect(packs(c).amount).toBe(2);
  expect(person(c).health!.wounds[0]!.severity).toBe(severity);
  c = play(c, ["order casey nurse alex clinic wounds", "finish casey"]);
  expect(packs(c).amount).toBe(1);
  expect(person(c).health!.wounds[0]!.recovery).toHaveLength(2);
  expect(person(c).health!.wounds[0]!.severity).toBe(severity - 40);
});

it("does not let wound care restore brain trauma, death, arbitrary incapacity or unsupported field-bed courses", () => {
  let c = casualty();
  person(c).health!.organs = { brain: { trauma: 100 } };
  c = play(c, ["order casey nurse alex clinic wounds", "finish casey"]);
  expect(person(c).canAct).toBe(false);
  expect(person(c).health!.organs!.brain!.trauma).toBe(100);
  person(c).health!.death = {
    tick: c.session.state.tick,
    cause: "critical-trauma",
  };
  expect(
    executeLine(c, "order casey nurse alex clinic wounds").output,
  ).toContain("dead");
  c = casualty();
  person(c).health!.wounds[0]!.severity = 10;
  delete person(c).health!.incapacity;
  c = play(c, ["order casey nurse alex clinic wounds", "finish casey"]);
  expect(person(c).canAct).toBe(false);
  expect(() => executeLine(c, "order casey nurse alex clinic miracle")).toThrow(
    "wounds",
  );
});

it("new bleeding and absent physical packs prevent further benefit", () => {
  let c = casualty();
  packs(c).amount = 0;
  c = play(c, ["order casey nurse alex clinic wounds", "finish casey"]);
  expect(executeLine(c, "queue casey").output).toContain("wound-care-pack");
  expect(person(c).health!.wounds[0]!.severity).toBe(120);
  packs(c).amount = 1;
  c = play(c, ["step"]);
  const severity = person(c).health!.wounds[0]!.severity;
  person(c).health!.wounds[0]!.bleeding = 1;
  c = play(c, ["step 3"]);
  expect(person(c).health!.wounds[0]!.severity).toBe(severity);
  expect(packs(c).amount).toBe(0);
  expect(executeLine(c, "queue casey").output).toContain("Stabilize");
});

it("completing medical care does not bypass a still-active independent subdual interval", () => {
  let c = casualty();
  const expiry = c.session.state.tick + 80;
  person(c).health!.subdual = {
    untilTick: expiry,
    actorId: "test-intervention",
  };
  c = play(c, ["order casey nurse alex clinic wounds", "finish casey"]);
  expect(person(c).health!.wounds[0]!.severity).toBe(80);
  expect(person(c).canAct).toBe(false);
  expect(person(c).health!.incapacity).toBe("subdued");
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, expiry - c.session.state.tick)).toEqual(
    stepSession(c.session, expiry - c.session.state.tick),
  );
  c = play(c, [`step ${expiry - c.session.state.tick}`]);
  expect(person(c).canAct).toBe(true);
});
