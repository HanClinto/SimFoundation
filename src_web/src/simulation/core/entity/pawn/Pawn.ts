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
import type { OrganMending } from "./actions/Mend";
import { restraintFor, tickCustody } from "./Custody";
import { directWatchers } from "./Attention";

export interface Pawn extends EntityBase {
  kind: "pawn";
  mobile: boolean;
  canAct: boolean;
  autonomy: boolean;
  playerControllable: boolean;
  acceptsEscort?: boolean;
  requiresRestraint?: boolean;
  stillWhenWatched?: boolean;
  human?: boolean;
  ageYears?: number;
  organMending?: OrganMending;
  serviceDuty?: string;
  needs: Record<string, Need>;
  diet: readonly DietRule[];
  eatingRate: number;
  queue: QueuedAction[];
  patrol: Position[];
  health?: Health;
  response?: Response;
}

export function tickPawn(context: ActionContext): void {
  const { pawn } = context;
  const notice = advancePhysiology(pawn, context.tick);
  if (notice)
    context.events.push({
      siteId: context.site.id,
      entityId: pawn.id,
      ...notice,
    });
  tickCustody(
    context.site.entities,
    pawn,
    context.site.id,
    context.events,
    context.tick,
  );
  if (pawn.health?.death) {
    for (const entry of pawn.queue)
      context.events.push({
        siteId: context.site.id,
        entityId: pawn.id,
        actionId: entry.id,
        actionKind: entry.action.kind,
        kind: "interrupted",
        reason: "The worker died.",
      });
    pawn.queue = [];
    return;
  }
  if (
    pawn.stillWhenWatched &&
    directWatchers(context.site, pawn.id).length > 0
  ) {
    const current = pawn.queue[0];
    if (current) {
      if ("workTicks" in current.action) current.action.workTicks = 0;
      current.blockedReason = "Held still by active direct observation.";
    }
    return;
  }
  if (
    restraintFor(context.site.entities, pawn.id) &&
    pawn.queue[0]?.action.kind !== "follow"
  ) {
    for (const entry of pawn.queue)
      context.events.push({
        siteId: context.site.id,
        entityId: pawn.id,
        actionId: entry.id,
        kind: "interrupted",
        actionKind: entry.action.kind,
        reason: "Physical restraints prevent independent work.",
      });
    pawn.queue = [];
    return;
  }
  const current = pawn.queue[0];
  const concern =
    current && pawn.autonomy && pawn.canAct && pawn.location.kind === "ground"
      ? chooseConcern(context)
      : null;
  if (current && concern && shouldInterrupt(current, concern)) {
    pawn.queue.shift();
    context.events.push({
      siteId: context.site.id,
      entityId: pawn.id,
      actionId: current.id,
      actionKind: current.action.kind,
      kind: "interrupted",
      reason: `Responding to ${concern.kind}: ${concern.causeId}`,
    });
  }
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
