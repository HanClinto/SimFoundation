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

function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
  }
  return c;
}
function returned() {
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
  c = play(c, [
    "assign ben holding",
    "prepare support alex",
    "finish alex",
    "send support alex",
    "finish alex",
    "site support",
    "order alex take library",
    "finish alex",
    "prepare home alex",
    "finish alex",
    "send home alex",
    "finish alex",
    "site home",
    "order alex deliver @held 6 8",
    "finish alex",
  ]);
  return c;
}
it("transports one real support bookshelf and enables ordinary home reading without spending the other cache stock", () => {
  let c = returned();
  const depotId = c.session.campaign!.siteIds.support!;
  const home = c.session.state.sites["site-1"]!;
  const depot = c.session.state.sites[depotId]!;
  expect(home.entities[`${depotId}:library`]).toMatchObject({
    kind: "facility",
    definitionId: "bookshelf",
    amount: 1,
    location: { kind: "ground", position: { x: 6, y: 8 } },
  });
  expect(depot.entities[`${depotId}:library`]).toBeUndefined();
  expect(depot.entities[`${depotId}:power`]!.amount).toBe(3);
  expect(depot.entities[`${depotId}:medical`]!.amount).toBe(2);
  const before = (home.entities["site-1:ben"] as Pawn).needs.curiosity!.value;
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 40)).toEqual(stepSession(c.session, 40));
  c = play(c, ["step 40"]);
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn).needs
      .curiosity!.value,
  ).toBeLessThan(before);
  expect(c.session.events).toContainEqual(
    expect.objectContaining({
      entityId: "site-1:ben",
      actionKind: "read",
      kind: "completed",
      targetId: `${depotId}:library`,
    }),
  );
});
it("returned furniture has real exclusive work rather than an inert cargo bonus", () => {
  let c = returned();
  c = play(c, [
    "assign ben none",
    "autonomy ben off",
    "finish ben",
    "order ben read library",
  ]);
  for (let i = 0; i < 40; i++) {
    c = play(c, ["step"]);
    const current = (
      c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn
    ).queue[0]?.action;
    if (current?.kind === "read" && current.workTicks === 1) break;
  }
  const before = (
    c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn
  ).needs.curiosity!.value;
  expect(executeLine(c, "order alex take library").output).toContain(
    "occupied",
  );
  c = play(c, ["cancel ben"]);
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn).needs
      .curiosity!.value,
  ).toBe(before);
  c = play(c, ["order alex take library", "finish alex"]);
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn).needs
      .curiosity!.value,
  ).toBeGreaterThanOrEqual(before);
  const depotId = c.session.campaign!.siteIds.support!;
  expect(
    c.session.state.sites["site-1"]!.entities[`${depotId}:library`]!.location,
  ).toEqual({ kind: "carried", carrierId: "site-1:alex" });
});
