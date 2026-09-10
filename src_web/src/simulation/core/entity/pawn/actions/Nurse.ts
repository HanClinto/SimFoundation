import type { Action, ActionContext, ActionResult } from "./Action";
import type { Pawn } from "../Pawn";
import { incapacitated, recoverWounds } from "../Health";
import type { Facility } from "../../Facility";
import { facilityInUse } from "../../Facility";
import { distance, positionOf } from "../../../site/TileMap";
import { Move } from "./Move";
import { findSupply } from "../../Supply";
import { serviceStatus } from "../../Service";

export interface NurseState {
  kind: "nurse";
  targetId: string;
  bedId: string;
  workTicks: number;
  supplyId?: string;
  course?: "wounds";
}

function finishRecovery(patient: Pawn, wounds: boolean): void {
  if (
    (wounds
      ? patient.health?.incapacity === "wounds"
      : patient.health?.incapacity === "blood-loss" ||
        patient.health?.incapacity === "postoperative") &&
    patient.health &&
    !patient.health.death &&
    !incapacitated(patient.health)
  ) {
    patient.canAct = true;
    delete patient.health.incapacity;
  }
}

export class Nurse implements Action {
  constructor(readonly state: NurseState) {}

  canStart({ site, pawn, tick }: ActionContext): string | null {
    if (!pawn.response?.medicine)
      return "A medically trained worker is required.";
    const patient = site.entities[this.state.targetId];
    if (patient?.kind === "pawn" && patient.health?.death)
      return "The patient is dead; clinical recovery cannot restore life.";
    if (
      patient?.kind !== "pawn" ||
      !patient.health ||
      patient.id === pawn.id ||
      patient.response?.faction !== pawn.response.faction
    )
      return "Choose another allied patient.";
    if (patient.health.wounds.some((wound) => wound.bleeding > 0))
      return "Stabilize active bleeding before clinical recovery.";
    const bed = site.entities[this.state.bedId];
    if (
      bed?.kind !== "facility" ||
      !bed.care ||
      bed.location.kind !== "ground" ||
      (bed.integrity ?? 100) <= 0
    )
      return "A usable clinical bed is required.";
    if (this.state.course === "wounds" && !bed.care.woundCourse)
      return "This bed does not support a wound-care course.";
    if (
      bed.service &&
      ((bed.integrity ?? 100) < 100 ||
        ["unstarted", "overdue"].includes(serviceStatus(bed.service, tick)))
    )
      return "Restore shelter service before clinical care.";
    if (
      patient.location.kind !== "ground" ||
      distance(patient.location.position, bed.location.position) > 1
    )
      return "Position the patient on the ground within one tile of the clinical bed.";
    if (
      facilityInUse(site, bed.id, pawn.id) ||
      Object.values(site.entities).some((entity) => {
        const action =
          entity.kind === "pawn" ? entity.queue[0]?.action : undefined;
        return (
          entity.id !== pawn.id &&
          action?.kind === "nurse" &&
          action.workTicks > 0 &&
          action.targetId === patient.id
        );
      })
    )
      return "The clinical bed or patient already has active care.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { site, pawn } = context;
    const patient = site.entities[this.state.targetId] as Pawn;
    const bed = site.entities[this.state.bedId] as Facility;
    const care = bed.care!;
    const wounds = this.state.course === "wounds";
    const course = wounds ? care.woundCourse! : care;
    if (
      wounds
        ? patient.health!.wounds.every((wound) => wound.severity <= 0)
        : patient.health!.bloodLoss <= 0 &&
          patient.health!.incapacity !== "postoperative"
    ) {
      finishRecovery(patient, wounds);
      return { status: "completed" };
    }
    const approach = Move.approach(context, patient);
    if (approach) return approach;
    if (!this.state.supplyId) {
      const supply = findSupply(
        site,
        course.supplyDefinitionId,
        1,
        positionOf(site, bed.id)!,
        1,
        pawn.id,
      );
      if (!supply)
        return {
          status: "blocked",
          reason: `Bring ${course.supplyDefinitionId} beside the clinical bed (or carry it while working).`,
        };
      supply.amount--;
      this.state.supplyId = supply.id;
    }
    if (wounds)
      recoverWounds(
        patient.health!,
        care.woundCourse!.recovery / course.ticks,
        {
          actionId: pawn.queue[0]!.id,
          actorId: pawn.id,
          supplyId: this.state.supplyId!,
          tick: context.tick,
        },
      );
    else
      patient.health!.bloodLoss = Math.max(
        0,
        patient.health!.bloodLoss - care.bloodRecovery / course.ticks,
      );
    if (++this.state.workTicks < course.ticks) return { status: "running" };
    finishRecovery(patient, wounds);
    return { status: "completed" };
  }
}
