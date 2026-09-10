import type { EntityBase, Position } from "../Entity";
import type { DietRule } from "../../material/Material";
import type { Need } from "./Needs";
import type { QueuedAction } from "./actions/Action";
import type { ActionContext } from "./actions/Action";
import { advancePhysiology, type Health } from "./Health";
import type { Response } from "./Response";
import { chooseConcern, shouldInterrupt } from "./concerns/Concerns";
import { tickActionQueue } from "./actions/ActionQueue";
import { chooseAction } from "./Autonomy";

export interface Pawn extends EntityBase {
  kind: "pawn";
  mobile: boolean;
  canAct: boolean;
  autonomy: boolean;
  playerControllable: boolean;
  needs: Record<string, Need>;
  diet: readonly DietRule[];
  queue: QueuedAction[];
  patrol: Position[];
  health?: Health;
  response?: Response;
}

export function tickPawn(context: ActionContext): void {
  const { pawn } = context;
  advancePhysiology(pawn);
  const current = pawn.queue[0];
  const concern =
    current && pawn.autonomy && pawn.canAct && pawn.location.kind === "ground"
      ? chooseConcern(context)
      : null;
  if (current && concern && shouldInterrupt(current, concern))
    pawn.queue.shift();
  if (
    !pawn.queue.length &&
    pawn.autonomy &&
    pawn.canAct &&
    pawn.location.kind === "ground"
  ) {
    const action = chooseAction(context);
    if (action)
      pawn.queue.push({
        id: `autonomy:${context.tick}:${pawn.id}`,
        source: "autonomy",
        action,
        elapsed: 0,
        blockedReason: null,
      });
  }
  tickActionQueue(context);
}
