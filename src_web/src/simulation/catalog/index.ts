import type { EntityTemplates } from "../core/entity/EntityTemplate";
import type { Materials } from "../core/material/Material";
import { FieldAgent } from "./actors/staff/FieldAgent";
import { EyePod } from "./quests/scp131/setup";
import { SCP173, SCP173Maintenance, CleaningPack } from "./quests/scp173/setup";
import { AccidentCasualty } from "./campaign/emergency";
import { KineticHoldingCell, ContainmentCharge } from "./campaign/holding";
import {
  InterventionTool,
  KineticSpecimen,
  SuppressionUnit,
  EquipmentBench,
} from "./campaign/intervention";
import {
  ProtectiveVest,
  ImpactProtectiveVest,
} from "./campaign/ProtectiveVest";
import {
  TransportRestraint,
  DampedTransportRestraint,
} from "./campaign/TransportRestraint";
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
import { CareRecipient } from "./actors/staff/CareRecipient";
import { CourierSpecimen, SpecimenCase } from "./campaign/courier";
import {
  ClinicalBed,
  ClinicalPack,
  WoundCarePack,
  FieldMedicalKit,
  FieldMedicalUnit,
} from "./campaign/clinic";
import { HostileGuard } from "./actors/threats/HostileGuard";
import { SCP1370 } from "./actors/anomalies/SCP1370";
import { SCP294 } from "./actors/anomalies/SCP294";
import { SCP507 } from "./actors/anomalies/SCP507";
import { SCP2295 } from "./actors/anomalies/SCP2295";
import { SCP2006 } from "./actors/anomalies/SCP2006";
import {
  StoreEmployee,
  StoreSurvivor,
  StoreShelter,
} from "./quests/scp3008/setup";
import {
  ActingGuide,
  RehearsalDesk,
  ApprovedProgramme,
  UnreviewedProgramme,
  ScreeningRig,
} from "./quests/scp2006/setup";
import { TextileBundle, OrganTraumaPatient } from "./quests/scp2295/setup";
import { Fabric } from "./materials/Fabric";
import {
  DinerRegular,
  MaintenanceParts,
  DinerCounter,
} from "./quests/scp1295/setup";
import {
  ReturneeFlashlight,
  ReturneeLog,
  ReturneeReviewStation,
} from "./quests/scp507/setup";
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
import { SurveyKit, KestrelStation } from "./campaign/supplies";

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
    CareRecipient,
    CourierSpecimen,
    SpecimenCase,
    ClinicalBed,
    ClinicalPack,
    WoundCarePack,
    FieldMedicalKit,
    FieldMedicalUnit,
    HostileGuard,
    SCP1370,
    SCP294,
    SCP507,
    SCP2295,
    SCP2006,
    StoreEmployee,
    StoreSurvivor,
    StoreShelter,
    AccidentCasualty,
    KineticHoldingCell,
    SCP173,
    EyePod,
    SCP173Maintenance,
    CleaningPack,
    ContainmentCharge,
    InterventionTool,
    ProtectiveVest,
    ImpactProtectiveVest,
    KineticSpecimen,
    TransportRestraint,
    DampedTransportRestraint,
    SuppressionUnit,
    EquipmentBench,
    ActingGuide,
    RehearsalDesk,
    ApprovedProgramme,
    UnreviewedProgramme,
    ScreeningRig,
    TextileBundle,
    OrganTraumaPatient,
    DinerRegular,
    MaintenanceParts,
    DinerCounter,
    ReturneeFlashlight,
    ReturneeLog,
    ReturneeReviewStation,
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
    SurveyKit,
    KestrelStation,
  ].map((entry) => [entry.id, entry]),
);

export const materials: Materials = Object.fromEntries(
  [Steel, Wood, Plastic, Stone, PlantFood, AnimalTissue, Water, Fabric].map(
    (entry) => [entry.id, entry],
  ),
);
