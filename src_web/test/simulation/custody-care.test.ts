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
import type { Facility } from "../../src/simulation/core/entity/Facility";

const home = (c: ConsoleState) => c.session.state.sites["site-1"]!;
const subject = (c: ConsoleState) =>
  home(c).entities["site-13:specimen"] as Pawn;
const band = (c: ConsoleState) => home(c).entities["site-1:restraint"] as Item;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function held() {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/containment-cycle.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = play(openConsole(), lines.slice(0, lines.indexOf("inspect holding")));
  c = play(c, ["order alex take restraint", "finish alex"]);
  const remaining =
    (subject(c).health!.subdual?.untilTick ?? c.session.state.tick) -
    c.session.state.tick;
  c = play(c, [`step ${Math.max(0, remaining + 1)}`]);
  return c;
}
function extracted() {
  return play(held(), [
    "order alex restrain specimen @held",
    "finish alex",
    "order alex deliver specimen 3 1",
    "finish alex",
  ]);
}

it("re-restrains an awake contained subject and extracts it without inducing a breach or consent", () => {
  let c = held();
  expect(subject(c).canAct).toBe(true);
  expect(executeLine(c, "order alex take specimen").output).toContain(
    "cannot be picked up",
  );
  c = play(c, [
    "order alex restrain specimen @held",
    "finish alex",
    "order alex take specimen",
    "finish alex",
  ]);
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
  expect(subject(c).acceptsEscort).toBe(false);
  expect(band(c).location).toEqual({
    kind: "carried",
    carrierId: subject(c).id,
  });
  expect(c.session.events.some((event) => event.kind === "breached")).toBe(
    false,
  );
});

it("explicit secured medical care preserves hostile identity, real injuries and supply receipts through replay", () => {
  let c = extracted();
  subject(c).health!.wounds = [
    { id: "retained-trauma", severity: 20, bleeding: 0.5 },
  ];
  subject(c).health!.bloodLoss = 30;
  c = play(c, [
    "order casey treat specimen",
    "finish casey",
    "order casey nurse specimen clinic wounds",
    "step",
  ]);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 20)).toEqual(stepSession(c.session, 20));
  c = play(c, [
    "finish casey",
    "order casey nurse specimen clinic",
    "finish casey",
  ]);
  expect(subject(c).health!.wounds[0]).toMatchObject({
    id: "retained-trauma",
    severity: 0,
    bleeding: 0,
  });
  expect(subject(c).acceptsEscort).toBe(false);
  expect(subject(c).response!.faction).toBe("hostile");
  expect(home(c).entities["site-1:wound-packs"]!.amount).toBe(2);
  expect(home(c).entities["site-1:clinical-packs"]!.amount).toBe(3);
});

it("restraint loss ends safe care without refunding a funded course", () => {
  let c = extracted();
  subject(c).health!.bloodLoss = 30;
  c = play(c, ["order casey nurse specimen clinic"]);
  for (
    let tick = 0;
    tick < 20 && home(c).entities["site-1:clinical-packs"]!.amount === 4;
    tick++
  )
    c = play(c, ["step"]);
  const blood = subject(c).health!.bloodLoss;
  band(c).integrity = 0;
  c = play(c, ["step"]);
  expect(executeLine(c, "queue casey").output).toContain("effectively secured");
  expect(subject(c).health!.bloodLoss).toBe(blood);
  expect(home(c).entities["site-1:clinical-packs"]!.amount).toBe(3);
});

it("recovers a retained body from containment without reviving or losing its possessions", () => {
  let c = held();
  // Put the loose band down to make room for the body.
  c = play(c, ["order alex drop @held", "finish alex"]);
  subject(c).health!.death = {
    tick: c.session.state.tick,
    cause: "critical-trauma",
  };
  subject(c).canAct = false;
  c = play(c, ["order alex deliver specimen 1 1", "finish alex"]);
  expect(subject(c).location).toEqual({
    kind: "ground",
    position: { x: 1, y: 1 },
  });
  expect(subject(c).health!.death).toBeDefined();
  expect(
    (home(c).entities["site-1:holding"] as Facility).containment,
  ).toBeDefined();
});

it("plays actual controlled medical transfer and recontainment without a forced breach", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/secured-care.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  const c = play(openConsole(), lines);
  expect(subject(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:holding",
  });
  expect(subject(c).health!.wounds[0]).toMatchObject({
    id: "prior-lesion",
    severity: 0,
  });
  expect(subject(c).health!.bloodLoss).toBe(0);
  expect(subject(c).acceptsEscort).toBe(false);
  expect(c.session.events.some((event) => event.kind === "breached")).toBe(
    false,
  );
  expect(home(c).entities["site-1:wound-packs"]!.amount).toBe(2);
  expect(home(c).entities["site-1:clinical-packs"]!.amount).toBe(3);
});
