import type { IncidentLevel } from "../../simulation/state";

export function incidentResponse(
  previous: IncidentLevel | null | undefined,
  current: IncidentLevel,
): "none" | "slow" | "pause" {
  if (previous === current || current === "green") return "none";
  return current === "yellow" ? "slow" : "pause";
}
