import type { Entity } from "../entity/Entity";
import type { Simulation } from "../Simulation";
import type { ActionState } from "../entity/pawn/actions/Action";
import type { EntityTemplates } from "../entity/EntityTemplate";
import { instantiateEntity, type EntityPlacement } from "./EntityPlacement";
import { floorAt, positionOf, samePosition, tileAt } from "./TileMap";
import type { Tile } from "./Tile";
import type { OperatingCycle } from "./OperatingCycle";

export interface Site {
  id: string;
  name: string;
  terrain: readonly string[];
  tiles?: Readonly<Record<string, Tile>>;
  entities: Record<string, Entity>;
  cycle?: OperatingCycle;
}

export interface SiteTemplate {
  readonly name: string;
  readonly terrain: readonly string[];
  readonly tiles?: Readonly<Record<string, Tile>>;
  readonly entities: readonly EntityPlacement[];
  readonly cycle?: Pick<OperatingCycle, "dayTicks" | "nightTicks">;
}

export function instantiateSite(
  state: Simulation,
  template: SiteTemplate,
  definitions: EntityTemplates,
): { state: Simulation; siteId: string } {
  const siteId = `site-${state.nextSiteId}`;
  if (
    template.cycle &&
    (!Number.isSafeInteger(template.cycle.dayTicks) ||
      template.cycle.dayTicks < 1 ||
      !Number.isSafeInteger(template.cycle.nightTicks) ||
      template.cycle.nightTicks < 1 ||
      !Number.isSafeInteger(
        template.cycle.dayTicks + template.cycle.nightTicks,
      ))
  )
    throw new Error(
      "Operating cycle durations must be positive safe integers.",
    );
  if (state.sites[siteId]) throw new Error("Site ID is already in use.");
  const ids = new Map(
    template.entities.map((entity) => [entity.id, `${siteId}:${entity.id}`]),
  );
  if (ids.size !== template.entities.length)
    throw new Error("Template entity IDs must be unique.");
  const reference = (id: string) => {
    const target = ids.get(id);
    if (!target) throw new Error(`Unknown local template reference: ${id}`);
    return target;
  };
  const entities = template.entities.map((source): Entity => {
    const entity = instantiateEntity(source, definitions);
    const location =
      entity.location.kind === "ground"
        ? entity.location
        : {
            kind: "carried" as const,
            carrierId: reference(entity.location.carrierId),
          };
    if (entity.kind !== "pawn")
      return { ...entity, id: reference(entity.id), location };
    return {
      ...entity,
      id: reference(entity.id),
      location,
      ...(entity.serviceDuty
        ? { serviceDuty: reference(entity.serviceDuty) }
        : {}),
      queue: entity.queue.map((entry, index) => {
        let action: ActionState =
          "targetId" in entry.action
            ? { ...entry.action, targetId: reference(entry.action.targetId) }
            : entry.action;
        if (action.kind === "dispense" && action.sourceId)
          action = { ...action, sourceId: reference(action.sourceId) };
        if (action.kind === "pack")
          action = { ...action, caseId: reference(action.caseId) };
        if (action.kind === "nurse")
          action = { ...action, bedId: reference(action.bedId) };
        if (action.kind === "restrain")
          action = { ...action, restraintId: reference(action.restraintId) };
        if (action.kind === "contain")
          action = { ...action, cellId: reference(action.cellId) };
        if (action.kind === "repair-equipment")
          action = { ...action, benchId: reference(action.benchId) };
        if (action.kind === "give")
          action = { ...action, recipientId: reference(action.recipientId) };
        return {
          ...entry,
          id: `${reference(entity.id)}:initial-action-${index}`,
          action,
        };
      }),
    };
  });
  const site: Site = {
    id: siteId,
    name: template.name,
    ...(template.cycle
      ? { cycle: { ...template.cycle, startedTick: null } }
      : {}),
    terrain: [...template.terrain],
    ...(template.tiles ? { tiles: structuredClone(template.tiles) } : {}),
    entities: Object.fromEntries(entities.map((entity) => [entity.id, entity])),
  };
  if (
    !site.terrain.length ||
    !site.terrain[0]!.length ||
    site.terrain.some(
      (row, rowIndex) =>
        row.length !== site.terrain[0]!.length ||
        [...row].some(
          (_symbol, columnIndex) =>
            !tileAt(site, { x: columnIndex, y: rowIndex }),
        ),
    )
  )
    throw new Error("Use a rectangular terrain map with defined tile symbols.");
  for (const entity of entities) {
    const position = positionOf(site, entity.id);
    if (
      entity.kind === "facility" &&
      entity.containment &&
      position &&
      !floorAt(site, {
        x: position.x + entity.containment.exitOffset.x,
        y: position.y + entity.containment.exitOffset.y,
      })
    )
      throw new Error("A holding cell needs a floor exit beside its location.");
    if (!position || !floorAt(site, position))
      throw new Error(
        "Entity locations must resolve to a floor tile without carrier cycles.",
      );
    if (
      entity.kind === "door" &&
      (entity.location.kind !== "ground" ||
        entities.some(
          (other) =>
            other.id !== entity.id &&
            other.kind === "door" &&
            other.location.kind === "ground" &&
            samePosition(other.location.position, position),
        ))
    )
      throw new Error("Doors need distinct ground locations.");
  }
  return {
    siteId,
    state: {
      ...state,
      nextSiteId: state.nextSiteId + 1,
      sites: { ...state.sites, [siteId]: site },
    },
  };
}

export function disposeSite(
  state: Simulation,
  siteId: string,
): { state: Simulation; reason: string | null } {
  const site = state.sites[siteId];
  if (!site) return { state, reason: "Site does not exist." };
  if (Object.keys(site.entities).length)
    return { state, reason: "Remove the site's entities first." };
  if (
    Object.values(state.transfers).some(
      (transfer) =>
        transfer.originId === siteId || transfer.destinationId === siteId,
    )
  )
    return { state, reason: "The site is an active transfer endpoint." };
  const sites = { ...state.sites };
  delete sites[siteId];
  return { state: { ...state, sites }, reason: null };
}
