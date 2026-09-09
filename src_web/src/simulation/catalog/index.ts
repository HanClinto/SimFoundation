import type { EntityDefinitions } from "../core/entity/Definition";
import type { Materials } from "../core/material/Material";
import { FieldAgent } from "./actors/staff/FieldAgent";
import { AutomaticSteelDoor } from "./entities/doors/AutomaticSteelDoor";
import { PackagedMeal } from "./entities/supplies/PackagedMeal";
import { Steel } from "./materials/Steel";
import { Wood } from "./materials/Wood";
import { Plastic } from "./materials/Plastic";
import { Stone } from "./materials/Stone";
import { PlantFood } from "./materials/PlantFood";
import { AnimalTissue } from "./materials/AnimalTissue";

export const entities: EntityDefinitions = Object.fromEntries(
  [FieldAgent, AutomaticSteelDoor, PackagedMeal].map((entry) => [
    entry.id,
    entry,
  ]),
);

export const materials: Materials = Object.fromEntries(
  [Steel, Wood, Plastic, Stone, PlantFood, AnimalTissue].map((entry) => [
    entry.id,
    entry,
  ]),
);
