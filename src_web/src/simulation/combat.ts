import type { GameState } from "./state";
import { recordDoorOpening } from "./action-progress";
import {
  findRoute,
  sameTile,
  stepWorld,
  isWalkable,
  type TilePosition,
} from "./world";
import { canObserve } from "./observations";

export type TacticalOrder =
  | "hold"
  | "move"
  | "retreat"
  | "attack"
  | "engage"
  | "stabilize";
export interface ResponderState {
  readonly returnToAutonomy?: boolean;
  readonly drafted: boolean;
  readonly order: TacticalOrder;
  readonly destination: TilePosition | null;
  readonly targetId: string | null;
  readonly phase: "ready" | "preparing" | "recovering";
  readonly remaining: number;
  readonly health: number;
  readonly injuries: number;
  readonly incapacitated: boolean;
  readonly stabilized: boolean;
  readonly blockedReason: string | null;
  readonly ammunition: number;
  readonly medicalSupplies: number;
  readonly recovery: number;
  readonly lastShotTick: number | null;
}
export interface AdversaryState {
  readonly id: "SCP-049-2";
  readonly position: TilePosition;
  readonly origin: TilePosition;
  readonly health: number;
  readonly phase: "ready" | "preparing" | "recovering";
  readonly remaining: number;
  readonly targetId: string | null;
  readonly lastKnown: TilePosition | null;
}
export interface CombatState {
  readonly responders: Readonly<Record<string, ResponderState>>;
  readonly adversary: AdversaryState | null;
  readonly sighting: {
    readonly adversary: AdversaryState;
    readonly observedTick: number;
  } | null;
  readonly participants: readonly string[];
  readonly status: "idle" | "active" | "neutralized" | "withdrawn";
  readonly withdrawalTicks: number;
  readonly events: readonly { readonly tick: number; readonly text: string }[];
}
export const RESPONSE_RANGE = 5;
export const RESPONSE_PREPARATION = 3;
export const RESPONSE_RECOVERY = 3;
export const ENCOUNTER_RADIUS = 10;
export function adversaryBehavior(combat: CombatState): string {
  const actor = combat.adversary;
  if (!actor) return "No adversary";
  if (actor.health <= 0) return "Neutralized";
  if (combat.status !== "active") return "Encounter suspended";
  if (actor.phase === "preparing") return "Preparing adjacent attack";
  if (actor.phase === "recovering") return "Recovering from action";
  if (actor.targetId) return "Pursuing visible responder";
  return actor.lastKnown
    ? "Investigating last sighting"
    : "Patrolling; no visible target";
}
export type TacticalCode =
  | "accepted"
  | "not-found"
  | "busy"
  | "not-drafted"
  | "incapacitated"
  | "unreachable"
  | "invalid-order";
export const readyResponder = (): ResponderState => ({
  drafted: false,
  order: "hold",
  destination: null,
  targetId: null,
  phase: "ready",
  remaining: 0,
  health: 100,
  injuries: 0,
  incapacitated: false,
  stabilized: false,
  blockedReason: null,
  ammunition: 12,
  medicalSupplies: 2,
  recovery: 0,
  lastShotTick: null,
});
export const createCombatState = (): CombatState => ({
  responders: {},
  adversary: null,
  sighting: null,
  participants: [],
  status: "idle",
  withdrawalTicks: 0,
  events: [],
});
const distance = (first: TilePosition, second: TilePosition) =>
  Math.hypot(first.x - second.x, first.y - second.y);
export function tacticallyUnavailable(state: GameState, id: string): boolean {
  const responder = state.combat.responders[id];
  return !!responder && (responder.drafted || responder.incapacitated);
}

export function draftResponder(
  state: GameState,
  id: string,
  drafted: boolean,
): { state: GameState; code: TacticalCode } {
  if (typeof drafted !== "boolean") return { state, code: "invalid-order" };
  if (!state.personnel.some((person) => person.id === id))
    return { state, code: "not-found" };
  const responder = state.combat.responders[id] ?? readyResponder();
  if (responder.incapacitated) return { state, code: "incapacitated" };
  if (
    !drafted &&
    (responder.phase === "recovering" ||
      (responder.injuries > 0 && !responder.stabilized) ||
      (state.combat.status === "active" &&
        state.combat.participants.includes(id)))
  )
    return { state, code: "busy" };
  if (responder.drafted === drafted) return { state, code: "accepted" };
  if (
    state.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === id,
    ) ||
    state.jobs.some(
      (job) =>
        job.status === "in-progress" &&
        !!job.assessment &&
        (job.assignedPersonId === id || job.assessment.patientId === id),
    )
  )
    return { state, code: "busy" };
  const activities = { ...state.routines.activities };
  delete activities[id];
  return {
    code: "accepted",
    state: {
      ...state,
      combat: {
        ...state.combat,
        responders: {
          ...state.combat.responders,
          [id]: {
            ...responder,
            drafted,
            returnToAutonomy: false,
            order: "hold",
            destination: null,
            targetId: null,
            phase: "ready",
            remaining: 0,
            blockedReason: null,
          },
        },
      },
      routines: { ...state.routines, activities },
      personnel: state.personnel.map((person) =>
        person.id === id
          ? {
              ...person,
              currentJobId: null,
              activity: drafted
                ? "Drafted: holding position"
                : "Released from tactical duty",
            }
          : person,
      ),
      jobs: state.jobs.map((job) =>
        job.assignedPersonId === id && job.status === "in-progress"
          ? {
              ...job,
              status: "available",
              assignedPersonId: null,
              assignmentReason: "Worker drafted; progress retained.",
            }
          : job,
      ),
    },
  };
}

export function orderResponder(
  state: GameState,
  id: string,
  order: TacticalOrder,
  destination?: TilePosition,
  targetId?: string,
): { state: GameState; code: TacticalCode } {
  const responder = state.combat.responders[id];
  if (!responder?.drafted) return { state, code: "not-drafted" };
  if (responder.incapacitated) return { state, code: "incapacitated" };
  if (
    state.routines.activities[id]?.source === "player" &&
    state.objects.items.some(
      (item) =>
        item.location.kind === "carried" && item.location.personId === id,
    )
  )
    return { state, code: "busy" };
  if (
    !["hold", "move", "retreat", "attack", "engage", "stabilize"].includes(
      order,
    )
  )
    return { state, code: "invalid-order" };
  const moving = order === "move" || order === "retreat";
  if (
    moving &&
    (!destination ||
      !Number.isInteger(destination.x) ||
      !Number.isInteger(destination.y) ||
      findRoute(state.world.map, state.world.positions[id]!, destination) ===
        null)
  )
    return { state, code: "unreachable" };
  if (
    (order === "engage" || order === "attack") &&
    (state.combat.status !== "active" ||
      targetId !== "SCP-049-2" ||
      !state.combat.participants.includes(id))
  )
    return { state, code: "invalid-order" };
  if (
    order === "stabilize" &&
    (!targetId ||
      targetId === id ||
      !state.combat.responders[targetId] ||
      state.combat.responders[targetId]!.injuries === 0 ||
      state.combat.responders[targetId]!.stabilized ||
      responder.medicalSupplies <= 0)
  )
    return { state, code: "invalid-order" };
  const activities = { ...state.routines.activities };
  if (activities[id]?.source === "player") delete activities[id];
  return {
    code: "accepted",
    state: {
      ...state,
      routines: { ...state.routines, activities },
      combat: {
        ...state.combat,
        responders: {
          ...state.combat.responders,
          [id]: {
            ...responder,
            order,
            returnToAutonomy: false,
            destination: moving ? { ...destination! } : null,
            targetId:
              order === "engage" || order === "attack" || order === "stabilize"
                ? targetId!
                : null,
            phase: responder.phase === "recovering" ? "recovering" : "ready",
            remaining:
              responder.phase === "recovering" ? responder.remaining : 0,
            blockedReason: null,
          },
        },
      },
    },
  };
}

export function advanceTacticalMovement(state: GameState): GameState {
  let world = state.world;
  const responders = { ...state.combat.responders };
  const activities = new Map<string, string>();
  for (const id of Object.keys(responders).sort()) {
    const responder = responders[id]!;
    if (
      !responder.drafted ||
      responder.incapacitated ||
      !responder.destination ||
      !["move", "retreat"].includes(responder.order)
    )
      continue;
    const route = findRoute(
      world.map,
      world.positions[id]!,
      responder.destination,
    );
    if (route === null) {
      responders[id] = {
        ...responder,
        blockedReason: "Route blocked; order retained.",
      };
      activities.set(id, "Drafted: route blocked");
      continue;
    }
    if (route[0])
      world = stepWorld(world, id, route[0], (position) => {
        state = recordDoorOpening(state, id, position);
      });
    const arrived = sameTile(world.positions[id]!, responder.destination);
    responders[id] = {
      ...responder,
      order: arrived ? "hold" : responder.order,
      destination: arrived ? null : responder.destination,
      blockedReason: null,
    };
    activities.set(
      id,
      arrived
        ? "Drafted: holding position"
        : responder.order === "retreat"
          ? "Drafted: withdrawing"
          : "Drafted: moving",
    );
  }
  return {
    ...state,
    world,
    combat: { ...state.combat, responders },
    personnel: state.personnel.map((person) =>
      activities.has(person.id)
        ? { ...person, activity: activities.get(person.id)! }
        : person,
    ),
  };
}

export function startEncounter(
  state: GameState,
  position: TilePosition,
): { state: GameState; code: TacticalCode } {
  const participants = Object.keys(state.combat.responders)
    .filter(
      (id) =>
        state.combat.responders[id]!.drafted &&
        !state.combat.responders[id]!.incapacitated,
    )
    .sort();
  if (
    state.combat.status === "active" ||
    participants.length < 2 ||
    participants.length > 3 ||
    participants.some(
      (id) => state.routines.activities[id]?.source === "player",
    ) ||
    Object.values(state.combat.responders).some(
      (responder) => responder.incapacitated,
    )
  )
    return { state, code: "busy" };
  if (
    !Number.isInteger(position.x) ||
    !Number.isInteger(position.y) ||
    !isWalkable(state.world.map, position) ||
    state.world.map.tiles[position.y * state.world.map.width + position.x] !==
      "floor" ||
    Object.values(state.world.positions).some((other) =>
      sameTile(other, position),
    ) ||
    state.objects.items.some(
      (item) =>
        item.installed &&
        item.kind !== "cable" &&
        item.location.kind === "ground" &&
        sameTile(item.location.position, position),
    )
  )
    return { state, code: "unreachable" };
  if (
    !participants.some(
      (id) =>
        findRoute(state.world.map, state.world.positions[id]!, position) !==
        null,
    )
  )
    return { state, code: "unreachable" };
  const adversary: AdversaryState = {
    id: "SCP-049-2",
    position: { ...position },
    origin: { ...position },
    health: 120,
    phase: "ready",
    remaining: 0,
    targetId: null,
    lastKnown: null,
  };
  return {
    code: "accepted",
    state: {
      ...state,
      combat: {
        ...state.combat,
        adversary,
        sighting: null,
        participants,
        status: "active",
        withdrawalTicks: 0,
        events: [
          { tick: state.tick, text: "Isolated 049-2 encounter started." },
        ],
      },
    },
  };
}

export function engagementIssue(state: GameState, id: string): string | null {
  const responder = state.combat.responders[id];
  const adversary = state.combat.adversary;
  if (!responder?.drafted || responder.incapacitated)
    return "Responder unavailable.";
  if (!adversary || state.combat.status !== "active" || adversary.health <= 0)
    return "No active target.";
  if (!state.combat.participants.includes(id))
    return "Not assigned to this encounter.";
  if (responder.ammunition <= 0) return "Ammunition exhausted; withdraw.";
  const origin = state.world.positions[id]!;
  if (distance(origin, adversary.position) > RESPONSE_RANGE)
    return "Target outside response range.";
  if (!canObserve(state.world.map, origin, adversary.position, RESPONSE_RANGE))
    return "Line of sight blocked.";
  return null;
}

function attackRoute(
  state: GameState,
  id: string,
): readonly TilePosition[] | null {
  const origin = state.world.positions[id]!;
  const target = state.combat.adversary!.position;
  const candidates: TilePosition[] = [];
  for (
    let row = target.y - RESPONSE_RANGE;
    row <= target.y + RESPONSE_RANGE;
    row += 1
  ) {
    for (
      let column = target.x - RESPONSE_RANGE;
      column <= target.x + RESPONSE_RANGE;
      column += 1
    ) {
      const position = { x: column, y: row };
      if (
        !sameTile(position, target) &&
        isWalkable(state.world.map, position) &&
        distance(position, target) <= RESPONSE_RANGE &&
        canObserve(state.world.map, position, target, RESPONSE_RANGE)
      )
        candidates.push(position);
    }
  }
  const minimumSteps = (position: TilePosition) =>
    Math.abs(position.x - origin.x) + Math.abs(position.y - origin.y);
  candidates.sort(
    (first, second) =>
      minimumSteps(first) - minimumSteps(second) ||
      first.y - second.y ||
      first.x - second.x,
  );
  let best: readonly TilePosition[] | null = null;
  for (const position of candidates) {
    if (best && minimumSteps(position) >= best.length) break;
    const route = findRoute(state.world.map, origin, position);
    if (route && (!best || route.length < best.length)) best = route;
  }
  return best;
}

export function advanceCombat(state: GameState): GameState {
  for (const [id, responder] of Object.entries(state.combat.responders)) {
    if (
      responder.returnToAutonomy &&
      responder.order === "hold" &&
      responder.phase === "ready"
    )
      state = draftResponder(state, id, false).state;
  }
  state = advanceTacticalMovement(state);
  let responders = { ...state.combat.responders };
  let adversary = state.combat.adversary;
  let events = [...state.combat.events];
  const report = (text: string) => {
    events.push({ tick: state.tick, text });
    events = events.slice(-40);
  };
  const working = () => ({
    ...state,
    combat: { ...state.combat, responders, adversary },
  });
  for (const id of Object.keys(responders).sort()) {
    let responder = responders[id]!;
    if (
      responder.injuries > 0 &&
      !responder.stabilized &&
      !responder.incapacitated
    ) {
      const health = Math.max(0, responder.health - 1);
      responder = { ...responder, health, incapacitated: health === 0 };
      if (health === 0)
        report(
          `${state.personnel.find((person) => person.id === id)!.name} incapacitated; stabilization needed.`,
        );
    }
    if (responder.incapacitated && responder.stabilized) {
      const recovery = responder.recovery + 1;
      responder = {
        ...responder,
        recovery,
        ...(recovery >= 12
          ? {
              incapacitated: false,
              health: 25,
              recovery: 0,
              blockedReason: null,
              order: "hold" as const,
            }
          : {}),
      };
      if (recovery >= 12)
        report(
          `${state.personnel.find((person) => person.id === id)!.name} can withdraw after stabilization.`,
        );
    }
    if (responder.incapacitated)
      responder = {
        ...responder,
        order: "hold",
        destination: null,
        targetId: null,
        phase: "ready",
        remaining: 0,
        blockedReason: null,
      };
    responders[id] = responder;
    if (!responder.drafted || responder.incapacitated) continue;
    if (responder.phase === "recovering") {
      responders[id] = {
        ...responder,
        remaining: Math.max(0, responder.remaining - 1),
        phase: responder.remaining <= 1 ? "ready" : "recovering",
      };
      continue;
    }
    if (responder.order === "engage" || responder.order === "attack") {
      const issue = engagementIssue(working(), id);
      if (issue) {
        let blockedReason = issue;
        if (
          responder.order === "attack" &&
          adversary &&
          adversary.health > 0 &&
          state.combat.status === "active" &&
          state.combat.participants.includes(id) &&
          responder.ammunition > 0
        ) {
          const route = attackRoute(working(), id);
          if (route?.[0]) {
            const world = stepWorld(state.world, id, route[0], (position) => {
              state = recordDoorOpening(state, id, position);
            });
            state = { ...state, world };
          }
          blockedReason = route
            ? "Approaching firing position."
            : "No reachable firing position.";
        }
        responders[id] = {
          ...responder,
          phase: "ready",
          remaining: 0,
          blockedReason,
        };
        continue;
      }
      if (responder.phase === "ready")
        responders[id] = {
          ...responder,
          phase: "preparing",
          remaining: RESPONSE_PREPARATION,
          blockedReason: null,
        };
      else if (responder.remaining > 1)
        responders[id] = { ...responder, remaining: responder.remaining - 1 };
      else {
        adversary = {
          ...adversary!,
          health: Math.max(0, adversary!.health - 24),
        };
        responders[id] = {
          ...responder,
          ammunition: responder.ammunition - 1,
          lastShotTick: state.tick,
          phase: "recovering",
          remaining: RESPONSE_RECOVERY,
        };
        report(
          `${state.personnel.find((person) => person.id === id)!.name}: response hit.`,
        );
      }
    } else if (responder.order === "stabilize") {
      const patientId = responder.targetId!;
      const patient = responders[patientId];
      const origin = state.world.positions[id]!;
      const target = state.world.positions[patientId];
      if (
        patient &&
        target &&
        patient.injuries > 0 &&
        !patient.stabilized &&
        responder.medicalSupplies > 0 &&
        (distance(origin, target) > 1 ||
          !canObserve(state.world.map, origin, target, 1))
      ) {
        const route = [
          target,
          { x: target.x - 1, y: target.y },
          { x: target.x + 1, y: target.y },
          { x: target.x, y: target.y - 1 },
          { x: target.x, y: target.y + 1 },
        ]
          .filter(
            (position) =>
              isWalkable(state.world.map, position) &&
              canObserve(state.world.map, position, target, 1),
          )
          .map((position) => findRoute(state.world.map, origin, position))
          .filter((route): route is readonly TilePosition[] => route !== null)
          .sort((first, second) => first.length - second.length)[0];
        if (route?.[0]) {
          const world = stepWorld(state.world, id, route[0], (position) => {
            state = recordDoorOpening(state, id, position);
          });
          state = { ...state, world };
        }
        responders[id] = {
          ...responder,
          phase: "ready",
          remaining: 0,
          blockedReason: route
            ? "Approaching injured colleague."
            : "No reachable treatment position.",
        };
        continue;
      }
      const valid =
        patient &&
        target &&
        patient.injuries > 0 &&
        !patient.stabilized &&
        responder.medicalSupplies > 0 &&
        distance(origin, target) <= 1 &&
        canObserve(state.world.map, origin, target, 1);
      if (!valid) {
        responders[id] = {
          ...responder,
          phase: "ready",
          remaining: 0,
          blockedReason:
            "Reach an adjacent injured colleague with an unused stabilization kit.",
        };
        continue;
      }
      if (responder.phase === "ready")
        responders[id] = {
          ...responder,
          phase: "preparing",
          remaining: 6,
          blockedReason: null,
        };
      else if (responder.remaining > 1)
        responders[id] = { ...responder, remaining: responder.remaining - 1 };
      else {
        responders[patientId] = { ...patient, stabilized: true, recovery: 0 };
        responders[id] = {
          ...responder,
          medicalSupplies: responder.medicalSupplies - 1,
          order: "hold",
          targetId: null,
          phase: "recovering",
          remaining: 2,
        };
        report(
          `${state.personnel.find((person) => person.id === patientId)!.name} stabilized.`,
        );
      }
    }
  }
  if (state.combat.status === "active" && adversary && adversary.health > 0) {
    if (adversary.phase === "recovering")
      adversary = {
        ...adversary,
        remaining: Math.max(0, adversary.remaining - 1),
        phase: adversary.remaining <= 1 ? "ready" : "recovering",
      };
    else {
      const seen = state.combat.participants
        .filter(
          (id) =>
            !responders[id]?.incapacitated &&
            distance(state.world.positions[id]!, adversary!.origin) <=
              ENCOUNTER_RADIUS &&
            canObserve(
              state.world.map,
              adversary!.position,
              state.world.positions[id]!,
              6,
            ),
        )
        .sort(
          (first, second) =>
            distance(adversary!.position, state.world.positions[first]!) -
              distance(adversary!.position, state.world.positions[second]!) ||
            first.localeCompare(second),
        );
      const targetId =
        adversary.phase === "preparing"
          ? adversary.targetId
          : (seen[0] ?? null);
      const target = targetId ? state.world.positions[targetId] : undefined;
      if (adversary.phase === "preparing") {
        if (
          !targetId ||
          !target ||
          responders[targetId]?.incapacitated ||
          distance(adversary.position, target) > 1 ||
          !canObserve(state.world.map, adversary.position, target, 1)
        )
          adversary = {
            ...adversary,
            phase: "recovering",
            remaining: 2,
            targetId: null,
          };
        else if (adversary.remaining > 1)
          adversary = { ...adversary, remaining: adversary.remaining - 1 };
        else {
          const victim = responders[targetId] ?? readyResponder();
          const health = Math.max(0, victim.health - 35);
          responders[targetId] = {
            ...victim,
            health,
            injuries: victim.injuries + 1,
            incapacitated: health === 0,
            stabilized: false,
            recovery: 0,
            phase: "recovering",
            remaining: 3,
          };
          adversary = { ...adversary, phase: "recovering", remaining: 4 };
          report(
            `${state.personnel.find((person) => person.id === targetId)!.name} injured${health === 0 ? " and incapacitated" : ""}.`,
          );
        }
      } else if (
        target &&
        distance(adversary.position, target) <= 1 &&
        canObserve(state.world.map, adversary.position, target, 1)
      )
        adversary = {
          ...adversary,
          targetId,
          lastKnown: { ...target },
          phase: "preparing",
          remaining: 3,
        };
      else {
        const patrolOffsets = [
          [-6, 1],
          [0, 6],
          [6, 0],
          [0, -4],
        ] as const;
        const patrolIndex = Math.floor(state.tick / 32) % patrolOffsets.length;
        const patrol =
          !target && !adversary.lastKnown
            ? patrolOffsets
                .map((_, offset) => {
                  const [horizontal, vertical] =
                    patrolOffsets[
                      (patrolIndex + offset) % patrolOffsets.length
                    ]!;
                  return {
                    x: adversary!.origin.x + horizontal,
                    y: adversary!.origin.y + vertical,
                  };
                })
                .find(
                  (position) =>
                    isWalkable(state.world.map, position) &&
                    findRoute(
                      state.world.map,
                      adversary!.position,
                      position,
                    ) !== null,
                )
            : null;
        const destination = target ?? adversary.lastKnown ?? patrol;
        adversary = {
          ...adversary,
          targetId,
          lastKnown: target ? { ...target } : adversary.lastKnown,
        };
        if (destination && state.tick % 2 === 0) {
          const route = findRoute(
            state.world.map,
            adversary.position,
            destination,
          );
          const next = route?.[0];
          if (next && distance(next, adversary.origin) <= ENCOUNTER_RADIUS) {
            const moved = stepWorld(
              {
                ...state.world,
                positions: {
                  ...state.world.positions,
                  "SCP-049-2": adversary.position,
                },
              },
              "SCP-049-2",
              next,
            );
            adversary = {
              ...adversary,
              position: moved.positions["SCP-049-2"]!,
            };
            state = { ...state, world: { ...state.world, map: moved.map } };
          } else adversary = { ...adversary, lastKnown: null };
        }
      }
    }
  }
  let status = state.combat.status;
  let withdrawalTicks = state.combat.withdrawalTicks;
  if (status === "active" && adversary) {
    if (adversary.health === 0) {
      status = "neutralized";
      adversary = {
        ...adversary,
        phase: "ready",
        remaining: 0,
        targetId: null,
        lastKnown: null,
      };
      report("049-2 neutralized; recover and release responders.");
    } else {
      const withdrawn = state.combat.participants.every(
        (id) =>
          !responders[id]?.incapacitated &&
          distance(state.world.positions[id]!, adversary!.origin) >
            ENCOUNTER_RADIUS,
      );
      const fieldEncounter =
        state.expeditions.active?.site?.world.map.id === state.world.map.id;
      withdrawalTicks = withdrawn && !fieldEncounter ? withdrawalTicks + 1 : 0;
      if (withdrawalTicks >= 8) {
        status = "withdrawn";
        adversary = {
          ...adversary,
          phase: "ready",
          remaining: 0,
          targetId: null,
          lastKnown: null,
        };
        report(
          "Response team withdrawn; encounter suspended with 049-2 remaining in the area.",
        );
      }
    }
  }
  if (status === "neutralized") {
    for (const [id, responder] of Object.entries(responders)) {
      if (responder.order === "attack")
        responders[id] = {
          ...responder,
          order: "hold",
          targetId: null,
          blockedReason: null,
          phase: responder.phase === "recovering" ? "recovering" : "ready",
          remaining: responder.phase === "recovering" ? responder.remaining : 0,
        };
    }
  }
  return {
    ...state,
    combat: {
      ...state.combat,
      responders,
      adversary,
      status,
      withdrawalTicks,
      events,
    },
    personnel: state.personnel.map((person) => {
      const responder = responders[person.id];
      if (!responder || (!responder.drafted && !responder.incapacitated))
        return person;
      const effectId = `effect-tactical-trauma-${person.id}`;
      const effects =
        responder.injuries > 0
          ? [
              ...person.effects.filter((effect) => effect.id !== effectId),
              {
                id: effectId,
                name: "Tactical trauma",
                kind: "injury" as const,
                severity:
                  responder.health <= 25
                    ? ("serious" as const)
                    : ("moderate" as const),
                bodyRegions: ["torso" as const],
                physicalHealthPenalty: Math.min(60, responder.injuries * 10),
                stressRecoveryPerTick: 0,
                expiresAtTick: null,
              },
            ]
          : person.effects;
      return {
        ...person,
        effects,
        activity: responder.incapacitated
          ? responder.stabilized
            ? "Stabilized: recovering"
            : "Incapacitated: needs stabilization"
          : `Drafted: ${responder.order} / ${responder.phase}${responder.remaining ? ` ${responder.remaining}` : ""}`,
      };
    }),
  };
}

export function observeCombat(state: GameState): GameState {
  const adversary = state.combat.adversary;
  if (
    !adversary ||
    !state.observations.visibleTiles.includes(
      adversary.position.y * state.world.map.width + adversary.position.x,
    )
  )
    return state;
  return {
    ...state,
    combat: {
      ...state.combat,
      sighting: { adversary: { ...adversary }, observedTick: state.tick },
    },
  };
}
