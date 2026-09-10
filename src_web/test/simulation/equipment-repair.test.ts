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
const vest = (c: ConsoleState) => home(c).entities["site-1:vest"] as Item;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function prepared() {
  let c = play(openConsole(), [
    "order alex equip vest",
    "finish alex",
    "order alex take parts 2",
    "finish alex",
    "order alex move 6 1",
    "finish alex",
  ]);
  vest(c).integrity = 20;
  return c;
}

it("repairs actual worn armor after injured field return without replenishing intervention charges", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/injured-return.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = play(openConsole(), lines);
  const condition = vest(c).integrity!;
  expect(condition).toBeLessThan(100);
  const tool = home(c).entities["site-1:suppressor"] as Item;
  const charges = tool.equipment!.subdual!.charges;
  c = play(c, [
    "order casey move 5 3",
    "finish casey",
    "order alex take parts 1",
    "finish alex",
    "order alex repair-equipment vest workshop",
    "finish alex",
  ]);
  expect(vest(c).integrity).toBe(Math.min(100, condition + 40));
  expect((home(c).entities[tool.id] as Item).equipment!.subdual!.charges).toBe(
    charges,
  );
  expect(home(c).entities["site-1:parts"]!.amount).toBe(3);
  expect(vest(c).location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
});

it("funded repair replays once and cancelled work retains the spent part without unearned condition", () => {
  let c = play(prepared(), [
    "order alex repair-equipment vest workshop",
    "step",
  ]);
  const parts = Object.values(home(c).entities).find((entity) =>
    entity.id.startsWith("site-1:parts:portion"),
  )!;
  expect(parts.amount).toBe(1);
  expect(vest(c).integrity).toBe(20);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 12)).toEqual(stepSession(c.session, 12));
  c = play(c, [
    "cancel alex",
    "order alex repair-equipment vest workshop",
    "finish alex",
  ]);
  expect(home(c).entities[parts.id]!.amount).toBe(0);
  expect(vest(c).integrity).toBe(60);
});

it("rejects full or incompatible items, blocks missing parts and prevents a second bench commitment", () => {
  let c = prepared();
  expect(
    executeLine(c, "order alex repair-equipment case workshop").output,
  ).toContain("equipment item");
  vest(c).integrity = 100;
  expect(
    executeLine(c, "order alex repair-equipment vest workshop").output,
  ).toContain("full condition");
  vest(c).integrity = 0;
  c = play(c, [
    "order alex deliver @held 1 1",
    "finish alex",
    "order alex move 8 1",
    "finish alex",
    "order alex repair-equipment vest workshop",
    "finish alex",
  ]);
  expect(executeLine(c, "queue alex").output).toContain(
    "Bring maintenance-parts",
  );
  expect(vest(c).integrity).toBe(0);
  c = play(prepared(), ["order alex repair-equipment vest workshop", "step"]);
  home(c).entities["site-1:suppressor"]!.integrity = 50;
  expect(
    executeLine(c, "order ben repair-equipment suppressor workshop").output,
  ).toContain("occupied");
  const ben = home(c).entities["site-1:ben"] as Pawn;
  expect(ben.queue).toEqual([]);
});
