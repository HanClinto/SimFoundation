import type { Action, ActionContext, ActionResult } from "./Action";
import type { Entity } from "../../Entity";
import { nourishmentFor } from "../../../material/Material";
import { distance, positionOf } from "../../../site/TileMap";
import { interactionRoute } from "../../../site/Pathfinding";
import { Move } from "./Move";

export class Eat implements Action {
  constructor(readonly targetId: string) {}

  canStart({ site, pawn, materials }: ActionContext): string | null {
    const target = site.entities[this.targetId];
    if (!target) return "The target is no longer present.";
    if (target.kind !== "item") return "Only loose items can be consumed yet.";
    if (
      target.location.kind === "carried" &&
      target.location.carrierId !== pawn.id
    )
      return "Another pawn is carrying the target.";
    const material = materials[target.materialId];
    if (
      !pawn.needs.hunger ||
      !material ||
      nourishmentFor(material, pawn.diet) <= 0 ||
      target.amount <= 0
    )
      return "This pawn cannot consume that material.";
    return null;
  }

  tick(context: ActionContext): ActionResult {
    const reason = this.canStart(context);
    if (reason) return { status: "blocked", reason };
    const { site, pawn, materials } = context;
    const target = site.entities[this.targetId]!;
    const approach = Move.approach(context, target);
    if (approach) return approach;
    const amount = Math.min(1, target.amount);
    pawn.needs.hunger!.value = Math.max(
      0,
      pawn.needs.hunger!.value -
        amount * nourishmentFor(materials[target.materialId]!, pawn.diet),
    );
    target.amount -= amount;
    if (target.amount === 0) delete site.entities[target.id];
    return { status: "completed" };
  }

  static findFood(context: ActionContext): Entity | null {
    const { site, pawn } = context;
    const origin = positionOf(site, pawn.id);
    if (!origin) return null;
    const candidates = Object.values(site.entities).filter(
      (entity) => new Eat(entity.id).canStart(context) === null,
    );
    candidates.sort((first, second) => {
      const firstPosition = positionOf(site, first.id);
      const secondPosition = positionOf(site, second.id);
      return (
        (firstPosition ? distance(origin, firstPosition) : Infinity) -
          (secondPosition ? distance(origin, secondPosition) : Infinity) ||
        (first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
      );
    });
    return (
      candidates.find((entity) => {
        const path = interactionRoute(site, pawn.id, entity.id);
        return path !== null && (pawn.mobile || path.length === 0);
      }) ?? null
    );
  }
}
