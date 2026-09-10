import type { Action, ActionContext, ActionResult } from "./Action";
import type { Item } from "../../Item";
import { findSupply } from "../../Supply";
import { positionOf } from "../../../site/TileMap";

export interface RearmState {
  kind: "rearm";
  targetId: string;
  workTicks: number;
  supplyId?: string;
}

export class Rearm implements Action {
  constructor(readonly state: RearmState) {}
  canStart({ site, pawn }: ActionContext): string | null {
    const target = site.entities[this.state.targetId];
    const capability =
      target?.kind === "item"
        ? (target.equipment?.subdual ?? target.equipment?.medicine)
        : undefined;
    if (
      target?.kind !== "item" ||
      !capability?.rearm ||
      !target.equipment ||
      !target.equipment.worn ||
      target.location.kind !== "carried" ||
      target.location.carrierId !== pawn.id ||
      (target.integrity ?? 100) <= 0
    )
      return "Wear a serviceable rearmable tool or medical kit.";
    if (
      ("charges" in capability ? capability.charges : capability.supplies) >=
      capability.rearm.capacity
    )
      return "This equipment is already at capacity.";
    return null;
  }
  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const target = context.site.entities[this.state.targetId] as Item;
    const capability = (target.equipment!.subdual ??
      target.equipment!.medicine)!;
    const rearm = capability.rearm!;
    if (!this.state.supplyId) {
      const source = findSupply(
        context.site,
        rearm.supplyDefinitionId,
        1,
        positionOf(context.site, context.pawn.id)!,
        1,
        context.pawn.id,
      );
      if (!source)
        return {
          status: "blocked",
          reason: `Bring a physical ${rearm.supplyDefinitionId} beside this worker or carry it.`,
        };
      source.amount--;
      this.state.supplyId = source.id;
    }
    if (++this.state.workTicks < rearm.ticks) return { status: "running" };
    if ("charges" in capability) capability.charges++;
    else capability.supplies++;
    return { status: "completed" };
  }
}
