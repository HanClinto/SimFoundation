import { expect, it } from "vitest";
import { executeLine, openConsole } from "../../src/adapters/cli/Console";
import { restoreSession } from "../../src/application/ScenarioSession";
import type { Pawn } from "../../src/simulation/core/entity/pawn/Pawn";
import type { Item } from "../../src/simulation/core/entity/Item";

it("shows independent care obligations and actual equipment supply without changing the patient", () => {
  let c = openConsole();
  for (const line of ["order casey equip medical-kit", "finish casey"])
    c = executeLine(c, line).console;
  const home = c.session.state.sites["site-1"]!;
  const patient = home.entities["site-1:alex"] as Pawn;
  patient.health!.wounds = [{ id: "injury", severity: 120, bleeding: 0 }];
  patient.health!.postoperative = {
    sinceTick: 1,
    actorId: "site-1:bear",
    organ: "lung",
  };
  patient.health!.incapacity = "wounds";
  patient.canAct = false;
  (home.entities["site-1:medical-kit"] as Item).equipment!.medicine!.supplies =
    0;
  const before = JSON.stringify(c);
  const output = executeLine(c, "medical").output;
  expect(output).toContain("wounds 120.0");
  expect(output).toContain("POSTOPERATIVE COURSE PENDING");
  expect(output).toContain("stabilization supplies 0 | kit site-1:medical-kit");
  expect(JSON.stringify(c)).toBe(before);
  expect(
    executeLine(
      { ...c, session: restoreSession(JSON.stringify(c.session))! },
      "medical",
    ).output,
  ).toBe(output);
});
it("lists permanent bodies separately from currently treatable patients and includes real remote owners only when requested", () => {
  const c = executeLine(openConsole(), "step 100").console;
  const local = executeLine(c, "medical").output;
  expect(local).not.toContain("Rowan");
  const all = executeLine(c, "medical all").output;
  expect(all).toContain("Rowan");
  expect(all).toContain("DEAD at tick 99");
  expect(all.indexOf("Rowan")).toBeGreaterThan(all.indexOf("RETAINED BODIES"));
  expect(all).toContain(c.session.campaign!.siteIds.accident!);
  expect(all).not.toMatch(/devon|riley|reserve/i);
  expect(all).toContain("casey [site-1:casey] at site-1");
});
it("reports travelling medical capability without permitting local work or inventing a diagnosis", () => {
  let c = openConsole();
  for (const line of ["prepare care casey", "finish casey", "send care casey"])
    c = executeLine(c, line).console;
  const output = executeLine(c, "medical all").output;
  expect(output).toContain("casey [site-1:casey] at transfer-1");
  expect(output).toContain("IN TRANSIT: no local orders");
  expect(() => executeLine(c, "medical unknown")).toThrow("medical [all]");
});
