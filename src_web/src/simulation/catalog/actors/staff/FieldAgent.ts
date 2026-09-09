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
    materialId: AnimalTissue.id,
    amount: 1,
    mobile: true,
    canAct: true,
    autonomy: true,
    playerControllable: true,
    needs: {
      hunger: { value: 20, increasePerTick: 0.1 },
      fatigue: { value: 10, increasePerTick: 0.2 },
      stress: { value: 5, increasePerTick: 0 },
    },
    diet: [
      { accepts: "edible-plant", nourishment: 30 },
      { accepts: "animal-tissue", nourishment: 30 },
    ],
    queue: [],
    patrol: [],
  },
} satisfies EntityTemplate;
