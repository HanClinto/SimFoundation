export interface Need {
  value: number;
  increasePerTick: number;
}

export function advanceNeeds(
  needs: Record<string, Need>,
): Record<string, Need> {
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
