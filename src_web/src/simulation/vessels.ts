import type { GameState } from "./state";
import { MATERIALS } from "./materials";
import type { ExposureSource } from "./environment";
import type { PhysicalObject } from "./objects";

export function containingVessel(
  state: GameState,
  objectId: string,
): PhysicalObject | undefined {
  const object = state.objects.items.find((item) => item.id === objectId);
  const vesselId =
    object?.location.kind === "contained" ? object.location.vesselId : null;
  return state.objects.items.find(
    (item) => item.id === vesselId && item.kind === "vessel",
  );
}

export function containingBarrier(
  state: GameState,
  source: ExposureSource,
): PhysicalObject | undefined {
  if (!source.objectId) return undefined;
  const vessel = containingVessel(state, source.objectId);
  return vessel?.vessel?.sealed && vessel.condition > 0 ? vessel : undefined;
}

export function advanceVesselWear(state: GameState): GameState {
  const damage = new Map<string, number>();
  for (const source of state.environment.sources) {
    if (source.enabled === false) continue;
    const vessel = containingBarrier(state, source);
    if (!vessel?.vessel) continue;
    const material = MATERIALS[vessel.vessel.material];
    const resistance =
      source.kind === "corrosion"
        ? material.corrosionResistance
        : material.impactResistance;
    damage.set(
      vessel.id,
      (damage.get(vessel.id) ?? 0) + (source.dose * (10 - resistance)) / 100,
    );
  }
  if (!damage.size) return state;
  return {
    ...state,
    objects: {
      ...state.objects,
      items: state.objects.items.map((item) =>
        damage.has(item.id)
          ? {
              ...item,
              condition: Math.max(
                0,
                Math.round((item.condition - damage.get(item.id)!) * 10000) /
                  10000,
              ),
            }
          : item,
      ),
    },
  };
}

export function objectEmits(state: GameState, objectId: string): boolean {
  return state.environment.sources.some(
    (source) =>
      source.enabled !== false &&
      source.dose > 0 &&
      (source.objectId === objectId ||
        (source.objectId &&
          containingVessel(state, source.objectId)?.id === objectId &&
          !containingBarrier(state, source))),
  );
}

export function vesselWearRate(
  state: GameState,
  vessel: PhysicalObject,
): number {
  if (!vessel.vessel || !vessel.vessel.sealed || vessel.condition <= 0)
    return 0;
  const material = MATERIALS[vessel.vessel.material];
  return state.environment.sources.reduce(
    (sum, source) =>
      sum +
      (source.enabled !== false &&
      source.objectId &&
      containingVessel(state, source.objectId)?.id === vessel.id
        ? (source.dose *
            (10 -
              (source.kind === "corrosion"
                ? material.corrosionResistance
                : material.impactResistance))) /
          100
        : 0),
    0,
  );
}
