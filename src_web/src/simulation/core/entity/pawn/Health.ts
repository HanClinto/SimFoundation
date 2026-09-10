import type { Pawn } from "./Pawn";
import { advanceNeeds } from "./Needs";

export interface Wound {
  id: string;
  severity: number;
  bleeding: number;
  stabilization?: { actorId: string; sourceId: string; tick: number };
  recovery?: {
    actionId: string;
    actorId: string;
    supplyId: string;
    tick: number;
    reduction: number;
  }[];
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
  incapacity?:
    | "blood-loss"
    | "wounds"
    | "organ-trauma"
    | "postoperative"
    | "subdued";
  subdual?: { untilTick: number; actorId: string };
  postoperative?: { sinceTick: number; actorId: string; organ: OrganKind };
  mortality?: {
    criticalTicks: number;
    fatalAfterTicks: number;
    warningBloodLoss?: number;
  };
  death?: { tick: number; cause: "untreated-blood-loss" | "critical-trauma" };
}

export function majorOrganTrauma(health: Health): boolean {
  return Object.values(health.organs ?? {}).some(
    (organ) => organ.trauma >= 100,
  );
}

export function healthStatus(pawn: Pawn): string {
  if (pawn.health?.death)
    return `DEAD at tick ${pawn.health.death.tick}: ${pawn.health.death.cause}`;
  const mortality = pawn.health?.mortality;
  return `${pawn.canAct ? "active" : "incapacitated"}${pawn.health?.subdual ? ` | SUBDUED until ${pawn.health.subdual.untilTick}` : ""}${mortality ? (mortality.criticalTicks > 0 ? ` | CRITICAL ${mortality.criticalTicks}/${mortality.fatalAfterTicks} ticks` : ` | mortality enabled: ${mortality.fatalAfterTicks} critical ticks`) : ""}`;
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

export function recoverWounds(
  health: Health,
  amount: number,
  record: { actionId: string; actorId: string; supplyId: string; tick: number },
): void {
  let remaining = amount;
  for (const wound of [...health.wounds].sort(
    (a, b) =>
      b.severity - a.severity || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )) {
    const reduction = Math.min(wound.severity, remaining);
    if (reduction <= 0) continue;
    wound.severity -= reduction;
    remaining -= reduction;
    wound.recovery ??= [];
    const receipt = wound.recovery.find(
      (entry) => entry.actionId === record.actionId,
    );
    if (receipt) {
      receipt.reduction += reduction;
      receipt.tick = record.tick;
    } else wound.recovery.push({ ...record, reduction });
    if (remaining <= 0) break;
  }
}

export function advancePhysiology(
  pawn: Pawn,
  tick: number,
): {
  kind: "died" | "warning";
  reason: string;
} | null {
  if (pawn.health?.death) return null;
  pawn.needs = advanceNeeds(pawn.needs);
  if (pawn.health) {
    const previousBloodLoss = pawn.health.bloodLoss;
    if (pawn.health.subdual && tick >= pawn.health.subdual.untilTick) {
      delete pawn.health.subdual;
      if (pawn.health.incapacity === "subdued" && !incapacitated(pawn.health)) {
        delete pawn.health.incapacity;
        pawn.canAct = true;
      }
    }
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
    } else if (pawn.health.postoperative) {
      pawn.health.incapacity = "postoperative";
      pawn.canAct = false;
    }
    const mortality = pawn.health.mortality;
    if (mortality) {
      const bleeding = pawn.health.wounds.some((wound) => wound.bleeding > 0);
      const cause =
        pawn.health.bloodLoss >= 100 && bleeding
          ? "untreated-blood-loss"
          : pawn.health.wounds.reduce(
                (sum, wound) => sum + wound.severity,
                0,
              ) >= 150 || (pawn.health.organs?.brain?.trauma ?? 0) >= 100
            ? "critical-trauma"
            : null;
      mortality.criticalTicks = cause ? mortality.criticalTicks + 1 : 0;
      if (cause && mortality.criticalTicks >= mortality.fatalAfterTicks) {
        pawn.health.death = { tick, cause };
        pawn.canAct = false;
        pawn.autonomy = false;
        pawn.blocksMovement = false;
        delete pawn.serviceDuty;
        return { kind: "died", reason: cause };
      }
      if (mortality.criticalTicks === 1)
        return {
          kind: "warning",
          reason: `${pawn.name} entered a fatal critical interval (${mortality.fatalAfterTicks} ticks); intervene immediately.`,
        };
      const threshold = mortality.warningBloodLoss ?? 80;
      if (
        previousBloodLoss < threshold &&
        pawn.health.bloodLoss >= threshold &&
        bleeding
      )
        return {
          kind: "warning",
          reason: `${pawn.name} has dangerous ongoing blood loss (${pawn.health.bloodLoss}); dispatch and stabilize before critical deterioration.`,
        };
    }
  }
  return null;
}
