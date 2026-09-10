import type { ActionState } from "../../simulation/core/entity/pawn/actions/Action";
import type { Entity } from "../../simulation/core/entity/Entity";

export function describeAction(action: ActionState): string {
  if (action.kind === "process")
    return `load/start ${action.recipeId} at ${action.targetId} with ${action.inputId} | winding ${action.workTicks}; machine owns cycle after activation`;
  if (action.kind === "watch")
    return `watch ${action.targetId} | ${action.workTicks}/${action.ticks} ticks; keep relief overlapping`;
  if (action.kind === "observe")
    return `observe ${action.targetId} with ${action.recorderId} | ${action.workTicks > 0 ? "watching for an actual impact" : "not yet watching"}`;
  if (action.kind === "craft")
    return `craft ${action.recipeId} at ${action.targetId} | work ${action.workTicks}${action.funding ? ` | spent ${action.funding.inputs.map((input) => `${input.amount} from ${input.sourceId}`).join(", ")}` : ""}`;
  if (action.kind === "capture")
    return `capture ${action.targetId} with ${action.restraintId} to (${action.destination.x},${action.destination.y}) | ${action.phase ?? "pending"} work ${action.workTicks}`;
  if (action.kind === "give")
    return `give ${action.targetId} to ${action.recipientId}`;
  if (action.kind === "door")
    return `set ${action.targetId} ${action.policy} | work ${action.workTicks}`;
  if (action.kind === "repair-equipment")
    return `repair ${action.targetId} at ${action.benchId} | work ${action.workTicks}${action.supplyId ? ` | part spent: ${action.supplyId}` : ""}`;
  if (action.kind === "rearm")
    return `rearm ${action.targetId} | work ${action.workTicks}${action.supplyId ? ` | unit spent: ${action.supplyId}` : ""}`;
  if (action.kind === "contain")
    return `contain ${action.targetId} in ${action.cellId} | work ${action.workTicks}`;
  if (action.kind === "restrain")
    return `restrain ${action.targetId} with ${action.restraintId} | work ${action.workTicks}`;
  if (action.kind === "service")
    return `service ${action.targetId} | work ${action.workTicks}${action.repairSupplyId ? ` | repair supply spent: ${action.repairSupplyId}` : ""}${action.supplyId ? ` | service input: ${action.supplyId}` : ""}`;
  if (action.kind === "take" && action.amount !== undefined)
    return `take ${action.amount} from ${action.targetId}`;
  if (action.kind === "mend")
    return `mend ${action.targetId}${action.organ ? ` ${action.organ}` : ""} | work ${action.workTicks}${action.material ? ` | fabric spent from ${action.material.sourceId}` : ""}`;
  if (action.kind === "nurse")
    return `nurse ${action.targetId} at ${action.bedId} | ${action.course ?? "blood/postoperative"} | work ${action.workTicks}${action.supplyId ? ` | pack spent: ${action.supplyId}` : ""}`;
  if (action.kind === "pack")
    return `pack ${action.targetId} in ${action.caseId} | work ${action.workTicks}`;
  if (action.kind === "unpack")
    return `unpack ${action.targetId} | work ${action.workTicks}`;
  if (action.kind === "dispense")
    return `dispense ${action.requestId} at ${action.targetId}${action.sourceId ? ` from ${action.sourceId}` : ""} | work ${action.workTicks}${action.paymentId ? " | PAID (nonrefundable)" : ""}`;
  if (action.kind === "deliver")
    return `deliver ${action.targetId} to (${action.destination.x},${action.destination.y})`;
  if (action.kind === "escort")
    return `escort ${action.targetId} to (${action.destination.x},${action.destination.y})`;
  if (action.kind === "follow")
    return `follow ${action.targetId} for ${action.escortActionId}`;
  if (action.kind === "move")
    return `move to (${action.destination.x},${action.destination.y})`;
  if (action.kind === "wait") return `wait ${action.ticks} ticks`;
  if (action.kind === "study")
    return `study ${action.planId} at ${action.targetId}`;
  return `${action.kind} ${action.targetId}`;
}

export function describeQueue(entity: Entity): string {
  if (entity.kind !== "pawn") return "Only pawns have action queues.";
  return (
    entity.queue
      .map(
        (entry, index) =>
          `${index + 1}. ${index === 0 ? "current" : "pending"} ${entry.id}: ${describeAction(entry.action)} [${entry.source}]${entry.blockedReason ? ` | blocked: ${entry.blockedReason}` : ""}`,
      )
      .join("\n") || "No queued actions."
  );
}
