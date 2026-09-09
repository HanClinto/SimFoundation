import type { EntityDefinition } from "../../../core/entity/Definition";
import { AnimalTissue } from "../../materials/AnimalTissue";

export const FieldAgent = {
  id: "field-agent",
  name: "Field agent",
  description:
    "Mobile staff member who accepts player orders and chooses food or patrol work when autonomous.",
  defaults: {
    kind: "pawn",
    carryable: true,
    materialId: AnimalTissue.id,
    amount: 1,
    mobile: true,
    canAct: true,
    autonomy: true,
    playerControllable: true,
    needs: { hunger: { value: 20, increasePerTick: 0.1 } },
    diet: [
      { accepts: "edible-plant", nourishment: 30 },
      { accepts: "animal-tissue", nourishment: 30 },
    ],
    queue: [],
    patrol: [],
  },
} satisfies EntityDefinition;
