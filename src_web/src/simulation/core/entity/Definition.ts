import type { Entity, Location } from "./Entity";

type Defaults<Instance> = Instance extends Entity
  ? Omit<Instance, "id" | "definitionId" | "name" | "location">
  : never;

export interface EntityDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly defaults: Defaults<Entity>;
}

export type EntityDefinitions = Readonly<Record<string, EntityDefinition>>;

type Overrides<Instance> = Instance extends Entity
  ? Partial<Omit<Instance, "id" | "definitionId" | "kind" | "location">>
  : never;

export interface EntityPlacement {
  readonly id: string;
  readonly definitionId: string;
  readonly location: Location;
  readonly overrides?: Overrides<Entity>;
}

export function instantiateEntity(
  placement: EntityPlacement,
  definitions: EntityDefinitions,
): Entity {
  const definition = definitions[placement.definitionId];
  if (!definition)
    throw new Error(`Unknown entity definition: ${placement.definitionId}`);
  return structuredClone({
    ...definition.defaults,
    name: definition.name,
    ...placement.overrides,
    kind: definition.defaults.kind,
    id: placement.id,
    definitionId: definition.id,
    location: placement.location,
  }) as Entity;
}
