import type { EntityBase } from "./Entity";
import type { Site } from "../site/Site";
import type { ActivityKind } from "./pawn/actions/Action";

export interface Activity {
  duration: number;
  needChanges: Record<string, number>;
}

export interface Facility extends EntityBase {
  kind: "facility";
  activities: Partial<Record<ActivityKind, Activity>>;
  research?: { progress: number };
}

export function facilityInUse(
  site: Site,
  targetId: string,
  exceptPawnId?: string,
): boolean {
  return Object.values(site.entities).some((entity) => {
    if (
      entity.kind !== "pawn" ||
      entity.id === exceptPawnId ||
      !entity.canAct ||
      entity.location.kind !== "ground"
    )
      return false;
    const action = entity.queue[0]?.action;
    return (
      action &&
      "workTicks" in action &&
      action.workTicks > 0 &&
      action.targetId === targetId
    );
  });
}
