import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

it("loses the original crew through real combat and continues with an existing reserve and recovered gear", () => {
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
  for (const line of lines) {
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(/^rejected/);
    c = result.console;
    if (line.startsWith("send ") || line.startsWith("reserve "))
      c = { ...c, session: restoreSession(JSON.stringify(c.session))! };
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  const home = c.session.state.sites["site-1"]!;
  const yard =
    c.session.state.sites[c.session.campaign!.siteIds.intervention!]!;
  for (const id of ["site-1:alex", "site-1:ben"])
    expect((yard.entities[id] as Pawn).health!.death).toBeDefined();
  expect((home.entities["site-1:casey"] as Pawn).health!.death).toBeDefined();
  const reserveId = c.session.campaign!.siteIds.reserve!;
  const responder = home.entities[`${reserveId}:devon`] as Pawn;
  expect(responder.canAct).toBe(true);
  expect(responder.health!.death).toBeUndefined();
  const tool = home.entities["site-1:suppressor"] as Item;
  expect(tool.location).toEqual({ kind: "carried", carrierId: responder.id });
  expect(tool.equipment!.subdual!.charges).toBe(1);
  expect(
    c.session.state.sites[reserveId]!.entities[`${reserveId}:riley`],
  ).toBeDefined();
  expect(
    c.session.state.sites[reserveId]!.entities[`${reserveId}:dispatches`]!
      .amount,
  ).toBe(1);
  expect(home.entities["site-1:transport"]!.amount).toBe(2);
});
