import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

it("rescues a still-living incapacitated ally through actual equipment recovery, finite care and carried return", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/incapacitated-ally-rescue.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  let confirmedAliveIncapacity = false;
  for (const line of lines) {
    if (line === "order casey equip suppressor" && !confirmedAliveIncapacity) {
      const alex = c.session.state.sites["site-13"]!.entities[
        "site-1:alex"
      ] as Pawn;
      expect(alex.canAct).toBe(false);
      expect(alex.health!.death).toBeUndefined();
      confirmedAliveIncapacity = true;
    }
    const result = executeLine(c, line);
    expect(result.output, line).not.toMatch(
      /^rejected|Advanced.*(?:blocked|Blocked|failed|interrupted|1000-tick limit)/,
    );
    c = result.console;
    if (line.startsWith("send ") || line.startsWith("order casey equip"))
      c = { ...c, session: restoreSession(JSON.stringify(c.session))! };
  }
  const home = c.session.state.sites["site-1"]!;
  const alex = home.entities["site-1:alex"] as Pawn;
  const casey = home.entities["site-1:casey"] as Pawn;
  expect(confirmedAliveIncapacity).toBe(true);
  expect(alex.health!.death).toBeUndefined();
  expect(alex.canAct).toBe(true);
  expect(alex.health!.wounds.every((wound) => wound.bleeding === 0)).toBe(true);
  expect(
    alex.health!.wounds.filter(
      (wound) => wound.stabilization?.sourceId === "site-1:medical-kit",
    ),
  ).toHaveLength(3);
  expect(
    alex.health!.wounds.filter(
      (wound) => wound.stabilization?.sourceId === "site-1:casey",
    ),
  ).toHaveLength(2);
  expect(
    alex.health!.wounds.every((wound) => (wound.stabilization?.tick ?? 0) > 0),
  ).toBe(true);
  expect(casey.response!.medicine!.supplies).toBe(0);
  expect((home.entities["site-1:suppressor"] as Item).location).toEqual({
    kind: "carried",
    carrierId: casey.id,
  });
  expect(home.entities["site-1:vest"]!.location).toEqual({
    kind: "carried",
    carrierId: alex.id,
  });
  const kit = c.session.state.sites["site-13"]!.entities[
    "site-1:medical-kit"
  ] as Item;
  expect(kit.equipment!.medicine!.supplies).toBe(0);
  expect(home.entities["site-1:wound-packs"]!.amount).toBe(2);
});

it("active allies and nonallied incapacitated owners keep ownership protection", () => {
  let c = openConsole();
  for (const line of ["order alex equip suppressor", "finish alex"])
    c = executeLine(c, line).console;
  const home = c.session.state.sites["site-1"]!;
  const before = JSON.stringify(c);
  expect(executeLine(c, "order casey equip suppressor").output).toContain(
    "active or nonallied living person",
  );
  expect(JSON.stringify(c)).toBe(before);
  const alex = home.entities["site-1:alex"] as Pawn;
  alex.canAct = false;
  alex.response!.faction = "other";
  expect(executeLine(c, "order casey equip suppressor").output).toContain(
    "nonallied",
  );
  alex.response!.faction = "site";
  expect(executeLine(c, "order casey equip suppressor").output).toMatch(
    /^accepted/,
  );
});
