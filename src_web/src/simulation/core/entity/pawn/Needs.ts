import type { ActionContext, ActionState } from "./actions/Action";

export interface Need {
  value: number;
  increasePerTick: number;
}

export interface NeedActionProvider {
  readonly needId: string;
  findAction(context: ActionContext): ActionState | null;
}

export function chooseNeedAction(
  context: ActionContext,
  providers: readonly NeedActionProvider[],
): ActionState | null {
  const urgent = Object.entries(context.pawn.needs)
    .filter(([, need]) => need.value >= 50)
    .sort(
      ([firstId, first], [secondId, second]) =>
        second.value - first.value ||
        (firstId < secondId ? -1 : firstId > secondId ? 1 : 0),
    );
  for (const [needId] of urgent) {
    for (const provider of providers) {
      if (provider.needId !== needId) continue;
      const action = provider.findAction(context);
      if (action) return action;
    }
  }
  return null;
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
