import type { Position } from "../../Entity";
import type { Pawn } from "../Pawn";
import type { Site } from "../../../site/Site";
import type { Materials } from "../../../material/Material";
import type { TickEvent } from "../../../Simulation";
import type { AttackState } from "./Attack";
import type { TreatState } from "./Treat";
import type { StudyState } from "./Study";
import type { DeliverState } from "./Deliver";
import type { DispenseState } from "./Dispense";
import type { EscortState, FollowState } from "./Escort";

export type ActivityKind = "sleep" | "relax" | "research" | "read" | "exercise";

export interface ActivityState {
  kind: ActivityKind;
  targetId: string;
  workTicks: number;
}

export type ActionState =
  | EscortState
  | FollowState
  | DispenseState
  | DeliverState
  | StudyState
  | AttackState
  | TreatState
  | { kind: "flee"; targetId: string }
  | ActivityState
  | { kind: "move"; destination: Position }
  | { kind: "take"; targetId: string }
  | { kind: "drop"; targetId: string }
  | { kind: "eat"; targetId: string }
  | { kind: "wait"; ticks: number };

export type ActionSource = "player" | "autonomy" | "script" | "debug";

export interface QueuedAction {
  id: string;
  source: ActionSource;
  action: ActionState;
  elapsed: number;
  blockedReason: string | null;
  blockedTicks?: number;
}

export interface ActionContext {
  site: Site;
  pawn: Pawn;
  tick: number;
  materials: Materials;
  events: TickEvent[];
}

export type ActionResult =
  | { status: "completed" }
  | { status: "running" }
  | { status: "failed"; reason: string }
  | { status: "interrupted"; reason: string }
  | { status: "blocked"; reason: string };

export interface Action {
  canStart(context: ActionContext): string | null;
  tick(context: ActionContext, elapsed: number): ActionResult;
}
