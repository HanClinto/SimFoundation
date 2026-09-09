import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { Steel } from "../../materials/Steel";

export const Washbasin = {
  id: "washbasin",
  name: "Washbasin",
  description:
    "A brief wash reduces hygiene pressure and a little stress. Water and drainage are assumed available; no utility consumption is modeled yet.",
  defaults: {
    kind: "facility",
    carryable: true,
    blocksMovement: true,
    materialId: Steel.id,
    amount: 1,
    activities: {
      wash: { duration: 3, needChanges: { hygiene: -10, stress: -1 } },
    },
  },
} satisfies EntityTemplate;
