import type { Pawn } from "./Pawn";
import { advanceNeeds } from "./Needs";

export interface Wound {
  id: string;
  severity: number;
  bleeding: number;
  treatedBy?: string;
}

export interface Health {
  wounds: Wound[];
  bloodLoss: number;
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
    health.bloodLoss >= 100 ||
    health.wounds.reduce((total, wound) => total + wound.severity, 0) >= 100
  );
}

export function advancePhysiology(pawn: Pawn): void {
  pawn.needs = advanceNeeds(pawn.needs);
  if (pawn.health) {
    advanceHealth(pawn.health);
    if (incapacitated(pawn.health)) pawn.canAct = false;
  }
}
