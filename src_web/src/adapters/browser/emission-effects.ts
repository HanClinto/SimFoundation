import type { GameState } from "../../simulation/state";
import { exposureTiles } from "../../simulation/environment";
import type { TilePosition } from "../../simulation/world";
import type { MapPerspective } from "./map-settings";

export interface EmissionMote {
  readonly position: TilePosition;
  readonly kind: "corrosion" | "impact";
  readonly phase: number;
  readonly spread: number;
}

const projections = new WeakMap<GameState, readonly EmissionMote[]>();
export const MAX_EMISSION_MOTES = 512;

export function emissionMotes(
  state: GameState,
  perspective: MapPerspective,
): readonly EmissionMote[] {
  if (perspective !== "world") return [];
  const cached = projections.get(state);
  if (cached) return cached;
  const motes: EmissionMote[] = [];
  for (const source of state.environment.sources) {
    const tiles = exposureTiles(state, source);
    if (!tiles.length) continue;
    let seed = 0;
    for (const character of source.id)
      seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
    const count = Math.min(
      16,
      Math.max(4, tiles.length * 2),
      MAX_EMISSION_MOTES - motes.length,
    );
    for (let index = 0; index < count; index += 1) {
      const tile = tiles[index === 0 ? 0 : (seed + index * 17) % tiles.length]!;
      motes.push({
        position: { ...tile },
        kind: source.kind,
        phase: (((seed % 997) + index * 137) % 997) / 997,
        spread: (((seed % 101) + index * 37) % 101) / 100,
      });
    }
    if (motes.length === MAX_EMISSION_MOTES) break;
  }
  projections.set(state, motes);
  return motes;
}

export function drawEmissionEffects(
  context: CanvasRenderingContext2D,
  motes: readonly EmissionMote[],
  timeMs: number,
  zoom: number,
  width: number,
  height: number,
  project: (position: TilePosition) => TilePosition,
): void {
  if (zoom < 0.3 || width <= 0 || height <= 0) return;
  context.save();
  for (const mote of motes) {
    const point = project(mote.position);
    if (
      point.x < -24 ||
      point.x > width + 24 ||
      point.y < -24 ||
      point.y > height + 24
    )
      continue;
    const progress =
      (Math.max(0, timeMs) / (mote.kind === "corrosion" ? 1800 : 950) +
        mote.phase) %
      1;
    const lift =
      mote.kind === "corrosion"
        ? progress * 18
        : Math.sin(progress * Math.PI) * 12;
    const drift =
      mote.kind === "corrosion"
        ? Math.sin(progress * Math.PI * 2 + mote.spread * 5) * 4
        : (progress - 0.5) * 12;
    const centerX = point.x + ((mote.spread - 0.5) * 10 + drift) * zoom;
    const centerY = point.y - (3 + lift) * zoom;
    const size = Math.max(1, (mote.kind === "corrosion" ? 3 : 2) * zoom);
    context.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
    context.fillStyle = mote.kind === "corrosion" ? "#70d8a5" : "#ffcf69";
    context.fillRect(Math.round(centerX), Math.round(centerY), size, size);
    context.fillStyle = mote.kind === "corrosion" ? "#d3ffe4" : "#ef8a55";
    if (mote.kind === "impact")
      context.fillRect(
        Math.round(centerX - size * 2),
        Math.round(centerY + size),
        size * 3,
        Math.max(1, zoom),
      );
    else
      context.fillRect(
        Math.round(centerX),
        Math.round(centerY - size),
        Math.max(1, zoom),
        Math.max(1, zoom),
      );
  }
  context.restore();
}
