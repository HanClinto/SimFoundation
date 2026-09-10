import type { Concern } from "./Concern";
import type { ActionContext } from "../actions/Action";
import { visibleThreats } from "../../../site/Visibility";
import { distance, positionOf } from "../../../site/TileMap";

export function threatConcern({
  site,
  pawn,
  tick,
}: ActionContext): Concern | null {
  const ceiling = pawn.response?.attack?.maximumSeverity;
  const threat = visibleThreats(site, pawn, tick).find(
    (candidate) =>
      ceiling === undefined ||
      (candidate.health?.wounds.reduce(
        (sum, wound) => sum + wound.severity,
        0,
      ) ?? 0) < ceiling,
  );
  if (!threat) return null;
  const confront =
    pawn.response!.threat === "confront" && !!pawn.response!.attack;
  const immediate =
    distance(positionOf(site, pawn.id)!, positionOf(site, threat.id)!) <= 2;
  return {
    causeId: threat.id,
    kind: "threat",
    urgency: immediate || confront ? 100 : 60,
    action: confront
      ? { kind: "attack", targetId: threat.id, workTicks: 0 }
      : { kind: "flee", targetId: threat.id },
  };
}
