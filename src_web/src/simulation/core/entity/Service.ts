import type { Site } from "../site/Site";
import type { Facility } from "./Facility";
import type { TickEvent } from "../Simulation";

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

export function publishServiceWarning(
  site: Site,
  facility: Facility,
  tick: number,
  events: TickEvent[],
): void {
  if (!facility.service || facility.location.kind !== "ground") return;
  const deadline = serviceDeadline(facility.service);
  if (deadline === null) return;
  const due = tick === deadline - facility.service.leadTime;
  const lapsed = tick === deadline + 1;
  if (!due && !lapsed) return;
  const subject = Object.values(site.entities).find(
    (entity) =>
      entity.kind === "pawn" &&
      entity.location.kind === "carried" &&
      entity.location.carrierId === facility.id,
  );
  events.push({
    siteId: site.id,
    entityId: facility.id,
    kind: "warning",
    ...(subject ? { targetId: subject.id } : {}),
    reason: due
      ? `${facility.name} service is due; coverage expires after tick ${deadline}.`
      : `${facility.name} service coverage has lapsed; restore physical service.`,
  });
}
