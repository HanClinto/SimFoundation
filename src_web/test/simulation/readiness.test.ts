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

const actor = (console: ConsoleState) =>
  console.session.state.sites[console.siteId]!.entities["site-1:alex"] as Pawn;

function play(console: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(console, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    console = result.console;
  }
  return console;
}

it("requires real rest for an exhausted outbound crew and preserves the original state on refusal", () => {
  let console = play(openConsole(), ["step 400"]);
  const before = JSON.stringify(console);
  expect(() => executeLine(console, "prepare gallery alex")).toThrow(
    "fatigue 90.0",
  );
  expect(JSON.stringify(console)).toBe(before);
  expect(executeLine(console, "status").output).toContain(
    "autonomy off | idle",
  );
  expect(executeLine(console, "status").output).toContain("Enable autonomy");
  console = play(console, ["order alex sleep bed", "step 24"]);
  expect(actor(console).needs.fatigue!.value).toBeLessThan(85);
  console = play(console, [
    "prepare gallery alex",
    "step 12",
    "send gallery alex",
  ]);
  expect(Object.keys(console.session.state.transfers)).toHaveLength(1);
});

it("rechecks readiness at send but never blocks an exhausted return", () => {
  let console = play(openConsole(), [
    "prepare gallery alex",
    "step 12",
    "send gallery alex",
    "step 6",
    "site gallery",
    "step 400",
    "send home alex",
    "step 6",
    "site home",
  ]);
  expect(actor(console).needs.fatigue!.value).toBeGreaterThanOrEqual(85);
  expect(() => executeLine(console, "send gallery alex")).toThrow("not ready");
  expect(console.session.state.transfers).toEqual({});
  console = play(openConsole(), ["prepare gallery alex", "step 400"]);
  const before = JSON.stringify(console);
  expect(() => executeLine(console, "send gallery alex")).toThrow("not ready");
  expect(JSON.stringify(console)).toBe(before);
});

it("ordinary home autonomy restores readiness using finite food and a bed across reload", () => {
  let console = play(openConsole(), ["step 700", "autonomy alex on"]);
  const restored = restoreSession(JSON.stringify(console.session))!;
  expect(stepSession(restored, 50)).toEqual(stepSession(console.session, 50));
  console = play(console, ["step 50"]);
  expect(actor(console).needs.hunger!.value).toBeLessThan(85);
  expect(actor(console).needs.fatigue!.value).toBeLessThan(85);
  expect(
    console.session.state.sites["site-1"]!.entities["site-1:meals"]!.amount,
  ).toBeLessThan(8);
  console = play(console, ["autonomy alex off"]);
  if (actor(console).queue.length) console = play(console, ["cancel alex"]);
  console = play(console, [
    "prepare gallery alex",
    "step 12",
    "send gallery alex",
  ]);
  expect(Object.keys(console.session.state.transfers)).toHaveLength(1);
});
