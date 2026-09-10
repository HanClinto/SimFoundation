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
import type { Door } from "../../src/simulation/core/entity/Door";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function yard() {
  return play(openConsole(), [
    "prepare intervention alex",
    "finish alex",
    "send intervention alex",
    "finish alex",
    "site intervention",
  ]);
}
const gate = (c: ConsoleState) =>
  c.session.state.sites["site-13"]!.entities["site-13:gate"] as Door;
it("physical local closure isolates the loading side without capturing or moving the original subject", () => {
  let c = yard();
  c = play(c, ["order alex door gate closed", "finish alex"]);
  expect(gate(c)).toMatchObject({ open: false, policy: "held-closed" });
  const before =
    c.session.state.sites["site-13"]!.entities["site-13:specimen"]!;
  c = play(c, ["step 30"]);
  expect(
    (c.session.state.sites["site-13"]!.entities["site-1:alex"] as Pawn).health!
      .wounds,
  ).toEqual([]);
  expect(c.session.state.sites["site-13"]!.entities[before.id]).toMatchObject({
    requiresRestraint: true,
    acceptsEscort: false,
    location: { kind: "ground" },
  });
});
it("refuses to close on a body or worker in the doorway and can restore automatic policy physically", () => {
  let c = yard();
  const site = c.session.state.sites["site-13"]!;
  const subject = site.entities["site-13:specimen"] as Pawn;
  subject.location = { kind: "ground", position: { x: 5, y: 3 } };
  subject.canAct = false;
  subject.autonomy = false;
  c = play(c, ["order alex door gate closed", "finish alex"]);
  expect(executeLine(c, "queue alex").output).toContain("Clear the doorway");
  expect(gate(c).open).toBe(true);
  c.session.state.sites["site-13"]!.entities[subject.id]!.location = {
    kind: "ground",
    position: { x: 8, y: 3 },
  };
  c = play(c, ["finish alex", "order alex door gate automatic", "finish alex"]);
  expect(gate(c).policy).toBe("automatic");
});
it("replays unfinished physical controls, and cancelled approach leaves policy unchanged", () => {
  let c = play(yard(), ["order alex door gate closed", "step"]);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 10)).toEqual(stepSession(c.session, 10));
  c = play(c, ["cancel alex"]);
  expect(gate(c)).toMatchObject({ open: true, policy: "held-open" });
  expect(() => executeLine(c, "order alex door gate teleport")).toThrow(
    "open, closed or automatic",
  );
  gate(c).integrity = 0;
  expect(executeLine(c, "order alex door gate closed").output).toContain(
    "usable installed door",
  );
});
it("setting door policy never grants remote control from home", () => {
  expect(() =>
    executeLine(openConsole(), "order alex door site-13:gate closed"),
  ).toThrow("Unknown entity");
});
