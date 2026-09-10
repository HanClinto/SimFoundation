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
import { Soldier } from "./actors/staff/Soldier";
import { Medic } from "./actors/staff/Medic";
import { HostileGuard } from "./actors/threats/HostileGuard";
import { SCP1370 } from "./actors/anomalies/SCP1370";
import { SCP294 } from "./actors/anomalies/SCP294";
import { Water } from "./materials/Water";
import {
  CoinAllocation,
  WaterReservoir,
  CoffeeReservoir,
  TracerReservoir,
  WaterSample,
  CoffeeSample,
  TracerSample,
  SampleBench,
} from "./quests/scp294/apparatus";
import {
  BlackwoodJournal,
  BlackwoodSpecimen,
  IndependentSurvey,
  LaboratoryDossier,
  UnverifiedDevice,
  CorroborationBench,
} from "./quests/scp1867/collection";
import { ExhibitObservationStation } from "./quests/scp1370/display";
import {
  TransportDocket,
  SurveyKit,
  KestrelStation,
} from "./campaign/supplies";

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
    Soldier,
    Medic,
    HostileGuard,
    SCP1370,
    SCP294,
    CoinAllocation,
    WaterReservoir,
    CoffeeReservoir,
    TracerReservoir,
    WaterSample,
    CoffeeSample,
    TracerSample,
    SampleBench,
    BlackwoodJournal,
    BlackwoodSpecimen,
    IndependentSurvey,
    LaboratoryDossier,
    UnverifiedDevice,
    CorroborationBench,
    ExhibitObservationStation,
    TransportDocket,
    SurveyKit,
    KestrelStation,
  ].map((entry) => [entry.id, entry]),
);

export const materials: Materials = Object.fromEntries(
  [Steel, Wood, Plastic, Stone, PlantFood, AnimalTissue, Water].map((entry) => [
    entry.id,
    entry,
  ]),
);
