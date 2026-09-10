import type { Entity, Position } from "./Entity";
import type { Facility } from "./Facility";
import { serviceStatus } from "./Service";

export interface Containment {
  accepts: readonly string[];
  intakeTicks: number;
  exitOffset: Position;
  lockdown: {
    supplyDefinitionId: string;
    ticks: number;
    duration: number;
    untilTick: number | null;
  };
}

export function secureContainment(cell: Facility, tick: number): boolean {
  if (
    !cell.containment ||
    cell.location.kind !== "ground" ||
    (cell.integrity ?? 100) <= 0
  )
    return false;
  if ((cell.containment.lockdown.untilTick ?? -1) > tick) return true;
  return (
    (cell.integrity ?? 100) >= 100 &&
    !!cell.service &&
    ["covered", "due"].includes(serviceStatus(cell.service, tick))
  );
}

export function containmentFor(
  entities: Record<string, Entity>,
  subjectId: string,
): Facility | undefined {
  const subject = entities[subjectId];
  if (subject?.location.kind !== "carried") return undefined;
  const parent = entities[subject.location.carrierId];
  return parent?.kind === "facility" && parent.containment ? parent : undefined;
}
