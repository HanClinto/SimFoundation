import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

it("loses two colleagues through real combat while the survivor recovers a body and worn gear", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/crew-loss-recovery.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  let observedCasualties = false;
  for (const line of lines) {
    if (line === "prepare intervention casey") {
      const yard =
        c.session.state.sites[c.session.campaign!.siteIds.intervention!]!;
      for (const id of ["site-1:alex", "site-1:ben"]) {
        const casualty = yard.entities[id] as Pawn;
        expect(casualty.health!.death).toBeDefined();
        expect(
          casualty.health!.wounds.some((wound) =>
            wound.id.startsWith("impact:"),
          ),
        ).toBe(true);
      }
      expect(
        (c.session.state.sites["site-1"]!.entities["site-1:casey"] as Pawn)
          .canAct,
      ).toBe(true);
      expect(
        (yard.entities["site-1:suppressor"] as Item).equipment!.subdual!
          .charges,
      ).toBe(2);
      expect((yard.entities["site-1:vest"] as Item).integrity).toBe(0);
      observedCasualties = true;
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
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  expect(observedCasualties).toBe(true);
  const home = c.session.state.sites["site-1"]!;
  const yard =
    c.session.state.sites[c.session.campaign!.siteIds.intervention!]!;
  expect((yard.entities["site-1:ben"] as Pawn).health!.death).toBeDefined();
  expect((home.entities["site-1:alex"] as Pawn).health!.death).toBeDefined();
  const responder = home.entities["site-1:casey"] as Pawn;
  expect(responder.canAct).toBe(true);
  expect(responder.health!.death).toBeUndefined();
  const tool = home.entities["site-1:suppressor"] as Item;
  expect(tool.location).toEqual({ kind: "carried", carrierId: responder.id });
  expect(tool.equipment!.subdual!.charges).toBe(1);
  expect(tool.equipment!.worn).toBe(true);
  const vest = home.entities["site-1:vest"] as Item;
  expect(vest.location).toEqual({
    kind: "carried",
    carrierId: "site-1:alex",
  });
  expect(vest.integrity).toBe(0);
  expect(vest.equipment!.worn).toBe(true);
  expect(c.session.state.transfers).toEqual({});
  expect(c.session.campaign!.staffIds).toEqual([
    "site-1:alex",
    "site-1:ben",
    "site-1:casey",
  ]);
});
