import type { GameState } from "../../simulation/state";
import type { PhysicalObject } from "../../simulation/objects";
import type { TilePosition } from "../../simulation/world";

export interface SceneEntry {
  readonly id: string;
  readonly position: TilePosition;
  readonly object?: PhysicalObject;
}

export function sceneOrder(
  state: GameState,
  displayedPositions: Readonly<Record<string, TilePosition>>,
  selectedId: string | null,
): readonly SceneEntry[] {
  const entries: SceneEntry[] = Object.entries(displayedPositions).map(
    ([id, position]) => ({ id, position }),
  );
  for (const item of state.objects.items) {
    if (
      item.location.kind !== "ground" ||
      (item.kind === "cable" && item.installed)
    )
      continue;
    entries.push({
      id: `object:${item.id}`,
      position: item.location.position,
      object: item,
    });
  }
  return entries.sort(
    (first, second) =>
      first.position.x +
        first.position.y -
        second.position.x -
        second.position.y ||
      Number(first.id === selectedId) - Number(second.id === selectedId) ||
      first.id.localeCompare(second.id),
  );
}

export function foregroundWallOpacity(
  position: TilePosition,
  selection: TilePosition | undefined,
): number {
  if (!selection) return 1;
  const distance =
    Math.abs(position.x - selection.x) + Math.abs(position.y - selection.y);
  return distance > 0 &&
    distance <= 2 &&
    position.x + position.y >= selection.x + selection.y
    ? 0.35
    : 1;
}
