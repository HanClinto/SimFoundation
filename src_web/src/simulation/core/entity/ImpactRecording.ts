import type { Entity } from "./Entity";
import type { Item } from "./Item";
import type { Pawn } from "./pawn/Pawn";
import type { Site } from "../site/Site";
import type { ActionContext } from "./pawn/actions/Action";
import { canSee } from "../site/Visibility";
import { canObserveIndependently } from "./pawn/Attention";

export interface RecordedImpact {
  id: string;
  actionId: string;
  observerId: string;
  attackerId: string;
  attackerDefinitionId: string;
  targetId: string;
  tick: number;
  severity: number;
  damage: number;
  armorId?: string;
}

export interface ImpactRecorder {
  capacity: number;
  records: RecordedImpact[];
}

export function heldRecorder(
  site: Site,
  pawnId: string,
  recorderId: string,
): Item | undefined {
  const item = site.entities[recorderId];
  return item?.kind === "item" &&
    item.impactRecorder &&
    Number.isSafeInteger(item.impactRecorder.capacity) &&
    item.impactRecorder.capacity > 0 &&
    item.amount > 0 &&
    (item.integrity ?? 100) > 0 &&
    item.location.kind === "carried" &&
    item.location.carrierId === pawnId
    ? item
    : undefined;
}

export function recordedImpactFrom(
  entity: Entity,
  attackerDefinitionId: string,
): RecordedImpact | undefined {
  return entity.kind === "item"
    ? entity.impactRecorder?.records.find(
        (record) => record.attackerDefinitionId === attackerDefinitionId,
      )
    : undefined;
}

export function recordWitnessedImpact(
  { site, pawn: attacker, tick, events }: ActionContext,
  target: Pawn,
  severity: number,
  damage: number,
  armorId?: string,
): void {
  for (const observer of Object.values(site.entities).sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  )) {
    if (observer.kind !== "pawn" || !canObserveIndependently(site, observer))
      continue;
    const watch = observer.queue[0];
    if (
      watch?.action.kind !== "observe" ||
      watch.action.targetId !== attacker.id ||
      watch.blockedReason !== null ||
      watch.action.workTicks < 1 ||
      (watch.source === "player" && !observer.playerControllable) ||
      !canSee(site, observer, attacker.id) ||
      !canSee(site, observer, target.id)
    )
      continue;
    const recorder = heldRecorder(site, observer.id, watch.action.recorderId);
    if (!recorder) continue;
    const log = recorder.impactRecorder!;
    if (
      log.records.length >= log.capacity ||
      log.records.some((record) => record.actionId === watch.id)
    )
      continue;
    const id = `${recorder.id}:impact-${tick}`;
    log.records.push({
      id,
      actionId: watch.id,
      observerId: observer.id,
      attackerId: attacker.id,
      attackerDefinitionId: attacker.definitionId,
      targetId: target.id,
      tick,
      severity,
      damage,
      ...(armorId ? { armorId } : {}),
    });
    events.push({
      siteId: site.id,
      entityId: observer.id,
      targetId: attacker.id,
      kind: "recorded",
      reason: `Actual visible impact recorded on ${recorder.id}: ${id}.`,
    });
  }
}
