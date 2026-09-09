import type { EntityTemplates } from "../core/entity/EntityTemplate";
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
import { Bed } from "./entities/furniture/Bed";
import { Armchair } from "./entities/furniture/Armchair";
import { ResearchDesk } from "./entities/equipment/ResearchDesk";
import { Bookshelf } from "./entities/furniture/Bookshelf";
import { ExerciseBike } from "./entities/equipment/ExerciseBike";
import { Researcher } from "./actors/staff/Researcher";

export const entities: EntityTemplates = Object.fromEntries(
  [
    FieldAgent,
    AutomaticSteelDoor,
    PackagedMeal,
    Bed,
    Armchair,
    ResearchDesk,
    Bookshelf,
    ExerciseBike,
    Researcher,
  ].map((entry) => [entry.id, entry]),
);

export const materials: Materials = Object.fromEntries(
  [Steel, Wood, Plastic, Stone, PlantFood, AnimalTissue].map((entry) => [
    entry.id,
    entry,
  ]),
);
