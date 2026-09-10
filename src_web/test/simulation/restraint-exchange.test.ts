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
import type { Item } from "../../src/simulation/core/entity/Item";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
const home = (c: ConsoleState) => c.session.state.sites["site-1"]!;
const oldBand = (c: ConsoleState) =>
  home(c).entities["site-1:restraint"] as Item;
const spare = (c: ConsoleState) =>
  home(c).entities["site-1:spare-restraint"] as Item;
const subject = (c: ConsoleState) =>
  home(c).entities["site-13:specimen"] as Pawn;
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
  const end = lines.indexOf("order alex unrestrain specimen");
  return play(openConsole(), lines.slice(0, end));
}
it("exchanges physical bands through secure containment without restoring the old band's condition", () => {
  let c = held();
  oldBand(c).integrity = 18;
  c = play(c, [
    "order alex take spare-restraint",
    "finish alex",
    "order alex restrain specimen @held",
    "finish alex",
  ]);
  expect(oldBand(c).integrity).toBe(18);
  expect(oldBand(c).restraint!.attached).toBe(false);
  expect(oldBand(c).location.kind).toBe("ground");
  expect(spare(c).restraint!.attached).toBe(true);
  expect(spare(c).location).toEqual({
    kind: "carried",
    carrierId: subject(c).id,
  });
  expect(spare(c).integrity).toBe(200);
  expect(subject(c).acceptsEscort).toBe(false);
});
it("cancelled funded positioning never releases the original band and replay completes exactly one exchange", () => {
  let c = held();
  oldBand(c).integrity = 18;
  c = play(c, [
    "order alex take spare-restraint",
    "finish alex",
    "order alex restrain specimen @held",
  ]);
  for (let tick = 0; tick < 40; tick++) {
    c = play(c, ["step"]);
    const actor = home(c).entities["site-1:alex"] as Pawn;
    if (
      actor.queue[0]?.action.kind === "restrain" &&
      actor.queue[0].action.workTicks === 1
    )
      break;
  }
  expect(oldBand(c).restraint!.attached).toBe(true);
  expect(spare(c).restraint!.attached).toBe(false);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 4)).toEqual(stepSession(c.session, 4));
  c = play(c, ["cancel alex"]);
  expect(oldBand(c).restraint!.attached).toBe(true);
  expect(spare(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
});
