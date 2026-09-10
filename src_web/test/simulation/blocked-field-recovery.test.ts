import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

it("clears a hostile-occupied arrival with a colleague already in the field and recovered equipment", () => {
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
  let observedOrdinaryAdmission = false;
  for (const line of lines) {
    if (line === "order ben move 6 3") {
      const yardId = c.session.campaign!.siteIds.intervention!;
      const yard = c.session.state.sites[yardId]!;
      expect(yard.entities[`${yardId}:specimen`]!.location).toEqual({
        kind: "ground",
        position: { x: 2, y: 3 },
      });
      expect(
        (yard.entities["site-1:alex"] as Pawn).health!.death,
      ).toBeDefined();
      expect((yard.entities["site-1:ben"] as Pawn).canAct).toBe(true);
      expect(
        Object.values(c.session.state.transfers).some(
          (transfer) =>
            transfer.entities["site-1:casey"] && transfer.blockedReason,
        ),
      ).toBe(true);
      observedBlock = true;
    }
    if (line === "order casey equip site-1:suppressor") {
      const yard =
        c.session.state.sites[c.session.campaign!.siteIds.intervention!]!;
      expect(observedBlock).toBe(true);
      expect((yard.entities["site-1:casey"] as Pawn).canAct).toBe(true);
      expect(c.session.state.transfers).toEqual({});
      observedOrdinaryAdmission = true;
    }
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(
      /^rejected|Advanced.*(?:blocked|Blocked|failed|1000-tick limit)/,
    );
    c = result.console;
    if (line.startsWith("send "))
      c = { ...c, session: restoreSession(JSON.stringify(c.session))! };
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size).toBe(ids.length);
  }
  expect(observedBlock).toBe(true);
  expect(observedOrdinaryAdmission).toBe(true);
  const home = c.session.state.sites["site-1"]!;
  expect((home.entities["site-1:alex"] as Pawn).health!.death).toBeDefined();
  expect((home.entities["site-1:ben"] as Pawn).canAct).toBe(true);
  expect((home.entities["site-1:casey"] as Pawn).canAct).toBe(true);
  expect(
    (home.entities["site-1:suppressor"] as Item).equipment!.subdual!.charges,
  ).toBe(0);
  expect(home.entities["site-1:suppressor"]!.location).toEqual({
    kind: "carried",
    carrierId: "site-1:casey",
  });
  expect(c.session.state.transfers).toEqual({});
  expect(c.session.campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
});
