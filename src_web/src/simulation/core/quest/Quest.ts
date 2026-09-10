import type { Simulation, TickEvent } from "../Simulation";
import type { ActionState } from "../entity/pawn/actions/Action";
import { distance, positionOf } from "../site/TileMap";

export type Condition =
  | {
      kind: "event";
      event: TickEvent["kind"];
      actor?: string;
      target?: string;
      action?: ActionState["kind"];
      count: number;
    }
  | { kind: "need"; actor: string; need: string; maximum: number }
  | { kind: "amount"; entity: string; minimum: number }
  | { kind: "stock"; materialId: string; minimum: number }
  | { kind: "acting"; actor: string; value: boolean }
  | { kind: "distance"; first: string; second: string; minimum: number }
  | { kind: "elapsed"; ticks: number };

export interface Objective {
  id: string;
  description: string;
  condition: Condition;
}

export interface Quest {
  id: string;
  name: string;
  deadline: number;
  objectives: readonly Objective[];
  failures: readonly Objective[];
}

export interface QuestState {
  questId: string;
  siteId: string;
  startedTick: number;
  evaluatedTick: number;
  counts: Record<string, number>;
  status: "active" | "succeeded" | "failed";
  reason: string | null;
}

export function startQuest(
  quest: Quest,
  siteId: string,
  tick: number,
): QuestState {
  return {
    questId: quest.id,
    siteId,
    startedTick: tick,
    evaluatedTick: tick - 1,
    counts: {},
    status: "active",
    reason: null,
  };
}

export function conditionMet(
  condition: Condition,
  progress: QuestState,
  state: Simulation,
  objectiveId: string,
): boolean {
  const site = state.sites[progress.siteId];
  const resolve = (local: string) => `${progress.siteId}:${local}`;
  switch (condition.kind) {
    case "elapsed":
      return state.tick - progress.startedTick >= condition.ticks;
    case "event":
      return (progress.counts[objectiveId] ?? 0) >= condition.count;
    case "amount":
      return (
        (site?.entities[resolve(condition.entity)]?.amount ?? 0) >=
        condition.minimum
      );
    case "stock":
      return (
        Object.values(site?.entities ?? {}).reduce(
          (total, entity) =>
            total +
            (entity.materialId === condition.materialId ? entity.amount : 0),
          0,
        ) >= condition.minimum
      );
    case "acting": {
      const actor = site?.entities[resolve(condition.actor)];
      return actor?.kind === "pawn" && actor.canAct === condition.value;
    }
    case "need": {
      const actor = site?.entities[resolve(condition.actor)];
      const need = actor?.kind === "pawn" ? actor.needs[condition.need] : null;
      return !!need && need.value <= condition.maximum;
    }
    case "distance": {
      const first = site && positionOf(site, resolve(condition.first));
      const second = site && positionOf(site, resolve(condition.second));
      return (
        !!first && !!second && distance(first, second) >= condition.minimum
      );
    }
  }
}

export function evaluateQuest(
  quest: Quest,
  progress: QuestState,
  state: Simulation,
  events: readonly TickEvent[],
): QuestState {
  if (progress.status !== "active" || state.tick <= progress.evaluatedTick)
    return progress;
  const next: QuestState = {
    ...progress,
    counts: { ...progress.counts },
    evaluatedTick: state.tick,
  };
  for (const objective of [...quest.objectives, ...quest.failures]) {
    const condition = objective.condition;
    if (condition.kind !== "event") continue;
    const matches = events.filter(
      (event) =>
        event.siteId === progress.siteId &&
        event.kind === condition.event &&
        (!condition.actor ||
          event.entityId === `${progress.siteId}:${condition.actor}`) &&
        (!condition.target ||
          event.targetId === `${progress.siteId}:${condition.target}`) &&
        (!condition.action || event.actionKind === condition.action),
    );
    next.counts[objective.id] =
      (next.counts[objective.id] ?? 0) + matches.length;
  }
  const failure = quest.failures.find((objective) =>
    conditionMet(objective.condition, next, state, objective.id),
  );
  if (failure)
    return { ...next, status: "failed", reason: failure.description };
  if (
    quest.objectives.every((objective) =>
      conditionMet(objective.condition, next, state, objective.id),
    )
  )
    return {
      ...next,
      status: "succeeded",
      reason: "All objectives satisfied.",
    };
  if (state.tick - progress.startedTick >= quest.deadline)
    return {
      ...next,
      status: "failed",
      reason: "Deadline reached with incomplete objectives.",
    };
  return next;
}
