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

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
it("physically hands the actual collected portion to a teammate without changing its amount or identity", () => {
  let c = play(openConsole(), [
    "order alex take meals 2",
    "finish alex",
    "order casey move 12 8",
    "finish casey",
    "order alex give @held casey",
    "step",
  ]);
  const portionId = Object.keys(c.session.state.sites["site-1"]!.entities).find(
    (id) => id.startsWith("site-1:meals:portion"),
  )!;
  expect(
    c.session.state.sites["site-1"]!.entities[portionId]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:alex" });
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 25)).toEqual(stepSession(c.session, 25));
  c = play(c, ["finish alex"]);
  expect(c.session.state.sites["site-1"]!.entities[portionId]).toMatchObject({
    amount: 2,
    location: { kind: "carried", carrierId: "site-1:casey" },
  });
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBe(6);
});
it("handoffs a casualty with worn belongings as one unchanged ownership tree", () => {
  let c = play(openConsole(), ["order alex equip vest", "finish alex"]);
  const home = c.session.state.sites["site-1"]!;
  (home.entities["site-1:alex"] as Pawn).canAct = false;
  c = play(c, [
    "order casey take alex",
    "finish casey",
    "order casey give @held ben",
    "finish casey",
  ]);
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:alex"]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:ben" });
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:vest"]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:alex" });
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:alex"] as Pawn).canAct,
  ).toBe(false);
});
it("refuses a full or unavailable recipient and never gives worn equipment as loose cargo", () => {
  let c = play(openConsole(), [
    "order alex equip suppressor",
    "finish alex",
    "order alex take meals 2",
    "finish alex",
    "order casey take parts 1",
    "finish casey",
  ]);
  expect(executeLine(c, "order alex give @held casey").output).toContain(
    "already has ordinary cargo",
  );
  expect(executeLine(c, "order alex give suppressor ben").output).toContain(
    "not worn gear",
  );
  (c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn).canAct =
    false;
  expect(executeLine(c, "order alex give @held ben").output).toContain(
    "available",
  );
});
it("cancellation or disappearing recipient leaves the original cargo owner intact", () => {
  let c = play(openConsole(), [
    "order alex take parts 1",
    "finish alex",
    "order casey move 12 8",
    "finish casey",
    "order alex give @held casey",
    "step",
    "cancel alex",
  ]);
  const id = Object.keys(c.session.state.sites["site-1"]!.entities).find((id) =>
    id.startsWith("site-1:parts:portion"),
  )!;
  expect(c.session.state.sites["site-1"]!.entities[id]!.location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
  c = play(c, ["order alex give @held casey"]);
  delete c.session.state.sites["site-1"]!.entities["site-1:casey"];
  const result = executeLine(c, "finish alex");
  expect(result.output).toContain("receiving teammate is no longer");
  expect(
    result.console.session.state.sites["site-1"]!.entities[id]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:alex" });
});
