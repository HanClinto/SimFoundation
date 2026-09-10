import type { Action, ActionContext, ActionResult } from "./Action";
import {
  availableForRecovery,
  wornEquipment,
  equipmentUnderRepair,
} from "../../Equipment";
import type { Item } from "../../Item";
import { Move } from "./Move";
import { positionOf } from "../../../site/TileMap";

export class Equip implements Action {
  constructor(
    readonly targetId: string,
    readonly remove = false,
  ) {}

  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.targetId];
    if (target?.kind !== "item" || !target.equipment)
      return "Choose actual wearable equipment.";
    if (equipmentUnderRepair(site, target.id))
      return "Finish or cancel the funded equipment repair before moving this gear.";
    if (this.remove)
      return target.equipment.worn &&
        target.location.kind === "carried" &&
        target.location.carrierId === pawn.id
        ? null
        : "This worker is not wearing that equipment.";
    if (!availableForRecovery(site, target, pawn.id))
      return "Another living person owns this equipment.";
    if ((target.integrity ?? 100) <= 0 || target.amount <= 0)
      return "This equipment is broken or depleted.";
    const worn = wornEquipment(site, pawn.id, target.equipment.slot);
    if (worn) return "Unequip the occupied slot before fitting another item.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.targetId] as Item;
    if (!this.remove) {
      const approach = Move.approach(context, target);
      if (approach) return approach;
    }
    target.equipment!.worn = !this.remove;
    target.location = this.remove
      ? {
          kind: "ground",
          position: { ...positionOf(context.site, context.pawn.id)! },
        }
      : { kind: "carried", carrierId: context.pawn.id };
    return { status: "completed" };
  }
}
