import type { Action, ActionContext, ActionResult } from "./Action";
import type { Pawn } from "../Pawn";
import { majorOrganTrauma, type OrganKind } from "../Health";
import { distance, positionOf } from "../../../site/TileMap";
import { consumeMaterial } from "../../Consumption";
import { findSupply } from "../../Supply";

export interface OrganMending {
  range: number;
  ticks: number;
  supported: readonly OrganKind[];
  materialDefinitionId: string;
  amount: number;
}

export interface MendState {
  kind: "mend";
  targetId: string;
  workTicks: number;
  organ?: OrganKind;
  material?: { sourceId: string; materialId: string; amount: number };
}

export class Mend implements Action {
  constructor(readonly state: MendState) {}

  static patient({ site, pawn }: ActionContext): Pawn | undefined {
    const ability = pawn.organMending;
    const origin = positionOf(site, pawn.id);
    if (!ability || !origin) return undefined;
    return Object.values(site.entities)
      .filter(
        (entity): entity is Pawn =>
          entity.kind === "pawn" &&
          entity.id !== pawn.id &&
          entity.human === true &&
          entity.ageYears !== undefined &&
          entity.health !== undefined &&
          !entity.health.death &&
          majorOrganTrauma(entity.health) &&
          entity.location.kind === "ground" &&
          distance(entity.location.position, origin) <= ability.range,
      )
      .sort(
        (a, b) =>
          a.ageYears! - b.ageYears! || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )[0];
  }

  static offer(context: ActionContext): MendState | null {
    const patient = Mend.patient(context);
    return patient
      ? { kind: "mend", targetId: patient.id, workTicks: 0 }
      : null;
  }

  canStart(context: ActionContext): string | null {
    const { site, pawn } = context;
    const ability = pawn.organMending;
    if (!ability) return "This actor cannot perform organ mending.";
    const patient = site.entities[this.state.targetId];
    if (patient?.kind !== "pawn" || !patient.health || !patient.human)
      return "Choose a human organ-trauma patient.";
    if (Mend.patient(context)?.id !== patient.id)
      return "The youngest eligible nearby patient has priority.";
    if (
      !ability.supported.some(
        (kind) => (patient.health!.organs?.[kind]?.trauma ?? 0) >= 100,
      )
    )
      return "The youngest patient's organ trauma is not supported; no replacement is performed.";
    if (
      Object.values(site.entities).some((entity) => {
        const action =
          entity.kind === "pawn" ? entity.queue[0]?.action : undefined;
        return (
          entity.id !== pawn.id &&
          action?.kind === "mend" &&
          action.targetId === patient.id &&
          action.workTicks > 0
        );
      })
    )
      return "Another mender is already treating this patient.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    if (
      this.state.material &&
      Mend.patient(context)?.id !== this.state.targetId
    )
      return {
        status: "interrupted",
        reason:
          "The patient left range or a younger patient now has priority; spent material is retained.",
      };
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { pawn, site } = context;
    const ability = pawn.organMending!;
    const patient = site.entities[this.state.targetId] as Pawn;
    if (!this.state.material) {
      const origin = positionOf(site, pawn.id)!;
      const external = findSupply(
        site,
        ability.materialDefinitionId,
        ability.amount,
        origin,
        ability.range,
      );
      const source =
        external ?? (pawn.amount > ability.amount ? pawn : undefined);
      if (!source)
        return {
          status: "blocked",
          reason: `Bring ${ability.materialDefinitionId}; the remaining self-fabric reserve cannot fund another replacement.`,
        };
      this.state.organ = ability.supported.find(
        (kind) => (patient.health!.organs?.[kind]?.trauma ?? 0) >= 100,
      )!;
      this.state.material = {
        sourceId: source.id,
        materialId: source.materialId,
        amount: consumeMaterial(source, ability.amount),
      };
    }
    if (++this.state.workTicks < ability.ticks) return { status: "running" };
    const organ = patient.health!.organs![this.state.organ!]!;
    organ.trauma = 0;
    organ.replacement = {
      actorId: pawn.id,
      tick: context.tick,
      materialSourceId: this.state.material.sourceId,
      materialId: this.state.material.materialId,
      amount: this.state.material.amount,
    };
    patient.canAct = false;
    patient.health!.incapacity = "postoperative";
    patient.health!.postoperative = {
      sinceTick: context.tick,
      actorId: pawn.id,
      organ: this.state.organ!,
    };
    return { status: "completed" };
  }
}
