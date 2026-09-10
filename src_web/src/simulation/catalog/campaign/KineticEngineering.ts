import type { StudyPlan } from "../../core/entity/Study";
import type { CraftingRecipe } from "../../core/entity/Crafting";
import { DampedTransportRestraint } from "./TransportRestraint";

export const KineticLoadingStudy: StudyPlan = {
  id: "kinetic-damping",
  title: "Kinetic restraint loading study",
  ticks: 12,
  requires: ["kinetic-specimen"],
  containedSources: true,
  finding:
    "Timed observation of the same living subject under effective holding records a repeated loading rhythm. The measured pattern supports a kinetic-specific damped restraint design at the workshop: slower conscious wear, not consent or permanent containment. This is original game research, not a canonical SCP finding.",
};

export const DampedRestraintRecipe: CraftingRecipe = {
  id: "damped-restraint",
  title: "Damped kinetic restraint",
  requiresFinding: KineticLoadingStudy.id,
  ticks: 16,
  supplyDefinitionId: "maintenance-parts",
  amount: 2,
  output: {
    ...DampedTransportRestraint.defaults,
    definitionId: DampedTransportRestraint.id,
    name: DampedTransportRestraint.name,
  },
};
