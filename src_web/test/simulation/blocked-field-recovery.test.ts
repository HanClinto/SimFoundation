import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

it("reaches a hostile-occupied extraction area with finite reserve landing and actual recovered equipment", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/blocked-field-recovery.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  let observedBlock = false;
  for (const line of lines) {
    if (line === "reserve intervention devon") {
      const yard = c.session.state.sites["site-13"]!;
      expect(yard.entities["site-13:specimen"]!.location).toEqual({
        kind: "ground",
        position: { x: 2, y: 3 },
      });
      expect(
        (yard.entities["site-1:alex"] as Pawn).health!.death,
      ).toBeDefined();
      expect(
        Object.values(c.session.state.transfers).some(
          (transfer) =>
            transfer.entities["site-1:casey"] && transfer.blockedReason,
        ),
      ).toBe(true);
      observedBlock = true;
    }
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(
      /^rejected|Advanced.*(?:blocked|Blocked|failed|1000-tick limit)/,
    );
    c = result.console;
    if (line.startsWith("send ") || line.startsWith("reserve "))
      c = { ...c, session: restoreSession(JSON.stringify(c.session))! };
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(observedBlock).toBe(true);
  const home = c.session.state.sites["site-1"]!;
  const reserveId = c.session.campaign!.siteIds.reserve!;
  expect((home.entities["site-1:alex"] as Pawn).health!.death).toBeDefined();
  expect((home.entities[`${reserveId}:devon`] as Pawn).canAct).toBe(true);
  expect((home.entities["site-1:casey"] as Pawn).canAct).toBe(true);
  expect(
    (home.entities["site-1:suppressor"] as Item).equipment!.subdual!.charges,
  ).toBe(1);
  expect(c.session.state.transfers).toEqual({});
  expect(Object.keys(c.session.state.sites[reserveId]!.entities)).toEqual([
    `${reserveId}:riley`,
  ]);
});
