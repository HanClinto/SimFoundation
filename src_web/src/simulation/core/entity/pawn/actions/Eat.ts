import type { Action, ActionContext, ActionResult } from "./Action";
import type { Entity } from "../../Entity";
import { nourishmentFor } from "../../../material/Material";
import { Move } from "./Move";
import type { NeedActionProvider } from "../Needs";
import { findTarget } from "./FindTarget";
import { facilityInUse } from "../../Facility";
import { consumeMaterial } from "../../Consumption";

export class Eat implements Action {
  static readonly needAction: NeedActionProvider = {
    offer(context, needId) {
      if (needId !== "hunger") return null;
      const target = Eat.findFood(context);
      return target
        ? {
            action: { kind: "eat", targetId: target.id },
            relief: Math.min(
              context.pawn.needs.hunger!.value,
              Math.min(context.pawn.eatingRate, target.amount) *
                nourishmentFor(
                  context.materials[target.materialId]!,
                  context.pawn.diet,
                  target.nutrition,
                ),
            ),
          }
        : null;
    },
  };

  constructor(readonly targetId: string) {}

  canStart({ site, pawn, materials }: ActionContext): string | null {
    const target = site.entities[this.targetId];
    if (!target) return "The target is no longer present.";
    if (target.kind === "pawn")
      return "Living entities are not consumable objects.";
    if (target.kind === "facility" && facilityInUse(site, target.id))
      return "The facility is occupied.";
    if (
      Object.values(site.entities).some(
        (entity) =>
          entity.location.kind === "carried" &&
          entity.location.carrierId === target.id,
      )
    )
      return "Unload the target before consuming it.";
    if (
      target.location.kind === "carried" &&
      target.location.carrierId !== pawn.id
    )
      return "Another pawn is carrying the target.";
    const material = materials[target.materialId];
    if (
      !pawn.needs.hunger ||
      !material ||
      nourishmentFor(material, pawn.diet, target.nutrition) <= 0 ||
      !Number.isFinite(pawn.eatingRate) ||
      pawn.eatingRate <= 0 ||
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
    if (pawn.needs.hunger!.value <= 1e-9) return { status: "completed" };
    const approach = Move.approach(context, target);
    if (approach) return approach;
    const nourishment = nourishmentFor(
      materials[target.materialId]!,
      pawn.diet,
      target.nutrition,
    );
    const amount = Math.min(
      pawn.eatingRate,
      target.amount,
      pawn.needs.hunger!.value / nourishment,
    );
    pawn.needs.hunger!.value = Math.max(
      0,
      pawn.needs.hunger!.value - amount * nourishment,
    );
    consumeMaterial(target, amount);
    if (target.amount <= 1e-9) delete site.entities[target.id];
    return {
      status:
        !site.entities[target.id] || pawn.needs.hunger!.value <= 1e-9
          ? "completed"
          : "running",
    };
  }

  static findFood(context: ActionContext): Entity | null {
    return findTarget(
      context,
      (entity) => new Eat(entity.id).canStart(context) === null,
    );
  }
}
