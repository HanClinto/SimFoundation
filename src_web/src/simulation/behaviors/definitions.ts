import type { Entity, Site } from "../model";
import type { Proposal } from "../actions/proposals";
import { tickPawn } from "./pawn";
import { tickAutomaticDoor } from "./automatic-door";

interface Definition {
  readonly onTick?: (
    site: Site,
    entity: Entity,
    tick: number,
  ) => Proposal | null;
}

const pawn: Definition = {
  onTick: (site, entity, tick) =>
    entity.kind === "pawn" ? tickPawn(site, entity, tick) : null,
};

export const definitions: Readonly<Record<Entity["definitionId"], Definition>> =
  {
    staff: pawn,
    wanderer: pawn,
    item: {},
    "automatic-door": {
      onTick: (site, entity) =>
        entity.kind === "door" ? tickAutomaticDoor(site, entity) : null,
    },
  };
