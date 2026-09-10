import type { Pawn } from "./Pawn";
import { advanceNeeds } from "./Needs";

export interface Wound {
  id: string;
  severity: number;
  bleeding: number;
  treatedBy?: string;
}

export type OrganKind = "lung" | "brain";

export interface OrganState {
  trauma: number;
  replacement?: {
    actorId: string;
    tick: number;
    materialSourceId: string;
    materialId: string;
    amount: number;
  };
}

export interface Health {
  wounds: Wound[];
  bloodLoss: number;
  organs?: Partial<Record<OrganKind, OrganState>>;
  incapacity?: "blood-loss" | "wounds" | "organ-trauma" | "postoperative";
}

export function majorOrganTrauma(health: Health): boolean {
  return Object.values(health.organs ?? {}).some(
    (organ) => organ.trauma >= 100,
  );
}

export function advanceHealth(health: Health): void {
  health.bloodLoss = Math.min(
    100,
    health.bloodLoss +
      health.wounds.reduce((total, wound) => total + wound.bleeding, 0),
  );
}

export function incapacitated(health: Health): boolean {
  return (
    majorOrganTrauma(health) ||
    health.bloodLoss >= 100 ||
    health.wounds.reduce((total, wound) => total + wound.severity, 0) >= 100
  );
}

export function advancePhysiology(pawn: Pawn): void {
  pawn.needs = advanceNeeds(pawn.needs);
  if (pawn.health) {
    advanceHealth(pawn.health);
    if (incapacitated(pawn.health)) {
      pawn.health.incapacity =
        pawn.health.wounds.reduce(
          (total, wound) => total + wound.severity,
          0,
        ) >= 100
          ? "wounds"
          : majorOrganTrauma(pawn.health)
            ? "organ-trauma"
            : "blood-loss";
      pawn.canAct = false;
    }
  }
}
