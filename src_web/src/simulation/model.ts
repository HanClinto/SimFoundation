export const SIMULATION_VERSION = 1;

export interface Position {
  readonly x: number;
  readonly y: number;
}

export type Location =
  | { readonly kind: "ground"; readonly position: Position }
  | { readonly kind: "carried"; readonly carrierId: string };

export interface Need {
  readonly value: number;
  readonly increasePerTick: number;
}

export type Action =
  | { readonly kind: "move"; readonly destination: Position }
  | { readonly kind: "take"; readonly targetId: string }
  | { readonly kind: "drop"; readonly targetId: string }
  | { readonly kind: "eat"; readonly targetId: string }
  | { readonly kind: "wait"; readonly ticks: number };

export type ActionSource = "player" | "autonomy" | "script" | "debug";

export interface QueuedAction {
  readonly id: string;
  readonly source: ActionSource;
  readonly action: Action;
  readonly elapsed: number;
  readonly blockedReason: string | null;
}

interface EntityBase {
  readonly id: string;
  readonly name: string;
  readonly location: Location;
  readonly carryable: boolean;
}

export interface Pawn extends EntityBase {
  readonly kind: "pawn";
  readonly definitionId: "staff" | "wanderer";
  readonly mobile: boolean;
  readonly canAct: boolean;
  readonly autonomy: boolean;
  readonly playerControllable: boolean;
  readonly needs: Readonly<Record<string, Need>>;
  readonly queue: readonly QueuedAction[];
  readonly patrol: readonly Position[];
}

export interface Item extends EntityBase {
  readonly kind: "item";
  readonly definitionId: "item";
  readonly nutrition: number;
}

export interface Door extends EntityBase {
  readonly kind: "door";
  readonly definitionId: "automatic-door";
  readonly open: boolean;
  readonly policy: "automatic" | "held-open" | "held-closed";
}

export type Entity = Pawn | Item | Door;

export interface Site {
  readonly id: string;
  readonly name: string;
  readonly terrain: readonly string[];
  readonly entities: Readonly<Record<string, Entity>>;
}

export interface Simulation {
  readonly version: typeof SIMULATION_VERSION;
  readonly tick: number;
  readonly nextActionId: number;
  readonly nextSiteId: number;
  readonly nextTransferId: number;
  readonly sites: Readonly<Record<string, Site>>;
  readonly transfers: Readonly<Record<string, Transfer>>;
}

export interface Transfer {
  readonly id: string;
  readonly originId: string;
  readonly destinationId: string;
  readonly arrival: Position;
  readonly arrivesAt: number;
  readonly blockedReason: string | null;
  readonly entities: Readonly<Record<string, Entity>>;
}

export function createSimulation(): Simulation {
  return {
    version: SIMULATION_VERSION,
    tick: 0,
    nextActionId: 1,
    nextSiteId: 1,
    nextTransferId: 1,
    sites: {},
    transfers: {},
  };
}

export interface TickEvent {
  readonly siteId: string;
  readonly entityId: string;
  readonly kind: "completed" | "blocked" | "opened" | "closed";
  readonly actionId?: string;
  readonly reason?: string;
}
