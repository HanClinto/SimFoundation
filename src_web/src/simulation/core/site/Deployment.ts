import type { Position } from "../entity/Entity";
import type { EntityTemplates } from "../entity/EntityTemplate";
import type { Simulation } from "../Simulation";
import { instantiateEntity } from "./EntityPlacement";
import { traversalAt } from "./TileMap";

export interface Deployment {
  readonly entries: Readonly<Record<string, readonly Position[]>>;
  readonly templates: readonly string[];
  readonly roles: readonly string[];
  readonly maximumTeam: number;
}

export function deployPawn(
  state: Simulation,
  siteId: string,
  deployment: Deployment,
  templates: EntityTemplates,
  templateId: string,
  alias: string,
  entryId: string,
): Simulation {
  const site = state.sites[siteId];
  if (!site) throw new Error("Deployment site is unavailable.");
  if (!/^[a-z][a-z0-9-]*$/.test(alias) || /^o\d+$/.test(alias))
    throw new Error(
      "Use an alias starting with a lowercase letter, followed by letters, digits or hyphens; oN is reserved for object labels.",
    );
  if (!deployment.templates.includes(templateId))
    throw new Error("This staff template is not available for deployment.");
  const template = templates[templateId];
  if (
    template?.defaults.kind !== "pawn" ||
    !template.defaults.playerControllable
  )
    throw new Error("Choose a controllable staff template.");
  const id = `${siteId}:${alias}`;
  if (
    Object.values(state.sites).some((owned) => owned.entities[id]) ||
    Object.values(state.transfers).some((transfer) => transfer.entities[id])
  )
    throw new Error("That entity alias is already in use.");
  const entries = deployment.entries[entryId];
  if (!entries) throw new Error("Unknown deployment entry point.");
  const position = entries.find(
    (point) => traversalAt(site, point).kind === "clear",
  );
  if (!position)
    throw new Error(
      "All positions at this entry point are occupied or blocked.",
    );
  const pawn = instantiateEntity(
    {
      id,
      definitionId: templateId,
      location: { kind: "ground", position: { ...position } },
      overrides: { name: alias, autonomy: false },
    },
    templates,
  );
  return {
    ...state,
    sites: {
      ...state.sites,
      [siteId]: { ...site, entities: { ...site.entities, [id]: pawn } },
    },
  };
}
