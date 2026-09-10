import type { EntityTemplate } from "../../../core/entity/EntityTemplate";
import { FieldAgent } from "../staff/FieldAgent";

export const scp507Attribution = {
  author: "PennywiseTheClown",
  source: "https://scp-wiki.wikidot.com/scp-507",
  license: "CC BY-SA 3.0",
  adaptation:
    "A bounded cooperative retrieval immediately after an ordinary-world return. Personal flashlight and accompanied movement adapt the source. Local signal log, provisional home intake and two-person transport are original gameplay abstractions. No alternate reality, involuntary shift, fourteen-day timing or dangerous physical contact is simulated.",
};

export const SCP507: EntityTemplate = {
  id: "scp-507",
  name: "Tommy",
  description:
    "SCP-507, a cooperative returnee awaiting accompanied transport. Tommy is one of his source-listed nicknames. He keeps his personal flashlight and accepts escort, not arbitrary direct control. His reported journeys remain unverified; the local signal log only documents this ordinary-world return. This slice does not simulate another shift.",
  attribution: scp507Attribution,
  defaults: {
    ...FieldAgent.defaults,
    playerControllable: false,
    acceptsEscort: true,
    autonomy: false,
    needs: {
      ...FieldAgent.defaults.needs,
      fatigue: { value: 60, increasePerTick: 0.1 },
    },
  },
};
