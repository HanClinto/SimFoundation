import type { ActionContext, ActionState } from "./actions/Action";

export interface Need {
  value: number;
  increasePerTick: number;
  criticalAt?: number;
}

export function applyNeedChanges(
  needs: Record<string, Need>,
  changes: Readonly<Record<string, number>>,
): void {
  for (const [id, change] of Object.entries(changes)) {
    const need = needs[id];
    if (need) need.value = Math.max(0, Math.min(100, need.value + change));
  }
}

export interface NeedActionProvider {
  offer(context: ActionContext, needId: string): NeedActionOffer | null;
}

export interface NeedActionOffer {
  action: ActionState;
  relief: number;
}

export function chooseNeedAction(
  context: ActionContext,
  providers: readonly NeedActionProvider[],
  criticalOnly = false,
): ActionState | null {
  const urgent = Object.entries(context.pawn.needs)
    .filter(
      ([, need]) =>
        need.value > 0 &&
        (!criticalOnly ||
          (need.criticalAt !== undefined && need.value >= need.criticalAt)),
    )
    .sort(
      ([firstId, first], [secondId, second]) =>
        second.value - first.value ||
        (firstId < secondId ? -1 : firstId > secondId ? 1 : 0),
    );
  for (const [needId] of urgent) {
    let best: NeedActionOffer | null = null;
    for (const provider of providers) {
      const offer = provider.offer(context, needId);
      if (offer && offer.relief > 0 && (!best || offer.relief > best.relief))
        best = offer;
    }
    if (best) return best.action;
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
