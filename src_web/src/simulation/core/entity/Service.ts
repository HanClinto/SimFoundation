export interface ServiceRecord {
  kind: "repair" | "service";
  tick: number;
  actorId: string;
  supplyId: string;
  amount: number;
  lateBy: number;
}

export interface ServiceProfile {
  supplyDefinitionId: string;
  amount: number;
  ticks: number;
  interval: number;
  leadTime: number;
  repair: { supplyDefinitionId: string; amount: number; ticks: number };
  history: ServiceRecord[];
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
