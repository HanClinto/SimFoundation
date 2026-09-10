import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

function sent() {
  let c = openConsole();
  for (const line of [
    "prepare gallery alex",
    "finish alex",
    "send gallery alex",
  ])
    c = executeLine(c, line).console;
  return c;
}
it("waits for actual transport admission without a guessed travel duration or remote orders", () => {
  const c = sent();
  const result = executeLine(c, "finish @1");
  expect(result.output).toContain(
    "Advanced 6 ticks. Watched commitments finished.",
  );
  expect(result.output).toContain("alex at site-3:");
  expect(result.console.siteId).toBe("site-1");
  expect(result.console.session.state.transfers).toEqual({});
  expect(() => executeLine(result.console, "order @1 wait 2")).toThrow(
    "Unknown entity",
  );
});
it("reports a blocked arrival and does not wait through the full bound", () => {
  const c = sent();
  c.session.state.sites["site-3"]!.entities["site-3:exhibit"]!.location = {
    kind: "ground",
    position: { x: 2, y: 3 },
  };
  const result = executeLine(c, "finish @1");
  expect(result.output).toContain("Blocked arrival transfer-1");
  expect(result.output).toContain("alex at transfer-1:");
  expect(result.console.session.state.tick - c.session.state.tick).toBe(6);
});
it("stops for a travelling casualty notice and preserves identical saved continuation", () => {
  const c = sent();
  const transfer = Object.values(c.session.state.transfers)[0]!;
  const actor = transfer.entities["site-1:alex"] as Pawn;
  actor.health = {
    wounds: [{ id: "critical", severity: 150, bleeding: 0 }],
    bloodLoss: 0,
    mortality: { criticalTicks: 0, fatalAfterTicks: 4 },
  };
  const restored: ConsoleState = {
    ...c,
    session: restoreSession(JSON.stringify(c.session))!,
  };
  const result = executeLine(c, "finish @1");
  expect(result.output).toContain("warning:");
  expect(result.console.session.state.tick - c.session.state.tick).toBe(1);
  expect(executeLine(restored, "finish @1")).toEqual(result);
});
it("can wait for existing local work and transit together without capturing future autonomy", () => {
  let c = sent();
  c = executeLine(c, "order casey wait 10").console;
  const result = executeLine(c, "finish @1 casey");
  expect(result.output).toContain("Advanced 10 ticks.");
  expect(result.console.session.state.transfers).toEqual({});
  expect(
    (
      result.console.session.state.sites["site-1"]!.entities[
        "site-1:casey"
      ] as Pawn
    ).queue,
  ).toEqual([]);
});
