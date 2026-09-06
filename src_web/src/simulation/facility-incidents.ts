import { observeStructuralDamage } from "./environment";
import type { GameState, IncidentState } from "./state";

export const VESSEL_WARNING_INTEGRITY = 25;

export function recordedVesselIncident(state: GameState): IncidentState | null {
  const vessels = Object.values(state.observations.objects)
    .map((observation) => observation.object)
    .filter(
      (item) => item.kind === "vessel" && item.location.kind !== "consumed",
    );
  const breached = vessels.filter((item) => item.condition === 0);
  if (breached.length)
    return {
      level: "orange",
      summary: `Vessel condition: ${breached.length} recorded breached case(s): ${breached.map((item) => item.id).join(", ")}`,
    };
  const worn = vessels.filter(
    (item) => item.vessel?.sealed && item.condition <= VESSEL_WARNING_INTEGRITY,
  );
  return worn.length
    ? {
        level: "yellow",
        summary: `Vessel condition: ${worn.length} recorded sealed case(s) at ${VESSEL_WARNING_INTEGRITY}% or below: ${worn.map((item) => item.id).join(", ")}`,
      }
    : null;
}

export function observeFacilityIncidents(state: GameState): GameState {
  const ownIncident = [
    "Structural damage:",
    "Vessel condition:",
    "Facility condition:",
  ].some((prefix) => state.incident.summary.startsWith(prefix));
  const structural = observeStructuralDamage({
    ...state,
    incident: { level: "green", summary: "Routine operations" },
  }).incident;
  const vessel = recordedVesselIncident(state);
  const candidates = [structural, ...(vessel ? [vessel] : [])].filter(
    (incident) => incident.level !== "green",
  );
  const severity = { green: 0, yellow: 1, orange: 2, red: 3 };
  candidates.sort(
    (first, second) => severity[second.level] - severity[first.level],
  );
  const next = candidates[0];
  if (
    !ownIncident &&
    state.incident.level !== "green" &&
    (!next || severity[state.incident.level] >= severity[next.level])
  )
    return state;
  if (!next)
    return ownIncident
      ? {
          ...state,
          incident: {
            level: "green",
            summary: "Recorded facility conditions resolved",
          },
        }
      : state;
  const incident =
    candidates.length === 1
      ? next
      : {
          level: next.level,
          summary: `Facility condition: ${candidates.map((candidate) => candidate.summary).join("; ")}`,
        };
  return { ...state, incident };
}
