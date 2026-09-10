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
import type { PackState, UnpackState } from "./Pack";
import type { NurseState } from "./Nurse";
import type { MendState } from "./Mend";
import type { ServiceState } from "./Service";
import type { SubdueState } from "./Subdue";
import type { RestrainState } from "./Restrain";
import type { ContainState, LockdownState } from "./Contain";
import type { RearmState } from "./Rearm";
import type { RepairEquipmentState } from "./RepairEquipment";
import type { OperateDoorState } from "./OperateDoor";
import type { GiveState } from "./Give";
import type { CaptureState } from "./Capture";
import type { CraftState } from "./Craft";
import type { ObserveState } from "./Observe";
import type { WatchState } from "./Watch";

export type ActivityKind = "sleep" | "relax" | "research" | "read" | "exercise";

export interface ActivityState {
  kind: ActivityKind;
  targetId: string;
  workTicks: number;
}

export type ActionState =
  | WatchState
  | ObserveState
  | CraftState
  | CaptureState
  | GiveState
  | OperateDoorState
  | RepairEquipmentState
  | RearmState
  | ContainState
  | LockdownState
  | { kind: "unrestrain"; targetId: string }
  | RestrainState
  | SubdueState
  | { kind: "equip" | "unequip"; targetId: string }
  | ServiceState
  | MendState
  | NurseState
  | PackState
  | UnpackState
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
  | { kind: "take"; targetId: string; amount?: number }
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
