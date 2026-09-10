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

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function exposed() {
  return play(openConsole(), [
    "order alex equip vest",
    "finish alex",
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "finish alex",
    "site intervention",
    "order alex move 4 3",
    "finish alex",
  ]);
}
it("actual authored impacts change an existing need once per wound and preserve deterministic replay", () => {
  let c = exposed();
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 12)).toEqual(stepSession(c.session, 12));
  c = play(c, ["step 12"]);
  const actor = c.session.state.sites["site-13"]!.entities[
    "site-1:alex"
  ] as Pawn;
  expect(actor.health!.wounds.length).toBeGreaterThan(0);
  expect(actor.needs.stress!.value).toBe(
    Math.min(100, 5 + actor.health!.wounds.length * 10),
  );
});
it("an impact never creates a need absent from the target and unconfigured trial attacks keep their behavior", () => {
  let c = exposed();
  delete (c.session.state.sites["site-13"]!.entities["site-1:alex"] as Pawn)
    .needs.stress;
  c = play(c, ["step 12"]);
  expect(
    (c.session.state.sites["site-13"]!.entities["site-1:alex"] as Pawn).needs
      .stress,
  ).toBeUndefined();
  c = exposed();
  const armor = c.session.state.sites["site-13"]!.entities[
    "site-1:vest"
  ] as Item;
  armor.equipment!.armor!.reduction = 100;
  c = play(c, ["step 12"]);
  const protectedActor = c.session.state.sites["site-13"]!.entities[
    "site-1:alex"
  ] as Pawn;
  expect(protectedActor.health!.wounds).toEqual([]);
  expect(protectedActor.needs.stress!.value).toBe(5);
  const trial = openConsole("response");
  for (const site of Object.values(trial.session.state.sites))
    for (const entity of Object.values(site.entities))
      if (entity.kind === "pawn")
        expect(entity.response?.attack?.needChanges).toBeUndefined();
});
it("existing critical relaxation relieves highly stressed duty staff without a new treatment or resource grant", () => {
  let c = openConsole();
  const actor = c.session.state.sites["site-1"]!.entities[
    "site-1:alex"
  ] as Pawn;
  actor.needs.stress!.value = 90;
  c = play(c, ["assign alex holding", "step"]);
  expect(
    (c.session.state.sites["site-1"]!.entities[actor.id] as Pawn).queue[0]!
      .action.kind,
  ).toBe("relax");
  c = play(c, ["step 35"]);
  expect(
    (c.session.state.sites["site-1"]!.entities[actor.id] as Pawn).needs.stress!
      .value,
  ).toBeLessThan(50);
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:parts"]!.amount,
  ).toBe(4);
});
