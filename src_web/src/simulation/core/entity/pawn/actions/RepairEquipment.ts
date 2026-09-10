import type { Action, ActionContext, ActionResult } from "./Action";
import type { Facility } from "../../Facility";
import type { Item } from "../../Item";
import { facilityInUse } from "../../Facility";
import { findSupply } from "../../Supply";
import { distance, positionOf } from "../../../site/TileMap";
import { Move } from "./Move";
import { equipmentUnderRepair } from "../../Equipment";

export interface RepairEquipmentState {
  kind: "repair-equipment";
  targetId: string;
  benchId: string;
  workTicks: number;
  supplyId?: string;
}

export class RepairEquipment implements Action {
  constructor(readonly state: RepairEquipmentState) {}
  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    if (target?.kind !== "item" || !target.equipment || target.amount <= 0)
      return "Choose an actual equipment item, not a case, restraint or specimen.";
    if (equipmentUnderRepair(site, target.id, pawn.id))
      return "Resolve the existing funded repair before starting another on this equipment.";
    if ((target.integrity ?? 100) >= 100)
      return "This equipment is already at full condition.";
    if (
      target.location.kind === "carried" &&
      target.location.carrierId !== pawn.id
    )
      return "Recover the equipment before attempting repairs; it belongs to another holder.";
    const bench = site.entities[this.state.benchId];
    if (
      bench?.kind !== "facility" ||
      !bench.equipmentRepair ||
      bench.location.kind !== "ground" ||
      (bench.integrity ?? 100) <= 0
    )
      return "A usable equipment repair bench is required.";
    if (facilityInUse(site, bench.id, pawn.id))
      return "The equipment repair bench is occupied.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.state.targetId] as Item;
    const bench = context.site.entities[this.state.benchId] as Facility;
    const approach = Move.approach(context, bench);
    if (approach) {
      this.state.workTicks = 0;
      return approach;
    }
    if (
      distance(
        positionOf(context.site, target.id)!,
        positionOf(context.site, bench.id)!,
      ) > 1
    ) {
      this.state.workTicks = 0;
      return {
        status: "blocked",
        reason: "Bring the actual equipment within one tile of the bench.",
      };
    }
    const repair = bench.equipmentRepair!;
    if (!this.state.supplyId) {
      const source = findSupply(
        context.site,
        repair.supplyDefinitionId,
        1,
        positionOf(context.site, bench.id)!,
        1,
        context.pawn.id,
      );
      if (!source)
        return {
          status: "blocked",
          reason: `Bring ${repair.supplyDefinitionId} beside the repair bench or carry it while working.`,
        };
      source.amount--;
      this.state.supplyId = source.id;
    }
    if (++this.state.workTicks < repair.ticks) return { status: "running" };
    target.integrity = Math.min(
      100,
      (target.integrity ?? 100) + repair.condition,
    );
    return { status: "completed" };
  }
}
