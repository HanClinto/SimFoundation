import type { ObjectStore, PhysicalObject } from "./objects";
import { findRoute, type SiteWorld, type TilePosition } from "./world";
import type { SiteCamera } from "./observations";

export function installStartingPower(
  objects: ObjectStore,
  world: SiteWorld,
  cameras: readonly SiteCamera[],
): ObjectStore {
  const origin = { x: 73, y: 67 };
  const device = (
    id: string,
    kind: "generator" | "cable" | "light",
    position: TilePosition,
    installed = true,
  ): PhysicalObject => ({
    id,
    kind,
    quantity: 1,
    condition: 100,
    orientation: "north",
    installed,
    reservedBy: null,
    utilityEnabled: true,
    location: { kind: "ground", position },
  });
  const lights = [
    { x: 57, y: 57 },
    { x: 70, y: 57 },
    { x: 57, y: 65 },
    { x: 50, y: 75 },
    { x: 57, y: 75 },
    { x: 74, y: 72 },
  ];
  const cables = new Map<string, TilePosition>();
  for (const target of [
    ...lights,
    ...cameras.map((camera) => camera.position),
  ]) {
    for (const position of findRoute(
      { ...world.map, objectBlocks: [] },
      origin,
      target,
    ) ?? [])
      cables.set(`${position.x},${position.y}`, position);
  }
  return {
    ...objects,
    items: [
      ...objects.items,
      device("generator-main", "generator", origin),
      ...lights.map((position, index) =>
        device(`light-${index + 1}`, "light", position),
      ),
      ...Array.from(cables.values()).map((position, index) =>
        device(`cable-${index + 1}`, "cable", position),
      ),
      device("generator-spare", "generator", { x: 72, y: 68 }, false),
      ...Array.from({ length: 6 }, (_, index) =>
        device(`light-spare-${index + 1}`, "light", { x: 74, y: 68 }, false),
      ),
      ...Array.from({ length: 24 }, (_, index) =>
        device(`cable-spare-${index + 1}`, "cable", { x: 68, y: 75 }, false),
      ),
    ],
  };
}
