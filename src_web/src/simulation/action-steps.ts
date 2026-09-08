import type { GameState } from "./state";
import { actionProgress, currentActionIdentity } from "./action-progress";
import { personCurrentAction } from "./person-actions";
import { sameTile, type TilePosition } from "./world";
import { mealCollectionPoint } from "./storage";
import { FIELD_EXTRACTION } from "./expedition-site";

export interface ActionExecutionStep {
  readonly parentKey: string;
  readonly source: string;
  readonly kind:
    | "walk"
    | "collect"
    | "carry"
    | "activity"
    | "work"
    | "prepare"
    | "recover"
    | "wait"
    | "open-door";
  readonly label: string;
  readonly path: readonly string[];
  readonly targetId?: string;
  readonly position?: TilePosition;
  readonly detail: string;
}

export function actionExecutionStep(
  state: GameState,
  actorId: string,
): ActionExecutionStep | null {
  const parent = currentActionIdentity(state, actorId);
  if (!parent) return null;
  const projected = personCurrentAction(state, actorId);
  const routine = state.routines.activities[actorId];
  const source = projected?.source ?? "player";
  const responder = state.combat.responders[actorId];
  const queue = state.actionQueues[actorId];
  const origin = state.world.positions[actorId];
  const progress = actionProgress(state, actorId);
  const base = { parentKey: parent.key, source };
  let step: Omit<ActionExecutionStep, "parentKey" | "source"> | null = null;
  const make = (
    kind: ActionExecutionStep["kind"],
    label: string,
    position?: TilePosition,
    targetId?: string,
    path: readonly string[] = [label],
  ) => ({
    kind,
    label,
    path,
    position,
    targetId,
    detail: progress?.detail ?? "",
  });
  if (responder?.incapacitated)
    step = make(
      "wait",
      responder.stabilized ? "Recover from injury" : "Await stabilization",
    );
  else if (queue && !queue.current.started && !routine && !projected)
    step = {
      ...make("wait", "Waiting to start"),
      detail: queue.current.blockedReason ?? "Waiting for action recovery.",
    };
  else if (routine && origin) {
    const station = state.routines.stations.find(
      (entry) => entry.id === routine.stationId,
    );
    const target = `object:${routine.stationId}`;
    if (routine.kind === "meal" && !routine.mealConsumed) {
      const pantry = mealCollectionPoint(state, origin);
      step =
        pantry && sameTile(origin, pantry)
          ? make("collect", "Pick up meal", pantry, undefined, [
              "Collect meal",
              "Pick up meal",
            ])
          : make("walk", "Walk to pantry", pantry ?? undefined, undefined, [
              "Collect meal",
              "Walk to pantry",
            ]);
    } else if (routine.kind === "meal" && routine.mealObjectId)
      step = make("carry", "Carry meal to seat", station?.position, target);
    else if (station && !sameTile(origin, station.position))
      step = make(
        "walk",
        routine.kind === "sleep" ? "Walk to bed" : "Walk to seat",
        station.position,
        target,
      );
    else
      step = make(
        "activity",
        routine.kind === "meal"
          ? "Eat meal"
          : routine.kind === "sleep"
            ? "Sleep in bed"
            : "Relax in seat",
        station?.position,
        target,
      );
  } else {
    const mission = state.expeditions.active;
    const recovery =
      mission?.site?.world.map.id === state.world.map.id
        ? mission.recoveryOrders.find(
            (entry) =>
              entry.personId === actorId && entry.phase !== "delivered",
          )
        : null;
    const job = state.jobs.find(
      (entry) =>
        entry.status === "in-progress" &&
        (entry.assignedPersonId === actorId ||
          entry.assessment?.patientId === actorId),
    );
    if (recovery) {
      const item = state.objects.items.find(
        (entry) => entry.id === recovery.objectId,
      );
      const position =
        recovery.phase === "carrying"
          ? FIELD_EXTRACTION
          : item?.location.kind === "ground"
            ? item.location.position
            : undefined;
      step = make(
        recovery.phase === "carrying"
          ? "carry"
          : origin && position && sameTile(origin, position)
            ? "work"
            : "walk",
        recovery.phase === "carrying"
          ? "Carry to extraction"
          : origin && position && sameTile(origin, position)
            ? "Secure cargo"
            : "Walk to cargo",
        position,
        `object:${recovery.objectId}`,
      );
    } else if (
      responder?.drafted &&
      responder.destination &&
      (responder.order === "move" || responder.order === "retreat")
    )
      step = make("walk", "Walk to destination", responder.destination);
    else if (responder?.drafted && responder.phase === "recovering")
      step = make("recover", "Recover from action");
    else if (responder?.drafted && responder.order === "stabilize")
      step = make(
        responder.phase === "preparing" ? "work" : "walk",
        responder.phase === "preparing"
          ? "Treat colleague"
          : "Approach colleague",
        state.world.positions[responder.targetId!],
        responder.targetId!,
      );
    else if (
      responder?.drafted &&
      ["attack", "engage"].includes(responder.order)
    )
      step = make(
        responder.phase === "preparing"
          ? "prepare"
          : responder.order === "attack"
            ? "walk"
            : "wait",
        responder.phase === "preparing"
          ? "Prepare response"
          : responder.order === "attack"
            ? "Approach firing position"
            : "Await firing opportunity",
      );
    else if (job)
      step = make(
        origin && !sameTile(origin, job.workSite) ? "walk" : "work",
        origin && !sameTile(origin, job.workSite)
          ? "Travel to work site"
          : "Perform work",
        job.workSite,
      );
  }
  if (step && progress?.kind === "blocked")
    step = {
      ...step,
      kind: "wait",
      label: "Route blocked",
      path: [...step.path, "Route blocked"],
    };
  if (
    step &&
    responder?.blockedReason &&
    !responder.blockedReason.startsWith("Approaching ")
  )
    step = {
      ...step,
      kind: "wait",
      label: "Waiting",
      path: [...step.path, "Waiting"],
      detail: responder.blockedReason,
    };
  const door = state.actionTimings[actorId];
  if (
    door?.key === parent.key &&
    door.mapId === state.world.map.id &&
    door.doorStep?.tick === state.tick
  ) {
    const position = door.doorStep.position;
    return {
      ...base,
      kind: "open-door",
      label: "Open door",
      path: [...(step?.path ?? []), "Open door"],
      position,
      targetId: `tile:${position.x},${position.y}:structure`,
      detail: `Opened door at ${position.x}, ${position.y}; the parent intention continues. ${progress?.detail ?? ""}`,
    };
  }
  return step ? { ...base, ...step } : null;
}
