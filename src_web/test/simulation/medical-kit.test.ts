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
import type { Item } from "../../src/simulation/core/entity/Item";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { chooseConcern } from "../../src/simulation/core/entity/pawn/concerns/Concerns";
import { materials } from "../../src/simulation/catalog";

const home = (c: ConsoleState) => c.session.state.sites["site-1"]!;
const kit = (c: ConsoleState) => home(c).entities["site-1:medical-kit"] as Item;
const medic = (c: ConsoleState) => home(c).entities["site-1:casey"] as Pawn;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function patient(c: ConsoleState) {
  const alex = home(c).entities["site-1:alex"] as Pawn;
  alex.health!.wounds = [{ id: "bleed", severity: 10, bleeding: 0.1 }];
  return alex;
}
it("actual worn kit funds trained stabilization without copying supplies into the pawn", () => {
  let c = play(openConsole(), [
    "order casey equip medical-kit",
    "finish casey",
  ]);
  patient(c);
  c = play(c, ["order casey treat alex", "finish casey"]);
  expect(kit(c).equipment!.medicine!.supplies).toBe(2);
  expect(medic(c).response!.medicine!.supplies).toBe(2);
  expect(
    (home(c).entities["site-1:alex"] as Pawn).health!.wounds[0]!.bleeding,
  ).toBe(0);
  expect(kit(c).location).toEqual({ kind: "carried", carrierId: medic(c).id });
});
it("empty or broken worn kit does not silently use innate supplies, and untrained wearers cannot treat", () => {
  let c = play(openConsole(), [
    "order casey equip medical-kit",
    "finish casey",
  ]);
  patient(c);
  kit(c).equipment!.medicine!.supplies = 0;
  expect(executeLine(c, "order casey treat alex").output).toContain(
    "Medical supplies",
  );
  expect(
    chooseConcern({
      site: home(c),
      pawn: medic(c),
      tick: c.session.state.tick,
      materials,
      events: [],
    }),
  ).toBeNull();
  kit(c).equipment!.medicine!.supplies = 2;
  kit(c).integrity = 0;
  expect(executeLine(c, "order casey treat alex").output).toContain(
    "Medical supplies",
  );
  c = play(openConsole(), ["order ben equip medical-kit", "finish ben"]);
  patient(c);
  expect(executeLine(c, "order ben treat alex").output).toContain("training");
});
it("uses the same paid physical rearm with cancellation and current-version replay", () => {
  let c = play(openConsole(), [
    "order casey equip medical-kit",
    "finish casey",
    "order casey move 5 2",
    "finish casey",
  ]);
  kit(c).equipment!.medicine!.supplies = 0;
  c = play(c, ["order casey rearm medical-kit", "step"]);
  expect(home(c).entities["site-1:field-medical-units"]!.amount).toBe(2);
  expect(kit(c).equipment!.medicine!.supplies).toBe(0);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 6)).toEqual(stepSession(c.session, 6));
  c = play(c, [
    "cancel casey",
    "order casey rearm medical-kit",
    "finish casey",
  ]);
  expect(home(c).entities["site-1:field-medical-units"]!.amount).toBe(1);
  expect(kit(c).equipment!.medicine!.supplies).toBe(1);
  expect(medic(c).response!.medicine!.supplies).toBe(2);
});
it("kit competes for the actual tool slot and travels as one unchanged record", () => {
  let c = play(openConsole(), [
    "order casey equip medical-kit",
    "finish casey",
  ]);
  expect(executeLine(c, "order casey equip suppressor").output).toContain(
    "occupied slot",
  );
  c = play(c, ["prepare care casey", "finish casey", "send care casey"]);
  const transfer = Object.values(c.session.state.transfers)[0]!;
  expect(transfer.entities["site-1:medical-kit"]).toBeDefined();
  c = play(c, [
    "step 8",
    "site care",
    "order casey treat mira",
    "finish casey",
  ]);
  const arrivedKit = c.session.state.sites["site-5"]!.entities[
    "site-1:medical-kit"
  ] as Item;
  expect(arrivedKit.equipment!.medicine!.supplies).toBe(2);
});
