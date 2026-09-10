import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import type { SiteTemplate } from "../../../core/site/Site";
import { scp507Attribution } from "../../actors/anomalies/SCP507";

export const ReturneeFlashlight: EntityTemplate = {
  id: "returnee-flashlight",
  name: "Tommy's personal flashlight",
  description:
    "A retained personal object accompanying SCP-507. Its ownership survives escort and transport; lighting, batteries and darkness encounters are not modeled in this slice.",
  attribution: scp507Attribution,
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const ReturneeLog: EntityTemplate = {
  id: "returnee-log",
  name: "Fragile local signal log",
  description:
    "An original physical recorder recovered beside this ordinary-world arrival. A cracked sleeve requires a protective case for transport. It documents a local signal and an unverified account, not evidence that another reality has been surveyed.",
  attribution: scp507Attribution,
  defaults: {
    kind: "item",
    materialId: "plastic",
    amount: 1,
    integrity: 100,
    carryable: true,
    requiresCase: true,
    blocksMovement: false,
    blocksSight: false,
  },
};

export const ReturneeReviewStation: EntityTemplate = {
  id: "returnee-review-station",
  name: "Returnee intake review station",
  description:
    "Perform a non-destructive intake review with the actual returnee and exposed local log nearby. Keep ordinary-world observations separate from unverified reports.",
  attribution: scp507Attribution,
  defaults: {
    kind: "facility",
    materialId: "steel",
    amount: 1,
    integrity: 100,
    carryable: false,
    blocksMovement: true,
    blocksSight: false,
    activities: {},
    study: {
      plans: [
        {
          id: "returnee-review",
          title: "SCP-507: ordinary-world return reviewed",
          ticks: 8,
          requires: ["scp-507", "returnee-log"],
          finding:
            "The returnee and recovered local log are present for physical review. The log supports an ordinary-world arrival at the retained pickup site. It does not verify the reported alternate-world journey. Preserve the record and provide ordinary guest-bed rest. Further arranged movement can use cooperative escort; continuous supervision and new shifts are not simulated.",
        },
      ],
      findings: [],
    },
  },
};

export const returneeSite: SiteTemplate = {
  name: "SCP-507: ordinary-world pickup",
  terrain: [
    "############",
    "#..........#",
    "#..........#",
    "#....#.....#",
    "#..........#",
    "#..........#",
    "############",
  ],
  entities: [
    {
      id: "tommy",
      definitionId: "scp-507",
      location: { kind: "ground", position: { x: 8, y: 3 } },
    },
    {
      id: "flashlight",
      definitionId: ReturneeFlashlight.id,
      location: { kind: "carried", carrierId: "tommy" },
    },
    {
      id: "log",
      definitionId: ReturneeLog.id,
      location: { kind: "ground", position: { x: 9, y: 4 } },
    },
  ],
};
