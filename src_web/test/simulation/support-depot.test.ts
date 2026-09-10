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
import type { Facility } from "../../src/simulation/core/entity/Facility";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { serviceDeadline } from "../../src/simulation/core/entity/Service";
function play(c: ConsoleState, lines: readonly string[]) {
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  return c;
}
function reviewed() {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/containment-cycle.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  return play(openConsole(), lines.slice(0, lines.indexOf("inspect holding")));
}
it("a controlled physical finding opens finite real logistics, not an immediate inventory reward", () => {
  const initial = openConsole();
  const before = JSON.stringify(initial);
  expect(() => executeLine(initial, "prepare support alex")).toThrow(
    "Home study required",
  );
  expect(() => executeLine(initial, "reserve support devon")).toThrow(
    "Home study required",
  );
  expect(JSON.stringify(initial)).toBe(before);
  let c = reviewed();
  c = play(c, [
    "assign ben holding",
    "prepare support alex casey",
    "finish alex casey",
    "send support alex casey",
    "step 8",
    "site support",
    "order alex take power",
    "order casey take suppression",
    "finish alex casey",
    "prepare home alex casey",
    "finish alex casey",
    "send home alex casey",
  ]);
  const restored = restoreSession(JSON.stringify(c.session))!;
  expect(stepSession(restored, 8)).toEqual(stepSession(c.session, 8));
  c = play(c, [
    "step 8",
    "site home",
    "order alex deliver @held 14 8",
    "order casey deliver @held 1 2",
    "finish alex casey",
  ]);
  const depotId = c.session.campaign!.siteIds.support!;
  const depot = c.session.state.sites[depotId]!;
  const home = c.session.state.sites["site-1"]!;
  expect(home.entities[`${depotId}:power`]!.amount).toBe(3);
  expect(home.entities[`${depotId}:suppression`]!.amount).toBe(2);
  expect(depot.entities[`${depotId}:power`]).toBeUndefined();
  expect(depot.entities[`${depotId}:medical`]!.amount).toBe(2);
  expect(depot.entities[`${depotId}:spares`]!.amount).toBe(2);
  // Consume the returned source through the ordinary identity-ordered service selection.
  const cell = home.entities["site-1:holding"] as Facility;
  const deadline = serviceDeadline(cell.service!)!;
  c = play(c, [
    `step ${Math.max(0, deadline - 40 - c.session.state.tick)}`,
    "step 40",
  ]);
  expect(
    c.session.state.sites["site-1"]!.entities[`${depotId}:power`]!.amount,
  ).toBe(2);
  const liveCell = c.session.state.sites["site-1"]!.entities[
    cell.id
  ] as Facility;
  expect(liveCell.service!.history.at(-1)!.supplyId).toBe(`${depotId}:power`);
  expect(
    (c.session.state.sites["site-1"]!.entities["site-1:ben"] as Pawn)
      .serviceDuty,
  ).toBe(cell.id);
});
