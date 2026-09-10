import type { SiteTemplate } from "../../../core/site/Site";
import type { EntityPlacement } from "../../../core/site/EntityPlacement";

const placements: EntityPlacement[] = [];
for (let index = 0; index < 12; index++) {
  placements.push({
    id: `worker-${index}`,
    definitionId: index === 11 ? "medic" : "researcher",
    location: {
      kind: "ground",
      position: { x: 3 + (index % 6) * 6, y: 5 + Math.floor(index / 6) * 12 },
    },
    overrides: {
      ...(index === 10
        ? {
            health: {
              bloodLoss: 0,
              wounds: [{ id: "workplace-injury", severity: 10, bleeding: 0.1 }],
            },
          }
        : {}),
      needs: {
        hunger: { value: 15 + index, increasePerTick: 0.05 },
        fatigue: { value: 20 + index, increasePerTick: 0.08 },
        stress: { value: 10, increasePerTick: 0 },
        curiosity: { value: 30, increasePerTick: 0.08 },
        restlessness: { value: 15, increasePerTick: 0.04 },
      },
    },
  });
}
for (let index = 0; index < 4; index++) {
  const column = 5 + (index % 2) * 20;
  const row = 3 + Math.floor(index / 2) * 12;
  for (const [offset, definitionId] of [
    "bed",
    "armchair",
    "research-desk",
    "exercise-bike",
    "bookshelf",
  ].entries()) {
    placements.push({
      id: `${definitionId}-${index}`,
      definitionId,
      location: {
        kind: "ground",
        position: { x: column + offset * 2, y: row },
      },
    });
  }
  placements.push({
    id: `food-${index}`,
    definitionId: "packaged-meal",
    overrides: { amount: 20 },
    location: { kind: "ground", position: { x: column, y: row + 6 } },
  });
}

export const Colony: SiteTemplate = {
  name: "Shared facility colony",
  terrain: Array.from({ length: 26 }, (_, row) =>
    Array.from({ length: 42 }, (_, column) =>
      row === 0 ||
      row === 25 ||
      column === 0 ||
      column === 41 ||
      (row === 12 && column !== 10 && column !== 30)
        ? "#"
        : ".",
    ).join(""),
  ),
  entities: placements,
};
