import type { GameState } from "./state";
import { powerNetwork } from "./power";
import { canObserve } from "./observations";

export const LIGHT_RANGE = 6;
const fields = new WeakMap<GameState, ReadonlyMap<number, number>>();

export function lightField(state: GameState): ReadonlyMap<number, number> {
  const cached = fields.get(state);
  if (cached) return cached;
  const field = new Map<number, number>();
  const power = powerNetwork(state);
  for (const item of state.objects.items) {
    if (
      item.kind !== "light" ||
      item.location.kind !== "ground" ||
      power.readings[item.id]?.status !== "powered"
    )
      continue;
    const origin = item.location.position;
    for (
      let row = Math.max(0, origin.y - LIGHT_RANGE);
      row <= Math.min(state.world.map.height - 1, origin.y + LIGHT_RANGE);
      row += 1
    )
      for (
        let column = Math.max(0, origin.x - LIGHT_RANGE);
        column <= Math.min(state.world.map.width - 1, origin.x + LIGHT_RANGE);
        column += 1
      ) {
        if (
          !canObserve(
            state.world.map,
            origin,
            { x: column, y: row },
            LIGHT_RANGE,
          )
        )
          continue;
        const index = row * state.world.map.width + column;
        const intensity = Math.max(
          0,
          1 - Math.hypot(column - origin.x, row - origin.y) / (LIGHT_RANGE + 1),
        );
        field.set(index, Math.max(field.get(index) ?? 0, intensity));
      }
  }
  fields.set(state, field);
  return field;
}
