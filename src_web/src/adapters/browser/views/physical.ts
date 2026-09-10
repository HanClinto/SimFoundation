import type { Entity } from "../../../simulation/core/entity/Entity";
import type { ViewContext } from "./context";
import { nameOf, orderButton } from "./context";
import { button, element, fieldset } from "../desktop/dom";
import { entityChoice, quantityChoice } from "./choices";
import { stabilizationCapability } from "../../../simulation/core/entity/Equipment";

export function physicalOrders(
  context: ViewContext,
  target: Entity | undefined,
): HTMLElement[] {
  if (!target || !context.subjectId) return [];
  const subject = context.site.entities[context.subjectId];
  if (subject?.kind !== "pawn") return [];
  const local = Object.values(context.site.entities);
  const result: HTMLElement[] = [];
  const targetId = target.id;
  if (target.kind === "item" && target.stackable) {
    const section = fieldset("Portion supplies");
    const quantity = quantityChoice(context, "Portions to collect");
    section.append(
      quantity.node,
      element(
        "p",
        "",
        `${target.amount} units exist in this stack. Collection creates physical cargo, not a second balance.`,
      ),
      orderButton(
        context,
        "Collect selected portion",
        () => ({
          kind: "take",
          targetId,
          amount: quantity.value,
        }),
        [quantity.node],
      ),
    );
    result.push(section);
  }
  if (target.carryable && target.id !== subject.id) {
    const logistics = fieldset("Delivery & handoff");
    if (context.tile)
      logistics.append(
        orderButton(context, "Deliver target to floor destination", {
          kind: "deliver",
          targetId,
          destination: context.tile,
        }),
      );
    else
      logistics.append(
        element(
          "p",
          "",
          "Choose a floor destination on the map to collect and deliver this object.",
        ),
      );
    const receiver = entityChoice(
      context,
      "Recipient",
      local.filter(
        (entity) =>
          entity.kind === "pawn" &&
          entity.playerControllable &&
          entity.id !== subject.id,
      ),
    );
    logistics.append(
      receiver.node,
      orderButton(context, "Hand over to recipient", {
        kind: "give",
        targetId,
        recipientId: receiver.id,
      }),
    );
    result.push(logistics);
  }
  if (target.kind === "item" && target.requiresCase) {
    const section = fieldset("Protective transport");
    const selectedCase = entityChoice(
      context,
      "Protective case",
      local.filter((entity) => entity.kind === "item" && !!entity.case),
    );
    section.append(
      selectedCase.node,
      orderButton(context, "Pack in selected case", {
        kind: "pack",
        targetId,
        caseId: selectedCase.id,
        workTicks: 0,
      }),
    );
    result.push(section);
  }
  if (target.kind === "item" && target.equipment) {
    const section = fieldset("Equipment upkeep");
    const bench = entityChoice(
      context,
      "Repair bench",
      local.filter(
        (entity) => entity.kind === "facility" && !!entity.equipmentRepair,
      ),
    );
    section.append(
      bench.node,
      orderButton(context, "Repair equipment", {
        kind: "repair-equipment",
        targetId,
        benchId: bench.id,
        workTicks: 0,
      }),
    );
    if (target.equipment.subdual?.rearm || target.equipment.medicine?.rearm)
      section.append(
        orderButton(context, "Rearm / refill equipment", {
          kind: "rearm",
          targetId,
          workTicks: 0,
        }),
      );
    section.append(
      element(
        "p",
        "",
        "Repair and refill use real nearby supplies. Funded work keeps spent inputs even if cancelled.",
      ),
    );
    result.push(section);
  }
  if (target.kind === "pawn") {
    const care = fieldset(`Care & evacuation: ${target.name}`);
    const medicine = stabilizationCapability(context.site, subject);
    care.append(
      element(
        "p",
        "",
        `${subject.name}: ${medicine ? `${medicine.supplies} stabilization charges available` : "no trained stabilization capability"}. Stabilization, blood care and wound recovery are different work.`,
      ),
    );
    if (target.health?.death)
      care.append(
        element(
          "p",
          "blocked-reason",
          "This person is dead. Recovery moves the original body and its possessions; treatment cannot revive them.",
        ),
      );
    const bed = entityChoice(
      context,
      "Clinical bed",
      local.filter((entity) => entity.kind === "facility" && !!entity.care),
    );
    care.append(
      bed.node,
      orderButton(context, "Nurse blood / postoperative care", {
        kind: "nurse",
        targetId,
        bedId: bed.id,
        workTicks: 0,
      }),
      orderButton(context, "Treat wounds at clinical bed", {
        kind: "nurse",
        targetId,
        bedId: bed.id,
        course: "wounds",
        workTicks: 0,
      }),
    );
    if (context.tile)
      care.append(
        orderButton(context, "Escort to floor destination", {
          kind: "escort",
          targetId,
          destination: context.tile,
        }),
      );
    else
      care.append(
        element(
          "p",
          "",
          "Choose a floor destination on the map to escort a cooperative or secured walking person. Carry incapacitated people instead.",
        ),
      );
    if (context.site.id === context.controller.session.campaign?.homeId) {
      const homeBed = entityChoice(
        context,
        "Home admission bed",
        local.filter(
          (entity) => entity.kind === "facility" && !!entity.activities.sleep,
        ),
      );
      care.append(
        homeBed.node,
        button("Admit to home care", () =>
          context.act(
            () => context.controller.admit(targetId, homeBed.id),
            `${target.name} admitted. Ordinary rest queued; injuries are retained.`,
          ),
        ),
      );
    }
    result.push(care);
  }
  if (target.location.kind === "carried")
    result.push(
      element(
        "p",
        "",
        `Current physical owner: ${nameOf(context, target.location.carrierId)}. Inspection never hands this object over.`,
      ),
    );
  return result;
}
