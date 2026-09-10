import type { Entity } from "../../../simulation/core/entity/Entity";
import {
  commandButton,
  nameOf,
  orderButton,
  type ViewContext,
} from "./context";
import { element, fieldset } from "../desktop/dom";
import { entityChoice, quantityChoice } from "./choices";
import { directWatchers } from "../../../simulation/core/entity/pawn/Attention";

export function responseOrders(
  context: ViewContext,
  target: Entity | undefined,
): HTMLElement[] {
  const subject = context.site.entities[context.subjectId ?? ""];
  if (!target || subject?.kind !== "pawn") return [];
  const local = Object.values(context.site.entities);
  const base = { siteId: context.site.id, entityId: subject.id };
  const result: HTMLElement[] = [];
  if (target.kind === "pawn" && target.id !== subject.id) {
    const response = fieldset("Response & custody");
    response.append(
      orderButton(context, "Subdue with equipped tool", {
        kind: "subdue",
        targetId: target.id,
        workTicks: 0,
      }),
    );
    const force = element("details");
    force.dataset.detailKey = `force:${target.id}`;
    force.append(element("summary", "", "Dangerous force / withdrawal"));
    force.append(
      element(
        "p",
        "",
        "Attack can cause permanent injury or death. Subdual and live capture are different actions.",
      ),
      orderButton(context, "Attack target", {
        kind: "attack",
        targetId: target.id,
        workTicks: 0,
      }),
      orderButton(context, "Flee from target", {
        kind: "flee",
        targetId: target.id,
      }),
    );
    response.append(force);
    if (target.requiresRestraint) {
      const band = entityChoice(
        context,
        "Restraint",
        local.filter((entity) => entity.kind === "item" && !!entity.restraint),
      );
      response.append(
        band.node,
        orderButton(context, "Fit / exchange restraint", {
          kind: "restrain",
          targetId: target.id,
          restraintId: band.id,
          workTicks: 0,
        }),
        orderButton(context, "Remove restraint", {
          kind: "unrestrain",
          targetId: target.id,
        }),
      );
      if (context.tile)
        response.append(
          orderButton(context, "Capture to floor destination", {
            kind: "capture",
            targetId: target.id,
            restraintId: band.id,
            destination: context.tile,
            workTicks: 0,
          }),
        );
      else
        response.append(
          element(
            "p",
            "",
            "For a combined subdue / restrain / carry recovery, choose its floor destination on the map.",
          ),
        );
      const cell = entityChoice(
        context,
        "Holding cell",
        local.filter(
          (entity) => entity.kind === "facility" && !!entity.containment,
        ),
      );
      response.append(
        cell.node,
        orderButton(context, "Intake into holding", {
          kind: "contain",
          targetId: target.id,
          cellId: cell.id,
          workTicks: 0,
        }),
      );
    }
    result.push(response);
    const recorder = entityChoice(
      context,
      "Recorder",
      local.filter(
        (entity) => entity.kind === "item" && !!entity.impactRecorder,
      ),
    );
    if (recorder.id)
      result.push(
        fieldset(
          "Physical impact observation",
          recorder.node,
          element(
            "p",
            "",
            "The operator must actually watch with a physical recording device. Its evidence persists through injury, death and recovery.",
          ),
          orderButton(context, "Observe actual impacts", {
            kind: "observe",
            targetId: target.id,
            recorderId: recorder.id,
            workTicks: 0,
          }),
        ),
      );
    if (target.stillWhenWatched) {
      const watch = fieldset("Direct watch - not camera visibility");
      const duration = quantityChoice(context, "Watch ticks", 200);
      const observers = directWatchers(context.site, target.id);
      watch.append(
        element(
          "p",
          "",
          `Currently watching: ${observers.map((entity) => entity.name).join(", ") || "NONE"}. Maintain real overlap before relief.`,
        ),
        duration.node,
        orderButton(
          context,
          "Watch subject",
          () => ({
            kind: "watch",
            targetId: target.id,
            ticks: duration.value,
            workTicks: 0,
          }),
          [duration.node],
        ),
      );
      if (context.tile)
        watch.append(
          commandButton(context, "Assign recurring watch at floor post", {
            ...base,
            kind: "watch-duty",
            duty: { targetId: target.id, post: context.tile },
          }),
        );
      else
        watch.append(
          element(
            "p",
            "",
            "Choose a floor post to assign recurring watch; need-driven rest can leave a coverage gap.",
          ),
        );
      result.push(watch);
    }
  }
  if (subject.watchDuty || subject.queue[0]?.action.kind === "watch") {
    const relief = fieldset(`Relief for selected worker: ${subject.name}`);
    const replacement = entityChoice(
      context,
      "Replacement observer",
      local.filter(
        (entity) =>
          entity.kind === "pawn" &&
          entity.playerControllable &&
          entity.id !== subject.id,
      ),
    );
    relief.append(
      replacement.node,
      commandButton(context, "Relieve selected worker", {
        ...base,
        kind: "relieve",
        replacementId: replacement.id,
      }),
    );
    if (subject.watchDuty)
      relief.append(
        commandButton(context, "Clear selected watch assignment", {
          ...base,
          kind: "watch-duty",
          duty: null,
        }),
      );
    result.push(relief);
  }
  if (subject.serviceDuty)
    result.push(
      fieldset(
        `Recurring duty: ${nameOf(context, subject.serviceDuty)}`,
        commandButton(context, "Clear selected service assignment", {
          ...base,
          kind: "duty",
          targetId: null,
        }),
      ),
    );
  return result;
}
