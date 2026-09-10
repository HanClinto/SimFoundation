import type { Action, ActionContext, ActionResult } from "./Action";
import type { Pawn } from "../Pawn";
import { canSee, visibleThreats } from "../../../site/Visibility";
import { distance, positionOf } from "../../../site/TileMap";
import { Move } from "./Move";

export interface TreatState {
  kind: "treat";
  targetId: string;
  workTicks: number;
}

export class Treat implements Action {
  constructor(readonly state: TreatState) {}

  canStart({ site, pawn }: ActionContext): string | null {
    if (!pawn.response?.medicine || pawn.response.medicine.supplies < 1)
      return "Medical supplies or training are unavailable.";
    const patient = site.entities[this.state.targetId];
    if (
      patient?.kind !== "pawn" ||
      !patient.health ||
      patient.id === pawn.id ||
      patient.response?.faction !== pawn.response.faction
    )
      return "Choose another allied patient.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const { site, pawn } = context;
    const patient = site.entities[this.state.targetId];
    if (
      patient?.kind === "pawn" &&
      patient.health &&
      !patient.health.wounds.some((wound) => wound.bleeding > 0)
    )
      return { status: "completed" };
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    if (!canSee(site, pawn, this.state.targetId))
      return { status: "completed" };
    const target = patient as Pawn;
    if (
      visibleThreats(site, pawn).some(
        (threat) =>
          distance(
            positionOf(site, target.id)!,
            positionOf(site, threat.id)!,
          ) <= 2 ||
          distance(positionOf(site, pawn.id)!, positionOf(site, threat.id)!) <=
            2,
      )
    ) {
      this.state.workTicks = 0;
      return {
        status: "blocked",
        reason: "The patient is too close to a threat.",
      };
    }
    const approach = Move.approach(context, target);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (++this.state.workTicks < pawn.response!.medicine!.ticks)
      return { status: "running" };
    const wound = target
      .health!.wounds.filter((entry) => entry.bleeding > 0)
      .sort(
        (first, second) =>
          second.bleeding - first.bleeding || (first.id < second.id ? -1 : 1),
      )[0];
    if (wound) {
      wound.bleeding = 0;
      wound.treatedBy = pawn.id;
      pawn.response!.medicine!.supplies--;
      context.events.push({
        siteId: site.id,
        entityId: pawn.id,
        kind: "treated",
        targetId: target.id,
      });
    }
    return { status: "completed" };
  }
}
