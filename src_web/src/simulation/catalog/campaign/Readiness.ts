import type { Pawn } from "../../core/entity/pawn/Pawn";
import type { Simulation } from "../../core/Simulation";

export function departureReadiness(pawn: Pawn): string | null {
  const needs = ["hunger", "fatigue"]
    .filter((id) => (pawn.needs[id]?.value ?? 0) >= 85)
    .map((id) => `${id} ${pawn.needs[id]!.value.toFixed(1)}`);
  return needs.length
    ? `${pawn.name} is not ready for outbound travel: ${needs.join(", ")} (must be below 85). Enable autonomy for home routines or order physical food/bed work; finish or cancel routines before preparing again. Return travel remains available.`
    : null;
}

export function requireDepartureReadiness(pawns: readonly Pawn[]): void {
  for (const pawn of pawns) {
    const reason = departureReadiness(pawn);
    if (reason) throw new Error(reason);
  }
}

export function authorizeRisk(
  state: Simulation,
  transferId: string,
  fatalAfterTicks?: number,
): Simulation {
  if (fatalAfterTicks === undefined) return state;
  const result = structuredClone(state);
  for (const entity of Object.values(result.transfers[transferId]!.entities)) {
    if (
      entity.kind === "pawn" &&
      entity.playerControllable &&
      entity.health &&
      !entity.health.mortality
    )
      entity.health.mortality = { criticalTicks: 0, fatalAfterTicks };
  }
  return result;
}
