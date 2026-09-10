import type { GameState } from "../../simulation_legacy/state";
import { isActiveSurfaceOrder } from "../../simulation_legacy/environment";
import { MATERIALS, type MaterialId } from "../../simulation_legacy/materials";
import { sameTile, type TilePosition } from "../../simulation_legacy/world";
import type { MapPerspective } from "./map-settings";
import { isElectrical } from "../../simulation_legacy/power";

export interface WorkVisual {
  readonly id: string;
  readonly position: TilePosition;
  readonly kind:
    | "floor"
    | "wall"
    | "door"
    | "vessel"
    | "generator"
    | "cable"
    | "light";
  readonly material: MaterialId;
  readonly removal: boolean;
  readonly stage: "planned" | "fitting";
  readonly progress: number;
  readonly active: boolean;
  readonly blocked: boolean;
}

const cache = new WeakMap<
  GameState,
  Partial<Record<MapPerspective, readonly WorkVisual[]>>
>();

export function workSiteVisuals(
  state: GameState,
  perspective: MapPerspective,
): readonly WorkVisual[] {
  const cached = cache.get(state)?.[perspective];
  if (cached) return cached;
  const visible = new Set(state.observations.visibleTiles);
  const result: WorkVisual[] = [];
  const add = (
    id: string,
    position: TilePosition,
    kind: WorkVisual["kind"],
    material: MaterialId,
    removal: boolean,
    fitting: boolean,
    jobId: string,
    blocked: boolean,
  ) => {
    const known =
      perspective === "world" ||
      visible.has(position.y * state.world.map.width + position.x);
    const job = state.jobs.find((job) => job.id === jobId);
    const worker = job?.assignedPersonId
      ? state.world.positions[job.assignedPersonId]
      : null;
    result.push({
      id,
      position,
      kind,
      material,
      removal,
      stage: known && fitting ? "fitting" : "planned",
      progress:
        known && fitting && job
          ? Math.max(
              0,
              Math.min(1, job.progress / Math.max(1, job.requiredProgress)),
            )
          : 0,
      active: !!(
        known &&
        fitting &&
        job?.status === "in-progress" &&
        worker &&
        sameTile(worker, job.workSite)
      ),
      blocked: known && blocked,
    });
  };
  for (const order of state.environment.orders) {
    if (!isActiveSurfaceOrder(order)) continue;
    const old =
      state.world.map.surfaces[
        order.position.y * state.world.map.width + order.position.x
      ]?.[order.layer];
    add(
      order.id,
      order.position,
      order.layer === "floor"
        ? "floor"
        : order.operation === "door" ||
            old?.kind === "door" ||
            old?.kind === "closed-door"
          ? "door"
          : "wall",
      order.material,
      order.operation === "remove",
      order.phase === "fitting",
      order.jobId,
      !!order.blockedReason || !!order.cancelRequested,
    );
  }
  for (const order of state.vesselWork.orders) {
    if (
      !["craft", "repair"].includes(order.action) ||
      ["completed", "cancelled", "transit"].includes(order.phase)
    )
      continue;
    const target = state.objects.items.find(
      (item) => item.id === order.vesselId,
    );
    add(
      order.id,
      order.position,
      target && isElectrical(target) ? target.kind : "vessel",
      order.material,
      false,
      order.phase === "working",
      order.jobId,
      !!order.blockedReason,
    );
  }
  for (const order of state.objectOrders) {
    const target = state.objects.items.find(
      (item) => item.id === order.objectId,
    );
    if (
      !target ||
      !isElectrical(target) ||
      !order.install ||
      ["completed", "cancelled"].includes(order.phase)
    )
      continue;
    add(
      order.id,
      order.destination,
      target.kind,
      "steel",
      false,
      order.phase === "install",
      order.jobId,
      !!order.blockedReason,
    );
  }
  cache.set(state, { ...cache.get(state), [perspective]: result });
  return result;
}

export function drawWorkSites(
  context: CanvasRenderingContext2D,
  sites: readonly WorkVisual[],
  zoom: number,
  width: number,
  height: number,
  time: number,
  effects: boolean,
  project: (position: TilePosition) => TilePosition,
): void {
  for (const site of sites) {
    const point = project(site.position);
    if (
      point.x < -40 ||
      point.y < -40 ||
      point.x > width + 40 ||
      point.y > height + 40
    )
      continue;
    context.save();
    context.translate(point.x, point.y);
    context.scale(zoom, zoom);
    context.strokeStyle = site.removal
      ? "#bd6557"
      : site.blocked
        ? "#d5ad44"
        : "#5bb5c5";
    context.lineWidth = 1.5;
    context.setLineDash([3, 2]);
    const raised = site.kind !== "floor" && site.kind !== "cable";
    const top = raised ? -25 : -10;
    context.beginPath();
    context.moveTo(0, top);
    context.lineTo(18, top + 9);
    context.lineTo(0, top + 18);
    context.lineTo(-18, top + 9);
    context.closePath();
    context.stroke();
    context.setLineDash([]);
    if (raised) {
      context.beginPath();
      for (const horizontal of [-18, 0, 18]) {
        context.moveTo(horizontal, top + (horizontal === 0 ? 18 : 9));
        context.lineTo(horizontal, horizontal === 0 ? 9 : 0);
      }
      context.stroke();
    }
    if (site.removal) {
      context.beginPath();
      context.moveTo(-9, -13);
      context.lineTo(9, 0);
      context.moveTo(9, -13);
      context.lineTo(-9, 0);
      context.stroke();
    }
    if (site.stage === "fitting") {
      context.globalAlpha = 0.7;
      context.fillStyle = MATERIALS[site.material].color;
      const height = 3 + site.progress * 12;
      context.fillRect(-12, -height, 24, height);
      context.globalAlpha = 1;
      context.strokeStyle = "#a48b57";
      context.beginPath();
      context.moveTo(-16, 3);
      context.lineTo(-16, -24);
      context.lineTo(16, -8);
      context.lineTo(16, 3);
      context.moveTo(-16, -8);
      context.lineTo(16, -24);
      context.stroke();
      context.fillStyle = "#28443b";
      context.fillRect(-13, 5, 26, 3);
      context.fillStyle = "#c8dba4";
      context.fillRect(-13, 5, 26 * site.progress, 3);
      if (site.active && effects && time > 0) {
        context.fillStyle = "#fff1ab";
        for (let spark = 0; spark < 3; spark += 1) {
          const phase = (time / 160 + spark / 3) % 1;
          context.fillRect(6 + spark * 3 - phase * 5, -12 - phase * 10, 2, 2);
        }
      }
    }
    context.restore();
  }
}
