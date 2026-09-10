import type { ActionState } from "./entity/pawn/actions/Action";
import { actionHandler } from "./entity/pawn/actions/ActionQueue";
import type { Entity } from "./entity/Entity";
import type { Simulation } from "./Simulation";
import type { Materials } from "./material/Material";

export type Command =
  | {
      readonly kind: "duty";
      readonly siteId: string;
      readonly entityId: string;
      readonly targetId: string | null;
    }
  | {
      readonly kind: "enqueue";
      readonly siteId: string;
      readonly entityId: string;
      readonly action: ActionState;
    }
  | {
      readonly kind: "cancel";
      readonly siteId: string;
      readonly entityId: string;
      readonly actionId: string;
    }
  | {
      readonly kind: "autonomy";
      readonly siteId: string;
      readonly entityId: string;
      readonly enabled: boolean;
    };

export interface CommandContext {
  readonly source: "player" | "script" | "debug";
  readonly debugEnabled?: boolean;
}

export interface CommandResult {
  readonly state: Simulation;
  readonly code: "accepted" | "unchanged" | "rejected";
  readonly reason: string | null;
  readonly actionId?: string;
}

export function executeCommand(
  state: Simulation,
  command: Command,
  materials: Materials,
  context: CommandContext = { source: "player" },
): CommandResult {
  const fail = (reason: string): CommandResult => ({
    state,
    code: "rejected",
    reason,
  });
  const site = state.sites[command.siteId];
  const entity = site?.entities[command.entityId];
  if (!site || !entity || entity.kind !== "pawn")
    return fail("Choose a pawn at an existing site.");
  if (context.source === "debug" && !context.debugEnabled)
    return fail("Debug control is disabled.");
  if (context.source === "player" && !entity.playerControllable)
    return fail("Player control is unavailable.");
  let updated: Entity;
  let actionId: string | undefined;
  if (command.kind === "autonomy") {
    if (entity.autonomy === command.enabled)
      return { state, code: "unchanged", reason: null };
    updated = { ...entity, autonomy: command.enabled };
  } else if (command.kind === "duty") {
    if (command.targetId !== null) {
      const target = site.entities[command.targetId];
      if (target?.kind !== "facility" || !target.service)
        return fail("Choose a service counter at this worker's site.");
      updated = { ...entity, serviceDuty: target.id, autonomy: true };
    } else {
      const cleared = { ...entity };
      delete cleared.serviceDuty;
      updated = cleared;
    }
  } else if (command.kind === "cancel") {
    if (!entity.queue.some((entry) => entry.id === command.actionId))
      return fail("This action no longer exists.");
    updated = {
      ...entity,
      queue: entity.queue.filter((entry) => entry.id !== command.actionId),
    };
  } else {
    if (entity.queue.length >= 8) return fail("The action queue is full.");
    const action = command.action;
    if (!entity.canAct || entity.location.kind === "carried")
      return fail("This pawn cannot act in its current condition or location.");
    if (entity.queue.length === 0) {
      const reason = actionHandler(action).canStart({
        site,
        pawn: entity,
        tick: state.tick,
        materials,
        events: [],
      });
      if (reason) return fail(reason);
    }
    actionId = `action-${state.nextActionId}`;
    const intention = structuredClone(action);
    if ("workTicks" in intention) intention.workTicks = 0;
    if (intention.kind === "dispense") delete intention.paymentId;
    if (intention.kind === "nurse") delete intention.supplyId;
    if (intention.kind === "mend") {
      delete intention.material;
      delete intention.organ;
    }
    if (intention.kind === "service") {
      delete intention.supplyId;
      delete intention.repairSupplyId;
    }
    updated = {
      ...entity,
      queue: [
        ...entity.queue,
        {
          id: actionId,
          source: context.source,
          action: intention,
          elapsed: 0,
          blockedReason: null,
        },
      ],
    };
  }
  return {
    code: "accepted",
    reason: null,
    ...(actionId ? { actionId } : {}),
    state: {
      ...state,
      nextActionId: state.nextActionId + (actionId ? 1 : 0),
      sites: {
        ...state.sites,
        [site.id]: {
          ...site,
          entities: { ...site.entities, [entity.id]: updated },
        },
      },
    },
  };
}

export function previewCommand(
  state: Simulation,
  command: Command,
  materials: Materials,
  context?: CommandContext,
): Omit<CommandResult, "state"> {
  const { state: proposed, ...result } = executeCommand(
    state,
    command,
    materials,
    context,
  );
  return result;
}
