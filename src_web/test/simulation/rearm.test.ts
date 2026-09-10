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
import { executeCommand } from "../../src/simulation/core/ControlPolicy";
import { materials } from "../../src/simulation/catalog";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
const tool = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:suppressor"] as Item;
const stock = (c: ConsoleState) =>
  c.session.state.sites["site-1"]!.entities["site-1:suppression-units"]!;
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function ready() {
  const c = play(openConsole(), [
    "order alex equip suppressor",
    "finish alex",
    "order alex move 1 3",
    "finish alex",
  ]);
  tool(c).equipment!.subdual!.charges = 0;
  return c;
}
it("physically rearms the same depleted tool after a full containment/breach/recovery loop", () => {
  const transcript = fs.readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/containment-cycle.txt",
      import.meta.url,
    ),
    "utf8",
  );
  let c = play(openConsole(), transcript.split(/\r?\n/));
  expect(tool(c).equipment!.subdual!.charges).toBe(0);
  c = play(c, [
    "order alex move 1 3",
    "finish alex",
    "order alex rearm suppressor",
    "finish alex",
  ]);
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
  expect(stock(c).amount).toBe(2);
  expect(tool(c).id).toBe("site-1:suppressor");
});
it("cancellation and saved funded work conserve units without granting an early charge", () => {
  let c = play(ready(), ["order alex rearm suppressor", "step"]);
  expect(stock(c).amount).toBe(2);
  expect(tool(c).equipment!.subdual!.charges).toBe(0);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 6)).toEqual(stepSession(c.session, 6));
  c = play(c, ["cancel alex", "order alex rearm suppressor", "finish alex"]);
  expect(stock(c).amount).toBe(1);
  expect(tool(c).equipment!.subdual!.charges).toBe(1);
});
it("rejects full, broken and unworn gear and visibly blocks absent resupply", () => {
  let c = ready();
  tool(c).equipment!.subdual!.charges = 2;
  expect(executeLine(c, "order alex rearm suppressor").output).toContain(
    "capacity",
  );
  tool(c).equipment!.subdual!.charges = 0;
  tool(c).integrity = 0;
  expect(executeLine(c, "order alex rearm suppressor").output).toContain(
    "serviceable",
  );
  tool(c).integrity = 100;
  stock(c).amount = 0;
  c = play(c, ["order alex rearm suppressor", "finish alex"]);
  expect(executeLine(c, "queue alex").output).toContain(
    "physical suppression-unit",
  );
  expect(tool(c).equipment!.subdual!.charges).toBe(0);
});
it("new commands cannot forge a spent unit or completed rearming progress", () => {
  const c = ready();
  const result = executeCommand(
    c.session.state,
    {
      kind: "enqueue",
      siteId: "site-1",
      entityId: "site-1:alex",
      action: {
        kind: "rearm",
        targetId: tool(c).id,
        workTicks: 6,
        supplyId: "forged",
      },
    },
    materials,
  );
  const actor = result.state.sites["site-1"]!.entities["site-1:alex"] as Pawn;
  expect(actor.queue[0]!.action).toEqual({
    kind: "rearm",
    targetId: tool(c).id,
    workTicks: 0,
  });
});
