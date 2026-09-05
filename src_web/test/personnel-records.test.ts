import { describe, expect, it } from "vitest";
import {
  createStartingPersonnel,
  assessPhysicalHealth,
} from "../src/simulation/personnel";
import {
  recordedInfluences,
  recordAge,
} from "../src/adapters/browser/personnel-records";

describe("personnel record presentation", () => {
  it("never discloses authoritative injuries through the findings list", () => {
    for (const person of createStartingPersonnel()) {
      const unknown = {
        ...person,
        physicalObservations: [],
        physicalAssessments: [],
      };
      expect(recordedInfluences(unknown)).toEqual([]);
      const assessed = assessPhysicalHealth(unknown, 10);
      expect(recordedInfluences(assessed)).toEqual(
        assessed.physicalAssessments
          .at(-1)!
          .conclusions.map((finding) => `${finding.label} (${finding.status})`),
      );
    }
  });
  it("uses elapsed record age rather than internal tick labels", () => {
    expect(recordAge(11, 10)).toBe("Recorded 1 minute ago");
    expect(recordAge(20, 10)).toBe("Recorded 10 minutes ago");
  });
});
