import type { EntityBase } from "./Entity";
import type { Site } from "../site/Site";
import type { ActivityKind } from "./pawn/actions/Action";
import type { StudyPlan, Finding } from "./Study";
import type { Dispenser } from "./Dispenser";
import type { ServiceProfile } from "./Service";
import type { Containment } from "./Containment";

export interface Activity {
  duration: number;
  needChanges: Record<string, number>;
}

export interface Facility extends EntityBase {
  kind: "facility";
  activities: Partial<Record<ActivityKind, Activity>>;
  research?: { progress: number };
  study?: { plans: readonly StudyPlan[]; findings: Finding[] };
  dispenser?: Dispenser;
  service?: ServiceProfile;
  containment?: Containment;
  equipmentRepair?: {
    supplyDefinitionId: string;
    ticks: number;
    condition: number;
  };
  care?: {
    supplyDefinitionId: string;
    ticks: number;
    bloodRecovery: number;
    woundCourse?: {
      supplyDefinitionId: string;
      ticks: number;
      recovery: number;
    };
  };
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
      (action.targetId === targetId ||
        ("bedId" in action && action.bedId === targetId) ||
        ("benchId" in action && action.benchId === targetId) ||
        ("cellId" in action && action.cellId === targetId))
    );
  });
}
