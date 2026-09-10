import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Steel } from "../../materials/Steel";

export const ExerciseBike = {
  id: "exercise-bike",
  name: "Exercise bike",
  description:
    "A short workout relieves restlessness and stress but increases fatigue and hunger. No fitness statistics or powered equipment are simulated.",
  defaults: {
    kind: "facility",
    carryable: true,
    blocksMovement: true,
    blocksSight: false,
    materialId: Steel.id,
    amount: 1,
    activities: {
      exercise: {
        duration: 5,
        needChanges: {
          restlessness: -6,
          stress: -2,
          fatigue: 3,
          hunger: 1,
        },
      },
    },
  },
} satisfies EntityTemplate;
