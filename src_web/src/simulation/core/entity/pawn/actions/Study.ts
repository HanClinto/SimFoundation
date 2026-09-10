import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import { positionOf, distance } from "../../../site/TileMap";
import { Move } from "./Move";
import { secureContainment } from "../../Containment";
import { recordedImpactFrom } from "../../ImpactRecording";

export interface StudyState {
  kind: "study";
  targetId: string;
  planId: string;
  workTicks: number;
}

export class Study implements Action {
  constructor(readonly state: StudyState) {}

  canStart({ site, pawn, tick }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (
      target?.kind !== "facility" ||
      target.location.kind !== "ground" ||
      (target.integrity ?? 100) <= 0
    )
      return "A usable study station is required.";
    const plan = target.study?.plans.find(
      (entry) => entry.id === this.state.planId,
    );
    if (!plan || !Number.isSafeInteger(plan.ticks) || plan.ticks < 1)
      return "Unknown study plan.";
    if (plan.recordedImpactsFrom && plan.requires.length === 0)
      return "A recorded-impact study needs a physical recorder source.";
    if (facilityInUse(site, target.id, pawn.id))
      return "The study station is occupied.";
    if (plan.containedSources && !secureContainment(target, tick))
      return "This study requires effective containment throughout the work.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) {
      this.state.workTicks = 0;
      return { status: "blocked", reason };
    }
    const { site, pawn } = context;
    const station = site.entities[this.state.targetId] as Facility;
    const plan = station.study!.plans.find(
      (entry) => entry.id === this.state.planId,
    )!;
    if (
      station.study!.findings.some(
        (entry) =>
          entry.planId === this.state.planId &&
          (!plan.perActor || entry.actorId === pawn.id),
      )
    )
      return { status: "completed" };
    const approach = Move.approach(context, station);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    const position = positionOf(site, station.id)!;
    const sources = Object.values(site.entities).sort((first, second) =>
      first.id < second.id ? -1 : first.id > second.id ? 1 : 0,
    );
    const sourceIds: string[] = [];
    const observationIds: string[] = [];
    for (const definitionId of plan.requires) {
      const source = sources.find(
        (entity) =>
          entity.definitionId === definitionId &&
          !(entity.kind === "pawn" && entity.health?.death) &&
          !sourceIds.includes(entity.id) &&
          entity.amount > 0 &&
          (entity.integrity ?? 100) > 0 &&
          (!plan.recordedImpactsFrom ||
            recordedImpactFrom(entity, plan.recordedImpactsFrom) !==
              undefined) &&
          (plan.containedSources
            ? entity.location.kind === "carried" &&
              entity.location.carrierId === station.id
            : entity.location.kind === "ground" ||
              entity.location.carrierId === pawn.id ||
              entity.location.carrierId === station.id) &&
          distance(positionOf(site, entity.id)!, position) <= 1,
      );
      if (!source) {
        this.state.workTicks = 0;
        return {
          status: "blocked",
          reason: plan.containedSources
            ? `Admit the actual living ${definitionId} into this secure cell before study.`
            : plan.recordedImpactsFrom
              ? `Bring ${definitionId} with an actual recorded ${plan.recordedImpactsFrom} impact within one tile of the station.`
              : `Bring ${definitionId} within one tile of the station.`,
        };
      }
      sourceIds.push(source.id);
      if (plan.recordedImpactsFrom)
        observationIds.push(
          recordedImpactFrom(source, plan.recordedImpactsFrom)!.id,
        );
    }
    if (++this.state.workTicks < plan.ticks) return { status: "running" };
    station.study!.findings.push({
      planId: plan.id,
      title: plan.title,
      text: plan.finding,
      actorId: pawn.id,
      tick: context.tick,
      sourceIds,
      ...(observationIds.length ? { observationIds } : {}),
    });
    return { status: "completed" };
  }
}
