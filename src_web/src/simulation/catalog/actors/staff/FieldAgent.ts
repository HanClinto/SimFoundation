import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { AnimalTissue } from "../../materials/AnimalTissue";

export const FieldAgent = {
  id: "field-agent",
  name: "Field agent",
  description:
    "Mobile staff member who accepts player orders and seeks food, sleep or relaxation according to current needs.",
  defaults: {
    kind: "pawn",
    carryable: true,
    blocksMovement: true,
    blocksSight: false,
    materialId: AnimalTissue.id,
    amount: 1,
    mobile: true,
    canAct: true,
    autonomy: true,
    playerControllable: true,
    human: true,
    ageYears: 32,
    health: { wounds: [], bloodLoss: 0 },
    response: {
      faction: "site",
      hostileTo: ["hostile"],
      sight: 8,
      threat: "flee",
    },
    needs: {
      hunger: { value: 20, increasePerTick: 0.1 },
      fatigue: { value: 10, increasePerTick: 0.2 },
      stress: { value: 5, increasePerTick: 0 },
    },
    diet: [
      { accepts: "edible-plant", efficiency: 1 },
      { accepts: "animal-tissue", efficiency: 1 },
    ],
    eatingRate: 0.1,
    queue: [],
    patrol: [],
  },
} satisfies EntityTemplate;
