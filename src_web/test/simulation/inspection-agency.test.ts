import fs from "node:fs";
import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";

it("a physically recovered body keeps health/property data but has no ghost autonomy preview", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/permanent-loss.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  for (const line of lines) c = executeLine(c, line).console;
  const before = JSON.stringify(c);
  const inspected = JSON.parse(executeLine(c, "inspect rowan").output);
  expect(inspected.entity.health.death).toBeDefined();
  expect(inspected.contents).toContainEqual(
    expect.objectContaining({ id: "site-12:recorder" }),
  );
  expect(inspected.needCandidate).toBeUndefined();
  expect(inspected.concern).toBeUndefined();
  expect(JSON.stringify(c)).toBe(before);
});
it("incapacitated and carried pawns do not receive independent work previews, while capable ground workers do", () => {
  const c = openConsole();
  const home = c.session.state.sites["site-1"]!;
  const alex = home.entities["site-1:alex"] as Pawn;
  expect(JSON.parse(executeLine(c, "inspect alex").output)).toHaveProperty(
    "needCandidate",
  );
  alex.canAct = false;
  expect(JSON.parse(executeLine(c, "inspect alex").output)).not.toHaveProperty(
    "needCandidate",
  );
  alex.canAct = true;
  alex.location = { kind: "carried", carrierId: "site-1:casey" };
  const inspected = JSON.parse(executeLine(c, "inspect alex").output);
  expect(inspected.entity.location).toEqual(alex.location);
  expect(inspected.needCandidate).toBeUndefined();
});
it("effective physical custody remains inspectable without suggesting autonomous work", () => {
  const lines = fs
    .readFileSync(
      new URL(
        "../../src/simulation/catalog/campaign/tests/restrained-return.txt",
        import.meta.url,
      ),
      "utf8",
    )
    .split(/\r?\n/);
  let c = openConsole();
  for (const line of lines) c = executeLine(c, line).console;
  c = executeLine(c, "step 90").console;
  const inspected = JSON.parse(executeLine(c, "inspect specimen").output);
  expect(inspected.entity.canAct).toBe(true);
  expect(inspected.restraint).toBeDefined();
  expect(inspected.needCandidate).toBeUndefined();
  expect(inspected.concern).toBeUndefined();
});
