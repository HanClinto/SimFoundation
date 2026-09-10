import type { Action, ActionContext, ActionResult } from "./Action";
import type { Pawn } from "../Pawn";
import { canSee, visibleThreats } from "../../../site/Visibility";
import { distance, positionOf } from "../../../site/TileMap";
import { Move } from "./Move";
import { isCarePatient } from "../CareAccess";
import { stabilizationCapability, wornEquipment } from "../../Equipment";

export interface TreatState {
  kind: "treat";
  targetId: string;
  workTicks: number;
}

export class Treat implements Action {
  constructor(readonly state: TreatState) {}

  canStart({ site, pawn, tick }: ActionContext): string | null {
    const medicine = stabilizationCapability(site, pawn);
    if (!medicine || medicine.supplies < 1)
      return "Medical supplies or training are unavailable.";
    const patient = site.entities[this.state.targetId];
    if (patient?.kind === "pawn" && patient.health?.death)
      return "The patient is dead; treatment cannot restore life.";
    if (!isCarePatient(site, pawn, patient, tick))
      return "Choose another allied patient or an effectively secured custody subject.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const { site, pawn } = context;
    const patient = site.entities[this.state.targetId];
    if (
      isCarePatient(site, pawn, patient, context.tick) &&
      !patient.health.wounds.some((wound) => wound.bleeding > 0)
    )
      return { status: "completed" };
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = patient as Pawn;
    if (
      visibleThreats(site, pawn, context.tick).some(
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
    if (!canSee(site, pawn, this.state.targetId)) {
      this.state.workTicks = 0;
      return {
        status: "blocked",
        reason: "The patient is not visible from the treatment position.",
      };
    }
    const medicine = stabilizationCapability(site, pawn)!;
    if (++this.state.workTicks < medicine.ticks) return { status: "running" };
    const wound = target
      .health!.wounds.filter((entry) => entry.bleeding > 0)
      .sort(
        (first, second) =>
          second.bleeding - first.bleeding || (first.id < second.id ? -1 : 1),
      )[0];
    if (wound) {
      wound.bleeding = 0;
      medicine.supplies--;
      const kit = wornEquipment(site, pawn.id, "tool");
      wound.stabilization = {
        actorId: pawn.id,
        sourceId: kit?.equipment?.medicine === medicine ? kit.id : pawn.id,
        tick: context.tick,
      };
      if (medicine.supplies === 0 && kit?.equipment?.medicine === medicine)
        context.events.push({
          siteId: site.id,
          entityId: kit.id,
          targetId: pawn.id,
          kind: "warning",
          reason:
            "The worn medical kit is empty; restock the actual kit or explicitly change equipment.",
        });
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
