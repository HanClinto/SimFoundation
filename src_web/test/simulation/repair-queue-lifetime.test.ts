import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import { facilityInUse } from "../../src/simulation/core/entity/Facility";
import { equipmentUnderRepair } from "../../src/simulation/core/entity/Equipment";

it("retains a funded repair claim during incapacity until the ordinary queue interruption resolves it", () => {
  let c = openConsole();
  const home = c.session.state.sites["site-1"]!;
  (home.entities["site-1:ben"] as Pawn).location = {
    kind: "ground",
    position: { x: 8, y: 1 },
  };
  (home.entities["site-1:alex"] as Pawn).location = {
    kind: "ground",
    position: { x: 6, y: 2 },
  };
  home.entities["site-1:vest"]!.location = {
    kind: "ground",
    position: { x: 6, y: 1 },
  };
  home.entities["site-1:vest"]!.integrity = 60;
  home.entities["site-1:parts"]!.location = {
    kind: "ground",
    position: { x: 6, y: 1 },
  };
  c = executeLine(c, "order ben repair-equipment vest workshop").console;
  c = executeLine(c, "step").console;
  const funded = c.session.state.sites["site-1"]!;
  (funded.entities["site-1:ben"] as Pawn).canAct = false;
  expect(equipmentUnderRepair(funded, "site-1:vest")).toBe(true);
  expect(facilityInUse(funded, "site-1:workshop")).toBe(true);
  expect(
    executeLine(c, "order alex repair-equipment vest workshop").output,
  ).toContain("existing funded repair");
  expect(executeLine(c, "order alex equip vest").output).toContain(
    "funded equipment repair",
  );
  c = executeLine(c, "step").console;
  const interrupted = c.session.state.sites["site-1"]!;
  expect(equipmentUnderRepair(interrupted, "site-1:vest")).toBe(false);
  expect(facilityInUse(interrupted, "site-1:workshop")).toBe(false);
  expect(interrupted.entities["site-1:parts"]!.amount).toBe(3);
  expect((interrupted.entities["site-1:ben"] as Pawn).queue).toEqual([]);
  c = executeLine(c, "order alex repair-equipment vest workshop").console;
  c = executeLine(c, "finish alex").console;
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:vest"]!.integrity,
  ).toBe(100);
  expect(
    c.session.state.sites["site-1"]!.entities["site-1:parts"]!.amount,
  ).toBe(2);
});
