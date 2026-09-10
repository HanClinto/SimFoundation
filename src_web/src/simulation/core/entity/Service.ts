import type { Site } from "../site/Site";

export interface ServiceRecord {
  kind: "repair" | "service";
  tick: number;
  actorId: string;
  supplyId: string;
  amount: number;
  consumed: boolean;
  lateBy: number;
}

export interface ServiceProfile {
  supplyDefinitionId: string;
  amount: number;
  ticks: number;
  interval: number;
  leadTime: number;
  trainingPlanId?: string;
  participant?: { definitionId: string; range: number };
  reusableInput?: boolean;
  distinctInput?: boolean;
  repair: { supplyDefinitionId: string; amount: number; ticks: number };
  history: ServiceRecord[];
}

export function serviceInputInUse(
  site: Site,
  inputId: string,
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
    if (
      action?.kind !== "service" ||
      action.workTicks <= 0 ||
      action.supplyId !== inputId
    )
      return false;
    const target = site.entities[action.targetId];
    return (
      target?.kind === "facility" && target.service?.reusableInput === true
    );
  });
}

export function serviceDeadline(service: ServiceProfile): number | null {
  const latest = service.history
    .filter((entry) => entry.kind === "service")
    .at(-1);
  return latest ? latest.tick + service.interval : null;
}

export function serviceStatus(
  service: ServiceProfile,
  tick: number,
): "unstarted" | "covered" | "due" | "overdue" {
  const deadline = serviceDeadline(service);
  if (deadline === null) return "unstarted";
  if (tick > deadline) return "overdue";
  return tick >= deadline - service.leadTime ? "due" : "covered";
}
