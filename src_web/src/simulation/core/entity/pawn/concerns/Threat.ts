import type { Concern } from "./Concern";
import type { ActionContext } from "../actions/Action";
import { visibleThreats } from "../../../site/Visibility";
import { distance, positionOf } from "../../../site/TileMap";

export function threatConcern({ site, pawn }: ActionContext): Concern | null {
  const threat = visibleThreats(site, pawn)[0];
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
