import {
  latestPhysicalAssessment,
  type PersonnelRecord,
} from "../../simulation/personnel";

export function recordedInfluences(person: PersonnelRecord): readonly string[] {
  const assessment = latestPhysicalAssessment(person);
  const findings =
    assessment?.conclusions.map(
      (conclusion) => `${conclusion.label} (${conclusion.status})`,
    ) ?? [];
  return [
    ...person.physicalObservations.map(
      (observation) => `${observation.label} (observed)`,
    ),
    ...findings,
  ];
}

export function recordAge(currentTick: number, recordedTick: number): string {
  const minutes = Math.max(0, currentTick - recordedTick);
  return minutes === 0
    ? "Recorded just now"
    : `Recorded ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
}
