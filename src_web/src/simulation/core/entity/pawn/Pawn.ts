import type { EntityBase, Position } from "../Entity";
import type { DietRule } from "../../material/Material";
import type { Need } from "./Needs";
import type { QueuedAction } from "./actions/Action";
import type { ActionContext } from "./actions/Action";
import { advanceNeeds } from "./Needs";
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
}

export function tickPawn(context: ActionContext): void {
  const { pawn } = context;
  pawn.needs = advanceNeeds(pawn.needs);
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
