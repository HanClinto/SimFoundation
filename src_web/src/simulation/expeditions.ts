import type { GameState } from "./state";
import { recordDoorOpening } from "./action-progress";
import {
  draftResponder,
  orderResponder,
  previewDraftResponder,
} from "./combat";
import { sameTile, type TilePosition } from "./world";
import {
  EXPEDITION_SCENARIOS,
  expeditionScenario,
  expeditionRecoveryComplete,
  type ExpeditionSite,
} from "./expedition-site";
import {
  advanceCombat,
  createCombatState,
  observeCombat,
  startEncounter,
} from "./combat";
import { observeSite } from "./observations";
import { findRoute, isWalkable, stepWorld, closeAutomaticDoors } from "./world";
import { advancePersonnel } from "./personnel";
import { advanceExposure } from "./environment";

export const EXPEDITION_ASSEMBLY = { x: 63, y: 63 };
export interface ExpeditionNotice {
  readonly id: string;
  readonly title: string;
  readonly report: string;
  readonly status: "available" | "assigned" | "resolved";
}
export interface Expedition {
  readonly reserves: Readonly<
    Record<
      string,
      { readonly ammunition: number; readonly medicalSupplies: number }
    >
  >;
  readonly id: string;
  readonly noticeId: string;
  readonly team: readonly string[];
  readonly phase:
    | "assembling"
    | "outbound"
    | "field"
    | "regrouping"
    | "inbound";
  readonly arrivesAt: number | null;
  readonly returnPositions: Readonly<Record<string, TilePosition>>;
  readonly previouslyDrafted: readonly string[];
  readonly site: ExpeditionSite | null;
  readonly recoveryOrders: readonly {
    readonly personId: string;
    readonly objectId: string;
    readonly progress: number;
    readonly phase: "collecting" | "carrying" | "delivered";
    readonly blockedReason: string | null;
  }[];
  readonly cargo: readonly string[];
}
export interface ExpeditionState {
  readonly notices: readonly ExpeditionNotice[];
  readonly active: Expedition | null;
  readonly nextId: number;
  readonly history: readonly {
    readonly id: string;
    readonly noticeId: string;
    readonly returnedAt: number;
    readonly team: readonly string[];
    readonly cargo: readonly string[];
  }[];
}
export const createExpeditions = (): ExpeditionState => ({
  nextId: 1,
  active: null,
  history: [],
  notices: EXPEDITION_SCENARIOS.map((scenario) => ({
    id: scenario.noticeId,
    title: scenario.title,
    report: scenario.report,
    status: "available",
  })),
});
export type ExpeditionCode =
  | "accepted"
  | "busy"
  | "invalid-team"
  | "not-found"
  | "unreachable"
  | "not-ready";

export interface ExpeditionResult {
  readonly state: GameState;
  readonly code: ExpeditionCode;
  readonly reason: string | null;
}

export function enlistExpedition(
  state: GameState,
  noticeId: string,
  team: readonly string[],
  loadouts?: Readonly<
    Record<
      string,
      { readonly ammunition: number; readonly medicalSupplies: number }
    >
  >,
): ExpeditionResult {
  if (state.expeditions.active)
    return {
      state,
      code: "busy",
      reason:
        "Finish or cancel the current expedition before assembling another team.",
    };
  if (state.combat.status === "active")
    return {
      state,
      code: "busy",
      reason: "Resolve the active base encounter before assembling a team.",
    };
  if (
    !state.expeditions.notices.some(
      (notice) => notice.id === noticeId && notice.status === "available",
    )
  )
    return {
      state,
      code: "not-found",
      reason: "Select an available expedition notice.",
    };
  if (
    team.length < 2 ||
    team.length > 3 ||
    new Set(team).size !== team.length ||
    team.some((id) => !state.personnel.some((person) => person.id === id))
  )
    return {
      state,
      code: "invalid-team",
      reason: "Select two or three distinct available staff.",
    };
  let next = state;
  const reserves: Record<
    string,
    { ammunition: number; medicalSupplies: number }
  > = {};
  for (const id of [...team].sort()) {
    const name = state.personnel.find((person) => person.id === id)!.name;
    const drafted = draftResponder(next, id, true);
    if (drafted.code !== "accepted")
      return {
        state,
        code: "busy",
        reason: `${name}: ${previewDraftResponder(next, id, true).reason}`,
      };
    const move = orderResponder(drafted.state, id, "move", EXPEDITION_ASSEMBLY);
    if (move.code !== "accepted")
      return {
        state,
        code: "unreachable",
        reason: `${name} cannot begin movement to the assembly point (${move.code}).`,
      };
    next = move.state;
    const responder = next.combat.responders[id]!;
    const loadout = loadouts?.[id] ?? responder;
    if (
      !Number.isSafeInteger(loadout.ammunition) ||
      loadout.ammunition < 0 ||
      loadout.ammunition > responder.ammunition ||
      !Number.isSafeInteger(loadout.medicalSupplies) ||
      loadout.medicalSupplies < 0 ||
      loadout.medicalSupplies > responder.medicalSupplies
    )
      return {
        state,
        code: "invalid-team",
        reason: `${name}: choose whole non-negative rounds and kits within available supplies (${responder.ammunition} rounds, ${responder.medicalSupplies} kits).`,
      };
    reserves[id] = {
      ammunition: responder.ammunition - loadout.ammunition,
      medicalSupplies: responder.medicalSupplies - loadout.medicalSupplies,
    };
  }
  const active: Expedition = {
    id: `expedition-${state.expeditions.nextId}`,
    noticeId,
    team: [...team].sort(),
    phase: "assembling",
    arrivesAt: null,
    returnPositions: Object.fromEntries(
      team.map((id) => [id, { ...EXPEDITION_ASSEMBLY }]),
    ),
    previouslyDrafted: team.filter(
      (id) => state.combat.responders[id]?.drafted,
    ),
    site: null,
    recoveryOrders: [],
    cargo: [],
    reserves,
  };
  return {
    code: "accepted",
    reason: null,
    state: {
      ...next,
      expeditions: {
        ...state.expeditions,
        nextId: state.expeditions.nextId + 1,
        active,
        notices: state.expeditions.notices.map((notice) =>
          notice.id === noticeId ? { ...notice, status: "assigned" } : notice,
        ),
      },
    },
  };
}

export function cancelExpedition(state: GameState): ExpeditionResult {
  const active = state.expeditions.active;
  if (!active || active.phase !== "assembling")
    return {
      state,
      code: "not-ready",
      reason: "Only an assembling team can cancel assembly.",
    };
  let next: GameState = {
    ...state,
    expeditions: {
      ...state.expeditions,
      active: null,
      notices: state.expeditions.notices.map((notice) =>
        notice.id === active.noticeId
          ? { ...notice, status: "available" }
          : notice,
      ),
    },
  };
  for (const id of active.team) {
    next = orderResponder(next, id, "hold").state;
    if (!active.previouslyDrafted.includes(id))
      next = draftResponder(next, id, false).state;
  }
  return { state: next, code: "accepted", reason: null };
}

export function expeditionAssembled(state: GameState): boolean {
  const active = state.expeditions.active;
  return (
    !!active &&
    active.team.every(
      (id) =>
        !!state.world.positions[id] &&
        sameTile(state.world.positions[id]!, EXPEDITION_ASSEMBLY) &&
        !state.combat.responders[id]?.incapacitated &&
        state.combat.responders[id]?.phase === "ready",
    )
  );
}

export const awayPersonnel = (state: GameState): readonly string[] =>
  state.expeditions.active && state.expeditions.active.phase !== "assembling"
    ? state.expeditions.active.team
    : [];
export const expeditionMember = (state: GameState, id: string): boolean =>
  !!state.expeditions.active?.team.includes(id);

export function fieldState(state: GameState): GameState | null {
  const active = state.expeditions.active;
  if (!active?.site) return null;
  const personnel = state.personnel.filter((person) =>
    active.team.includes(person.id),
  );
  return {
    ...state,
    ...active.site,
    siteName: expeditionScenario(active.noticeId).siteName,
    personnel,
    jobs: [],
    clinicalCare: { reviewInterval: 0, clinicianIds: [] },
    entities: [],
    objectOrders: [],
    vesselWork: { nextId: 1, orders: [] },
    storage: { nextId: 1, areas: [], blockedReasons: {} },
    routines: {
      ...state.routines,
      stations: [],
      activities: {},
      blockedReasons: {},
      schedules: Object.fromEntries(
        personnel.map((person) => [
          person.id,
          state.routines.schedules[person.id]!,
        ]),
      ),
      pantryMeals: 0,
      reserveMeals: 0,
      mealsConsumed: 0,
    },
  };
}

export function storeFieldState(state: GameState, field: GameState): GameState {
  const active = state.expeditions.active;
  if (!active?.site) return state;
  const site: ExpeditionSite = {
    world: field.world,
    objects: field.objects,
    observations: field.observations,
    combat: field.combat,
    environment: field.environment,
  };
  return {
    ...state,
    actionTimings: {
      ...state.actionTimings,
      ...Object.fromEntries(
        Object.entries(field.actionTimings).filter(([id]) =>
          active.team.includes(id),
        ),
      ),
    },
    personnel: state.personnel.map(
      (person) =>
        field.personnel.find((other) => other.id === person.id) ?? person,
    ),
    expeditions: { ...state.expeditions, active: { ...active, site } },
  };
}

export function dispatchExpedition(state: GameState): ExpeditionResult {
  const active = state.expeditions.active;
  if (!active || active.phase !== "assembling")
    return {
      state,
      code: "not-ready",
      reason: "Assemble a team before dispatching it.",
    };
  if (!expeditionAssembled(state))
    return {
      state,
      code: "not-ready",
      reason:
        "Wait for every team member to reach assembly and finish action recovery.",
    };
  if (state.combat.status === "active")
    return {
      state,
      code: "busy",
      reason: "Resolve the active base encounter before dispatch.",
    };
  if (
    active.team.some(
      (id) =>
        state.combat.responders[id]!.injuries > 0 &&
        !state.combat.responders[id]!.stabilized,
    )
  )
    return {
      state,
      code: "busy",
      reason: "Stabilize all team injuries before dispatch.",
    };
  const scenario = expeditionScenario(active.noticeId);
  const site = scenario.createSite(active.id);
  const responders = Object.fromEntries(
    active.team.map((id) => [
      id,
      {
        ...state.combat.responders[id]!,
        ammunition:
          state.combat.responders[id]!.ammunition -
          active.reserves[id]!.ammunition,
        medicalSupplies:
          state.combat.responders[id]!.medicalSupplies -
          active.reserves[id]!.medicalSupplies,
        order: "hold" as const,
        destination: null,
        targetId: null,
        phase: "ready" as const,
        remaining: 0,
        blockedReason: null,
      },
    ]),
  );
  return {
    code: "accepted",
    reason: null,
    state: {
      ...state,
      world: {
        ...state.world,
        positions: Object.fromEntries(
          Object.entries(state.world.positions).filter(
            ([id]) => !active.team.includes(id),
          ),
        ),
      },
      combat: {
        ...createCombatState(),
        responders: Object.fromEntries(
          Object.entries(state.combat.responders).filter(
            ([id]) => !active.team.includes(id),
          ),
        ),
      },
      personnel: state.personnel.map((person) =>
        active.team.includes(person.id)
          ? { ...person, activity: "Expedition: outbound transit" }
          : person,
      ),
      observations: {
        ...state.observations,
        visibleEntityIds: state.observations.visibleEntityIds.filter(
          (id) => !active.team.includes(id),
        ),
        entities: Object.fromEntries(
          Object.entries(state.observations.entities).filter(
            ([id]) => !active.team.includes(id),
          ),
        ),
      },
      expeditions: {
        ...state.expeditions,
        active: {
          ...active,
          phase: "outbound",
          arrivesAt: state.tick + scenario.travelMinutes,
          site: { ...site, combat: { ...site.combat, responders } },
        },
      },
    },
  };
}

export function recoverExpeditionObject(
  state: GameState,
  personId: string,
  objectId: string,
): { state: GameState; code: ExpeditionCode } {
  const active = state.expeditions.active;
  const field = fieldState(state);
  if (
    !active ||
    active.phase !== "field" ||
    !field ||
    !active.team.includes(personId)
  )
    return { state, code: "not-ready" };
  const item = field.objects.items.find((item) => item.id === objectId);
  if (
    !item ||
    !expeditionScenario(active.noticeId).recoveryTargets.some(
      (target) => item.id === `${active.id}-${target}`,
    )
  )
    return { state, code: "not-found" };
  if (
    item.location.kind !== "ground" ||
    item.reservedBy ||
    active.cargo.includes(item.id) ||
    field.combat.responders[personId]?.incapacitated ||
    active.recoveryOrders.some(
      (order) => order.phase !== "delivered" && order.personId === personId,
    )
  )
    return { state, code: "busy" };
  if (
    findRoute(
      field.world.map,
      field.world.positions[personId]!,
      item.location.position,
    ) === null
  )
    return { state, code: "unreachable" };
  const held = orderResponder(field, personId, "hold");
  if (held.code !== "accepted") return { state, code: "busy" };
  const next = storeFieldState(state, {
    ...held.state,
    objects: {
      ...field.objects,
      items: field.objects.items.map((candidate) =>
        candidate.id === objectId
          ? { ...candidate, reservedBy: `recovery-${personId}` }
          : candidate,
      ),
    },
  });
  return {
    code: "accepted",
    state: {
      ...next,
      expeditions: {
        ...next.expeditions,
        active: {
          ...next.expeditions.active!,
          recoveryOrders: [
            ...active.recoveryOrders,
            {
              personId,
              objectId,
              progress: 0,
              phase: "collecting",
              blockedReason: null,
            },
          ],
        },
      },
    },
  };
}

export function recallExpedition(state: GameState): ExpeditionResult {
  const active = state.expeditions.active;
  let field = fieldState(state);
  if (!active || active.phase !== "field" || !field)
    return {
      state,
      code: "not-ready",
      reason: "Regroup is available only while the team is in the field.",
    };
  if (active.recoveryOrders.some((order) => order.phase !== "delivered"))
    return {
      state,
      code: "busy",
      reason:
        "Finish or cancel active cargo recovery on the field map before regrouping.",
    };
  if (
    active.team.some(
      (id) =>
        field!.combat.responders[id]!.incapacitated ||
        (field!.combat.responders[id]!.injuries > 0 &&
          !field!.combat.responders[id]!.stabilized),
    )
  )
    return {
      state,
      code: "busy",
      reason:
        "Stabilize injured team members and wait for incapacitated responders to recover before regrouping.",
    };
  for (const id of active.team) {
    const ordered: ReturnType<typeof orderResponder<GameState>> =
      orderResponder(
        field,
        id,
        "retreat",
        expeditionScenario(active.noticeId).extraction,
      );
    if (ordered.code !== "accepted")
      return {
        state,
        code: "unreachable",
        reason: `${state.personnel.find((person) => person.id === id)?.name ?? id} cannot begin movement to extraction (${ordered.code}).`,
      };
    field = ordered.state;
  }
  const next = storeFieldState(state, field);
  return {
    code: "accepted",
    reason: null,
    state: {
      ...next,
      expeditions: {
        ...next.expeditions,
        active: { ...next.expeditions.active!, phase: "regrouping" },
      },
    },
  };
}

export function cancelRecovery(
  state: GameState,
  personId: string,
): { state: GameState; code: ExpeditionCode } {
  const active = state.expeditions.active;
  const field = fieldState(state);
  const order = active?.recoveryOrders.find(
    (entry) => entry.personId === personId && entry.phase !== "delivered",
  );
  if (
    !active ||
    !field ||
    !order ||
    !["field", "regrouping"].includes(active.phase)
  )
    return { state, code: "not-ready" };
  const position = field.world.positions[personId];
  if (!position) return { state, code: "not-ready" };
  const next = storeFieldState(state, {
    ...field,
    objects: {
      ...field.objects,
      items: field.objects.items.map((item) =>
        item.id === order.objectId
          ? {
              ...item,
              reservedBy: null,
              location:
                item.location.kind === "carried"
                  ? { kind: "ground", position: { ...position } }
                  : item.location,
            }
          : item,
      ),
    },
  });
  return {
    code: "accepted",
    state: {
      ...next,
      expeditions: {
        ...next.expeditions,
        active: {
          ...next.expeditions.active!,
          phase: "field",
          recoveryOrders: active.recoveryOrders.filter(
            (entry) => entry !== order,
          ),
        },
      },
    },
  };
}

export function advanceExpedition(state: GameState): GameState {
  const active = state.expeditions.active;
  if (!active || active.phase === "assembling") return state;
  state = {
    ...state,
    personnel: state.personnel.map((person) =>
      active.team.includes(person.id)
        ? advancePersonnel(person, state.tick)
        : person,
    ),
  };
  let field = fieldState(state)!;
  if (active.phase === "outbound" && state.tick >= active.arrivesAt!) {
    field = {
      ...field,
      world: {
        ...field.world,
        positions: Object.fromEntries(
          active.team.map((id, index) => [
            id,
            {
              x: expeditionScenario(active.noticeId).extraction.x,
              y: expeditionScenario(active.noticeId).extraction.y + index,
            },
          ]),
        ),
      },
    };
    const encounterPosition = expeditionScenario(
      active.noticeId,
    ).encounterPosition;
    if (encounterPosition)
      field = startEncounter(field, encounterPosition).state;
    field = observeCombat(observeSite(field));
    const arrived = storeFieldState(state, field);
    return {
      ...arrived,
      expeditions: {
        ...arrived.expeditions,
        active: {
          ...arrived.expeditions.active!,
          phase: "field",
          arrivesAt: null,
        },
      },
    };
  }
  if (active.phase === "inbound" && state.tick >= active.arrivesAt!) {
    const sources = field.environment.sources.filter(
      (source) => source.objectId && active.cargo.includes(source.objectId),
    );
    if (
      state.environment.sources.length + sources.length > 32 ||
      sources.some((source) =>
        state.environment.sources.some((existing) => existing.id === source.id),
      )
    )
      return state;
    if (
      Object.values(active.returnPositions).some(
        (position) => !isWalkable(state.world.map, position),
      )
    )
      return state;
    const cargo = field.objects.items
      .filter((item) => active.cargo.includes(item.id))
      .map((item) => ({
        ...item,
        reservedBy: null,
        location: {
          kind: "ground" as const,
          position: { ...EXPEDITION_ASSEMBLY },
        },
      }));
    const responders = {
      ...state.combat.responders,
      ...Object.fromEntries(
        active.team.map((id) => [
          id,
          {
            ...field.combat.responders[id]!,
            ammunition:
              field.combat.responders[id]!.ammunition +
              active.reserves[id]!.ammunition,
            medicalSupplies:
              field.combat.responders[id]!.medicalSupplies +
              active.reserves[id]!.medicalSupplies,
            drafted:
              active.previouslyDrafted.includes(id) ||
              field.combat.responders[id]!.injuries > 0,
            order: "hold" as const,
            destination: null,
            targetId: null,
            phase: "ready" as const,
            remaining: 0,
            blockedReason: null,
          },
        ]),
      ),
    };
    return {
      ...state,
      world: {
        ...state.world,
        positions: { ...state.world.positions, ...active.returnPositions },
      },
      combat: { ...state.combat, responders },
      objects: { ...state.objects, items: [...state.objects.items, ...cargo] },
      environment: {
        ...state.environment,
        sources: [...state.environment.sources, ...sources],
      },
      personnel: state.personnel.map((person) =>
        active.team.includes(person.id)
          ? { ...person, activity: "Returned from expedition" }
          : person,
      ),
      expeditions: {
        ...state.expeditions,
        active: null,
        notices: state.expeditions.notices.map((notice) =>
          notice.id === active.noticeId
            ? {
                ...notice,
                status: expeditionRecoveryComplete(
                  active.noticeId,
                  active.id,
                  active.cargo,
                )
                  ? "resolved"
                  : "available",
              }
            : notice,
        ),
        history: [
          ...state.expeditions.history,
          {
            id: active.id,
            noticeId: active.noticeId,
            returnedAt: state.tick,
            team: active.team,
            cargo: cargo.map((item) => item.id),
          },
        ].slice(-20),
      },
    };
  }
  if (active.phase === "outbound" || active.phase === "inbound") {
    return state;
  }
  field = {
    ...field,
    world: closeAutomaticDoors(
      field.world,
      field.combat.adversary ? [field.combat.adversary.position] : [],
    ),
  };
  field = advanceCombat(field, "explicit");
  const orders = active.recoveryOrders.map((order) => {
    if (order.phase === "delivered") return order;
    const responder = field.combat.responders[order.personId]!;
    if (responder.incapacitated)
      return {
        ...order,
        blockedReason:
          "Carrier incapacitated; stabilize before recovery can continue.",
      };
    const item = field.objects.items.find(
      (item) => item.id === order.objectId,
    )!;
    const origin = field.world.positions[order.personId]!;
    const destination =
      order.phase === "carrying"
        ? expeditionScenario(active.noticeId).extraction
        : item.location.kind === "ground"
          ? item.location.position
          : origin;
    if (!sameTile(origin, destination)) {
      const route = findRoute(field.world.map, origin, destination);
      if (!route) return { ...order, blockedReason: "Recovery route blocked." };
      if (route[0]) {
        const world = stepWorld(
          field.world,
          order.personId,
          route[0],
          (position) => {
            field = recordDoorOpening(field, order.personId, position);
          },
        );
        field = { ...field, world };
      }
      return { ...order, blockedReason: null };
    }
    if (order.phase === "collecting" && order.progress < 6)
      return { ...order, progress: order.progress + 1, blockedReason: null };
    field = {
      ...field,
      objects: {
        ...field.objects,
        items: field.objects.items.map((item) =>
          item.id === order.objectId
            ? {
                ...item,
                location:
                  order.phase === "collecting"
                    ? { kind: "carried" as const, personId: order.personId }
                    : {
                        kind: "ground" as const,
                        position: {
                          ...expeditionScenario(active.noticeId).extraction,
                        },
                      },
                reservedBy:
                  order.phase === "collecting"
                    ? `recovery-${order.personId}`
                    : null,
              }
            : item,
        ),
      },
    };
    return {
      ...order,
      phase:
        order.phase === "collecting"
          ? ("carrying" as const)
          : ("delivered" as const),
      blockedReason: null,
    };
  });
  const interruptedRecall =
    active.phase === "regrouping" &&
    active.team.some(
      (id) =>
        field.combat.responders[id]!.incapacitated ||
        (field.combat.responders[id]!.injuries > 0 &&
          !field.combat.responders[id]!.stabilized),
    );
  field = observeCombat(observeSite(advanceExposure(field)));
  const next = storeFieldState(state, field);
  const cargo = orders
    .filter((order) => order.phase === "delivered")
    .map((order) => order.objectId);
  const ready =
    active.phase === "regrouping" &&
    active.team.every(
      (id) =>
        sameTile(
          field.world.positions[id]!,
          expeditionScenario(active.noticeId).extraction,
        ) &&
        !field.combat.responders[id]!.incapacitated &&
        (!field.combat.responders[id]!.injuries ||
          field.combat.responders[id]!.stabilized) &&
        field.combat.responders[id]!.phase === "ready",
    );
  return {
    ...next,
    expeditions: {
      ...next.expeditions,
      active: {
        ...next.expeditions.active!,
        recoveryOrders: orders,
        cargo,
        ...(interruptedRecall ? { phase: "field" } : {}),
        ...(ready
          ? {
              phase: "inbound",
              arrivesAt:
                state.tick + expeditionScenario(active.noticeId).travelMinutes,
              site: {
                ...next.expeditions.active!.site!,
                world: { ...field.world, positions: {} },
              },
            }
          : {}),
      },
    },
  };
}
