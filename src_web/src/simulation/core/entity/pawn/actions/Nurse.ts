import type { Action, ActionContext, ActionResult } from "./Action";
import type { Pawn } from "../Pawn";
import { incapacitated } from "../Health";
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
}

function finishRecovery(patient: Pawn): void {
  if (
    (patient.health?.incapacity === "blood-loss" ||
      patient.health?.incapacity === "postoperative") &&
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
    if (
      patient.health!.bloodLoss <= 0 &&
      patient.health!.incapacity !== "postoperative"
    ) {
      finishRecovery(patient);
      return { status: "completed" };
    }
    const approach = Move.approach(context, patient);
    if (approach) return approach;
    if (!this.state.supplyId) {
      const supply = findSupply(
        site,
        care.supplyDefinitionId,
        1,
        positionOf(site, bed.id)!,
        1,
        pawn.id,
      );
      if (!supply)
        return {
          status: "blocked",
          reason: `Bring ${care.supplyDefinitionId} beside the clinical bed (or carry it while working).`,
        };
      supply.amount--;
      this.state.supplyId = supply.id;
    }
    patient.health!.bloodLoss = Math.max(
      0,
      patient.health!.bloodLoss - care.bloodRecovery / care.ticks,
    );
    if (++this.state.workTicks < care.ticks) return { status: "running" };
    finishRecovery(patient);
    return { status: "completed" };
  }
}
