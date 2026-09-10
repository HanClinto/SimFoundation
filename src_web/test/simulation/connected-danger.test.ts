import fs from "node:fs";
import { expect, it } from "vitest";
import {
  executeLine,
  openConsole,
  type ConsoleState,
} from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";
import type { Facility } from "../../src/simulation/core/entity/Facility";
import { secureContainment } from "../../src/simulation/core/entity/Containment";

const lines = fs
  .readFileSync(
    new URL(
      "../../src/simulation/catalog/campaign/tests/connected-danger.txt",
      import.meta.url,
    ),
    "utf8",
  )
  .split(/\r?\n/);
function command(c: ConsoleState, line: string) {
  const result = executeLine(c, line);
  expect(result.output, line).not.toMatch(
    /^rejected|Advanced.*(?:[Bb]locked|failed|interrupted|1000-tick limit)/,
  );
  return result.console;
}
it("replays one actual injured capture, staff recovery, equipment upkeep and cell fallback without resource resets", () => {
  let c = openConsole();
  let replay = openConsole();
  for (const line of lines) {
    c = command(c, line);
    replay = command(replay, line);
    expect(replay, line).toEqual(c);
    if (line.startsWith("send ") || line.startsWith("order ")) {
      replay = {
        ...replay,
        session: restoreSession(JSON.stringify(replay.session))!,
      };
    }
    const ids = [
      ...Object.values(c.session.state.sites),
      ...Object.values(c.session.state.transfers),
    ].flatMap((owner) => Object.keys(owner.entities));
    expect(new Set(ids).size, line).toBe(ids.length);
  }
  const home = c.session.state.sites["site-1"]!;
  const alex = home.entities["site-1:alex"] as Pawn;
  const subject = home.entities["site-13:specimen"] as Pawn;
  const cell = home.entities["site-1:holding"] as Facility;
  expect(alex.canAct).toBe(true);
  expect(alex.health!.death).toBeUndefined();
  expect(alex.health!.wounds.length).toBeGreaterThan(0);
  expect(
    alex.health!.wounds.some((wound) => (wound.recovery?.length ?? 0) > 0),
  ).toBe(true);
  expect(subject.location).toEqual({ kind: "carried", carrierId: cell.id });
  expect(subject.acceptsEscort).toBe(false);
  expect(secureContainment(cell, c.session.state.tick)).toBe(true);
  expect(cell.study!.findings[0]!.sourceIds).toEqual([subject.id]);
  expect(
    (home.entities["site-1:suppressor"] as Item).equipment!.subdual!.charges,
  ).toBe(2);
  expect(home.entities["site-1:vest"]!.integrity).toBe(100);
  expect(home.entities["site-1:parts"]!.amount).toBe(1);
  expect(home.entities["site-1:wound-packs"]!.amount).toBe(2);
  expect(home.entities["site-1:clinical-packs"]!.amount).toBe(3);
  expect(home.entities["site-1:suppression-units"]!.amount).toBe(2);
  expect(cell.containment!.lockdown.untilTick).not.toBeNull();
  expect((home.entities["site-1:ben"] as Pawn).serviceDuty).toBe(cell.id);
  expect(c.session.state.transfers).toEqual({});
});
