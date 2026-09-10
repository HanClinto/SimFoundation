import type { Entity } from "../../../simulation/core/entity/Entity";
import {
  commandButton,
  nameOf,
  orderButton,
  type ViewContext,
} from "./context";
import { button, element, fieldset, table } from "../desktop/dom";
import { entities } from "../../../simulation/catalog";
import { recordedFinding } from "../../../simulation/core/entity/Study";
import {
  serviceDeadline,
  serviceStatus,
} from "../../../simulation/core/entity/Service";
import { secureContainment } from "../../../simulation/core/entity/Containment";
import { processingPorts } from "../../../simulation/core/entity/Processor";
import { entityChoice } from "./choices";

export function apparatusView(
  context: ViewContext,
  target: Entity | undefined,
): HTMLElement[] {
  if (!target) return [];
  const result: HTMLElement[] = [];
  if (target.kind === "item") {
    if (target.impactRecorder) {
      const evidence = fieldset("Physical recorder contents");
      evidence.append(
        element(
          "p",
          "",
          `${target.impactRecorder.records.length} / ${target.impactRecorder.capacity} physical records.`,
        ),
        table(
          ["Tick", "Observer", "Attacker", "Target", "Observed impact"],
          target.impactRecorder.records.map((record) => [
            String(record.tick),
            nameOf(context, record.observerId),
            nameOf(context, record.attackerId),
            nameOf(context, record.targetId),
            `Severity ${record.severity}; damage ${record.damage}${record.armorId ? `; armor ${nameOf(context, record.armorId)}` : ""}`,
          ]),
        ),
      );
      result.push(evidence);
    }
    if (target.crafted) {
      const record = target.crafted;
      result.push(
        fieldset(
          "Manufacturing provenance",
          element(
            "p",
            "",
            `Made by ${nameOf(context, record.actorId)} at tick ${record.tick}; design ${record.recipeId}.`,
          ),
          element(
            "p",
            "",
            `Supporting finding: ${record.research.finding.title}. Inputs: ${record.inputs.map((input) => `${input.amount} from ${nameOf(context, input.sourceId)}`).join(", ")}.`,
          ),
        ),
      );
    }
    return result;
  }
  if (target.kind !== "facility") return result;
  if (target.service) {
    const service = target.service;
    const status = fieldset("Recurring service");
    status.append(
      element(
        "p",
        "",
        `${serviceStatus(service, context.controller.session.state.tick).toUpperCase()} | next deadline ${serviceDeadline(service) ?? "not started"}`,
      ),
      element(
        "p",
        "",
        `Service: ${service.amount} ${entities[service.supplyDefinitionId]?.name ?? service.supplyDefinitionId}, ${service.ticks} work ticks; interval ${service.interval}. Repair: ${service.repair.amount} ${entities[service.repair.supplyDefinitionId]?.name ?? service.repair.supplyDefinitionId}, ${service.repair.ticks} ticks.`,
      ),
      commandButton(context, "Assign selected worker to recurring service", {
        kind: "duty",
        siteId: context.site.id,
        entityId: context.subjectId ?? "",
        targetId: target.id,
      }),
    );
    if (target.containment) {
      status.append(
        element(
          "p",
          "",
          `Holding ${secureContainment(target, context.controller.session.state.tick) ? "SECURE" : "NOT SECURE"}. Lockdown until ${target.containment.lockdown.untilTick ?? "not active"}.`,
        ),
        orderButton(context, "Emergency lockdown", {
          kind: "lockdown",
          targetId: target.id,
          workTicks: 0,
        }),
      );
    }
    result.push(status);
  }
  if (target.crafting) {
    const workshop = fieldset("Engineering - earned designs");
    const available = target.crafting.recipes.filter((recipe) =>
      recordedFinding(context.site, recipe.requiresFinding),
    );
    if (!available.length)
      workshop.append(
        element(
          "p",
          "",
          "No earned designs at this site. Study physical sources or recover recorded observations. Designs appear after their supporting finding.",
        ),
      );
    for (const recipe of available)
      workshop.append(
        element("h4", "", recipe.title),
        element(
          "p",
          "",
          `${recipe.amount} ${entities[recipe.supplyDefinitionId]?.name ?? recipe.supplyDefinitionId}; ${recipe.ticks} work ticks. Output: ${recipe.output.name}.`,
        ),
        orderButton(context, `Craft ${recipe.title}`, {
          kind: "craft",
          targetId: target.id,
          recipeId: recipe.id,
          workTicks: 0,
        }),
      );
    result.push(workshop);
  }
  if (target.dispenser) {
    const machine = fieldset("Approved liquid requests");
    machine.append(
      element(
        "p",
        "",
        `Each request spends one ${entities[target.dispenser.paymentDefinitionId]?.name ?? target.dispenser.paymentDefinitionId}. Clear outputs before another run. Cancellation never refunds payment.`,
      ),
    );
    for (const request of target.dispenser.requests) {
      machine.append(
        orderButton(context, `Dispense ${request.title}`, {
          kind: "dispense",
          targetId: target.id,
          requestId: request.id,
          workTicks: 0,
        }),
      );
    }
    machine.append(
      table(
        ["Tick", "Request", "Operator", "Outcome"],
        target.dispenser.records.map((record) => [
          String(record.tick),
          record.requestId,
          nameOf(context, record.actorId),
          record.result,
        ]),
      ),
    );
    result.push(machine);
  }
  if (target.processor) {
    const machine = fieldset("Physical processing apparatus");
    const ports = processingPorts(target);
    if (ports)
      machine.append(
        element(
          "p",
          "",
          `Intake (${ports.intake.x},${ports.intake.y}); operator (${ports.operator.x},${ports.operator.y}); output (${ports.output.x},${ports.output.y}). Place the unequipped input on intake.`,
        ),
      );
    const current = target.processor.current;
    if (current)
      machine.append(
        element(
          "p",
          "",
          `Running ${current.recipeId}; due tick ${current.completesAt}. Operator may leave; machine owns this cycle.`,
        ),
        element("p", "blocked-reason", current.blockedReason ?? ""),
        button("Wait for processing output", () =>
          context.act(() => {
            const message = context.controller.finish([target.id]);
            context.act(() => {}, message);
          }),
        ),
      );
    const input = entityChoice(
      context,
      "Processing input",
      Object.values(context.site.entities).filter(
        (entity) => entity.kind === "item",
      ),
    );
    machine.append(input.node);
    for (const recipe of target.processor.recipes)
      machine.append(
        element(
          "p",
          "",
          `${recipe.title}: ${entities[recipe.inputDefinitionId]?.name ?? recipe.inputDefinitionId}, ${recipe.ticks} machine ticks after winding.`,
        ),
        orderButton(context, `Process ${recipe.title}`, {
          kind: "process",
          targetId: target.id,
          recipeId: recipe.id,
          inputId: input.id,
          workTicks: 0,
        }),
      );
    result.push(machine);
  }
  return result;
}
