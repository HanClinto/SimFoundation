import { describe, expect, it } from "vitest";
import { scheduleCoverage } from "../src/adapters/browser/schedule-coverage";
import { createInitialState } from "../src/simulation/state";
import { setPersonnelSchedule } from "../src/simulation/routines";
describe("skill coverage", () => {
  it("counts scheduled recorded skills without claiming exclusive task allocations", () => {
    const state = createInitialState();
    expect(
      scheduleCoverage(state).find(({ skillId }) => skillId === "medical")
        ?.hours[0],
    ).toEqual([]);
    const changed = setPersonnelSchedule(
      state,
      "person-mara-voss",
      Array.from({ length: 24 }, () => "work"),
    );
    expect(
      scheduleCoverage(changed).find(({ skillId }) => skillId === "medical")
        ?.hours[0],
    ).toEqual(["person-mara-voss"]);
    expect(
      scheduleCoverage(changed).find(({ skillId }) => skillId === "research")
        ?.hours[0],
    ).toEqual(["person-mara-voss"]);
  });
});
