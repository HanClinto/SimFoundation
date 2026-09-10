import type { Concern } from "./Concern";
import type { ActionContext } from "../actions/Action";
import { canSee, visibleThreats } from "../../../site/Visibility";
import { positionOf, distance } from "../../../site/TileMap";
import { interactionRoute } from "../../../site/Pathfinding";
import type { Pawn } from "../Pawn";
import { stabilizationCapability } from "../../Equipment";

export function careConcern(context: ActionContext): Concern | null {
  const { site, pawn } = context;
  const medicine = stabilizationCapability(site, pawn);
  if (!medicine || medicine.supplies < 1) return null;
  const threats = visibleThreats(site, pawn, context.tick);
  const patients = Object.values(site.entities)
    .filter(
      (entity): entity is Pawn =>
        entity.kind === "pawn" &&
        entity.id !== pawn.id &&
        entity.response?.faction === pawn.response?.faction &&
        !entity.health?.death &&
        !!entity.health?.wounds.some((wound) => wound.bleeding > 0) &&
        canSee(site, pawn, entity.id) &&
        !threats.some(
          (threat) =>
            distance(
              positionOf(site, entity.id)!,
              positionOf(site, threat.id)!,
            ) <= 2,
        ),
    )
    .sort((first, second) => {
      const bleeding = (patient: Pawn) =>
        patient.health!.wounds.reduce(
          (total, wound) => total + wound.bleeding,
          0,
        );
      return (
        bleeding(second) - bleeding(first) ||
        (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
      );
    });
  const patient = patients.find((entry) => {
    const path = interactionRoute(site, pawn.id, entry.id);
    return path !== null && (pawn.mobile || path.length === 0);
  });
  return patient
    ? {
        causeId: patient.id,
        kind: "injury",
        urgency: 80,
        action: { kind: "treat", targetId: patient.id, workTicks: 0 },
      }
    : null;
}
