import type { Need } from "../model";

export function advanceNeeds(
  needs: Readonly<Record<string, Need>>,
): Readonly<Record<string, Need>> {
  return Object.fromEntries(
    Object.entries(needs).map(([id, need]) => [
      id,
      {
        ...need,
        value: Math.max(0, Math.min(100, need.value + need.increasePerTick)),
      },
    ]),
  );
}
