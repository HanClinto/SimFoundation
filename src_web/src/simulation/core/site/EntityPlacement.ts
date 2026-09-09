import type { Entity, Location } from "../entity/Entity";
import type { EntityTemplate, EntityTemplates } from "../entity/EntityTemplate";

type InstanceOverrides = Partial<EntityTemplate["defaults"]> & {
  name?: string;
  kind?: never;
};

export interface EntityPlacement {
  readonly id: string;
  readonly definitionId: string;
  readonly location: Location;
  readonly overrides?: InstanceOverrides;
}

export function instantiateEntity(
  placement: EntityPlacement,
  templates: EntityTemplates,
): Entity {
  const template = templates[placement.definitionId];
  if (!template)
    throw new Error(`Unknown entity template: ${placement.definitionId}`);
  return structuredClone({
    ...template.defaults,
    name: template.name,
    ...placement.overrides,
    kind: template.defaults.kind,
    id: placement.id,
    definitionId: template.id,
    location: placement.location,
  }) as Entity;
}
