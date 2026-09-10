import type { SessionController } from "../../../application/SessionController";
import type { Entity, Position } from "../../../simulation/core/entity/Entity";
import type {
  ActionState,
  ActivityKind,
} from "../../../simulation/core/entity/pawn/actions/Action";
import type { Site } from "../../../simulation/core/site/Site";
import { button, element, fieldset, table } from "../desktop/dom";
import { healthStatus } from "../../../simulation/core/entity/pawn/Health";
import { carriedCargo } from "../../../simulation/core/entity/Equipment";
import { entityArt } from "../map/art";
import workIcon from "../../browser_shared/assets/work-orders.svg";
import { entities } from "../../../simulation/catalog";
import type { Command } from "../../../simulation/core/ControlPolicy";
import { workProgress } from "./progress";
import { quantityChoice } from "./choices";

export interface ViewContext {
  controller: SessionController;
  site: Site;
  subjectId: string | null;
  targetId: string | null;
  tile: Position | null;
  act: (operation: () => void, message?: string) => void;
  inspect: (id: string) => void;
  control: (id: string | null) => void;
}

export function nameOf(context: ViewContext, id: string): string {
  const state = context.controller.session.state;
  return (
    [...Object.values(state.sites), ...Object.values(state.transfers)]
      .map((owner) => owner.entities[id])
      .find(Boolean)?.name ?? id
  );
}

export function orderButton(
  context: ViewContext,
  label: string,
  action: ActionState | (() => ActionState),
  inputs: readonly HTMLElement[] = [],
): HTMLElement {
  const command = () => ({
    kind: "enqueue" as const,
    siteId: context.site.id,
    entityId: context.subjectId ?? "",
    action: typeof action === "function" ? action() : action,
  });
  return commandButton(context, label, command, `Queued: ${label}.`, inputs);
}

export function commandButton(
  context: ViewContext,
  label: string,
  command: Command | (() => Command),
  notice = label,
  inputs: readonly HTMLElement[] = [],
): HTMLElement {
  const row = element("div", "order-option");
  const current = () => (typeof command === "function" ? command() : command);
  const identity = current();
  const node = button(
    label,
    () => context.act(() => context.controller.dispatch(current()), notice),
    `${label}:${identity.siteId}:${identity.entityId}`,
  );
  const reason = element("small", "blocked-reason");
  const update = (target = node, detail = reason) => {
    const preview = context.controller.preview(current());
    target.disabled = preview.code === "rejected";
    target.title =
      preview.reason ?? "Rechecked when issued and when work starts.";
    detail.textContent = preview.reason ?? "";
    detail.hidden = !preview.reason;
  };
  row.append(node, reason);
  for (const input of inputs)
    input.oninput = (event) => {
      if (!(event.currentTarget instanceof HTMLElement)) return;
      const parent = event.currentTarget.closest("fieldset");
      const target = [
        ...(parent?.querySelectorAll<HTMLButtonElement>("button") ?? []),
      ].find(
        (candidate) => candidate.dataset.focusKey === node.dataset.focusKey,
      );
      const detail =
        target?.parentElement?.querySelector<HTMLElement>(".blocked-reason");
      if (target && detail) update(target, detail);
    };
  update();
  return row;
}

export function actionLabel(context: ViewContext, action: ActionState): string {
  const target =
    "targetId" in action ? `: ${nameOf(context, action.targetId)}` : "";
  const destination =
    "destination" in action
      ? ` to (${action.destination.x}, ${action.destination.y})`
      : "";
  const plan =
    "planId" in action
      ? ` / ${action.planId}`
      : "recipeId" in action
        ? ` / ${action.recipeId}`
        : "";
  return `${action.kind}${target}${destination}${plan}`;
}

export function queueView(context: ViewContext, entity: Entity): HTMLElement {
  const result = fieldset(
    `Action queue: ${entity.name} - current first, then pending`,
  );
  if (entity.kind !== "pawn") return result;
  if (!entity.queue.length) result.append(element("p", "", "No queued work."));
  const tray = element("div", "action-tray");
  for (const [index, entry] of entity.queue.entries()) {
    const row = element(
      "div",
      `queue-entry ${entry.blockedReason ? "blocked" : ""}`,
    );
    row.classList.toggle("current", index === 0);
    const target =
      "targetId" in entry.action
        ? context.site.entities[entry.action.targetId]
        : undefined;
    const image = element("img");
    image.src = target ? (entityArt(target) ?? workIcon) : workIcon;
    image.alt = "";
    row.append(
      image,
      element(
        "strong",
        "",
        `${index + 1}. ${actionLabel(context, entry.action)}`,
      ),
      element(
        "small",
        "",
        `${entry.source} | ${entry.elapsed} ticks elapsed${"workTicks" in entry.action ? ` | ${entry.action.workTicks} work ticks` : ""}`,
      ),
    );
    if (index === 0) {
      const progress = workProgress(context.site, entry.action);
      if (progress) row.append(progress);
    }
    if (entry.blockedReason)
      row.append(
        element("p", "blocked-reason", `BLOCKED: ${entry.blockedReason}`),
      );
    if (entity.playerControllable)
      row.append(
        button(
          "Cancel",
          () =>
            context.act(
              () =>
                context.controller.dispatch({
                  kind: "cancel",
                  siteId: context.site.id,
                  entityId: entity.id,
                  actionId: entry.id,
                }),
              "Action cancelled. Spent supplies and physical cargo are retained.",
            ),
          `cancel:${entry.id}`,
        ),
      );
    tray.append(row);
  }
  result.append(tray);
  if (entity.queue.length)
    result.append(
      button("Finish current commitments", () =>
        context.act(() => {
          const message = context.controller.finish([entity.id]);
          context.act(() => {}, message);
        }),
      ),
    );
  return result;
}

export function entityFacts(context: ViewContext, entity: Entity): HTMLElement {
  const result = fieldset(entity.name);
  const location =
    entity.location.kind === "ground"
      ? `At (${entity.location.position.x}, ${entity.location.position.y})`
      : `Carried / held by ${nameOf(context, entity.location.carrierId)}`;
  result.append(element("p", "", `${entity.kind} | ${location}`));
  const definition = entities[entity.definitionId];
  if (definition) {
    result.append(element("p", "entity-description", definition.description));
    if (definition.attribution) {
      const attribution = element("details");
      attribution.append(element("summary", "", "Source and adaptation"));
      const link = element(
        "a",
        "",
        `Source by ${definition.attribution.author}`,
      );
      link.href = definition.attribution.source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      attribution.append(
        link,
        element("p", "", definition.attribution.license),
        element("p", "", definition.attribution.adaptation),
      );
      result.append(attribution);
    }
  }
  if (entity.integrity !== undefined)
    result.append(
      element("p", "", `Integrity: ${entity.integrity.toFixed(1)}`),
    );
  if (entity.kind === "door")
    result.append(
      element(
        "p",
        "",
        `Door: ${entity.open ? "OPEN" : "CLOSED"} | ${entity.policy}. Automatic doors remain open while ground occupants are nearby.`,
      ),
    );
  if (entity.kind === "pawn") {
    result.append(element("p", "", healthStatus(entity)));
    if (entity.queue[0])
      result.append(
        element(
          "p",
          "",
          `Current work: ${actionLabel(context, entity.queue[0].action)}${entity.queue[0].blockedReason ? ` | BLOCKED: ${entity.queue[0].blockedReason}` : ""}`,
        ),
      );
    result.append(
      table(
        ["Need (lower is better)", "Current"],
        Object.entries(entity.needs).map(([id, need]) => [
          id,
          `${need.value.toFixed(1)} / 100`,
        ]),
      ),
    );
    if (entity.health) {
      result.append(
        element(
          "p",
          "",
          `Blood loss ${entity.health.bloodLoss.toFixed(1)} | Wounds ${entity.health.wounds.reduce((sum, wound) => sum + wound.severity, 0).toFixed(1)} | Bleeding ${entity.health.wounds.reduce((sum, wound) => sum + wound.bleeding, 0).toFixed(2)}/tick`,
        ),
      );
      if (entity.health.postoperative)
        result.append(
          element(
            "p",
            "blocked-reason",
            `Postoperative care required: ${entity.health.postoperative.organ}`,
          ),
        );
      for (const [organ, state] of Object.entries(entity.health.organs ?? {}))
        result.append(
          element(
            "p",
            "",
            `${organ} trauma: ${state.trauma}${state.replacement ? ` | replacement at tick ${state.replacement.tick}` : ""}`,
          ),
        );
    }
    if (entity.playerControllable) {
      result.append(
        button(
          context.subjectId === entity.id
            ? "Deselect worker"
            : "Control this worker",
          () =>
            context.control(context.subjectId === entity.id ? null : entity.id),
        ),
      );
      result.append(
        button(`Autonomy: ${entity.autonomy ? "ON" : "OFF"}`, () =>
          context.act(
            () =>
              context.controller.dispatch({
                kind: "autonomy",
                siteId: context.site.id,
                entityId: entity.id,
                enabled: !entity.autonomy,
              }),
            "Autonomy updated. Existing work remains queued.",
          ),
        ),
      );
    }
  }
  if (entity.kind === "item") {
    result.append(
      element(
        "p",
        "",
        `Quantity: ${entity.amount} | Material: ${entity.materialId}`,
      ),
    );
    if (entity.equipment)
      result.append(
        element(
          "p",
          "",
          `${entity.equipment.slot} ${entity.equipment.worn ? "(worn)" : "(loose)"}${entity.equipment.subdual ? ` | ${entity.equipment.subdual.charges} subdual charges` : ""}${entity.equipment.medicine ? ` | ${entity.equipment.medicine.supplies} medical supplies` : ""}`,
        ),
      );
    if (entity.case)
      result.append(
        element("p", "", `Case: ${entity.case.sealed ? "sealed" : "open"}`),
      );
    if (entity.restraint)
      result.append(
        element(
          "p",
          "",
          `Restraint: ${entity.restraint.attached ? "attached" : "loose"} | wear ${entity.restraint.wearPerTick}/tick`,
        ),
      );
  }
  if (entity.kind === "facility" && entity.study?.findings.length) {
    const findings = element("details");
    findings.open = true;
    findings.append(element("summary", "", "Earned findings"));
    for (const finding of entity.study.findings) {
      findings.append(
        element("strong", "", `${finding.title} - tick ${finding.tick}`),
        element("p", "", finding.text),
        element(
          "small",
          "",
          `Investigator: ${nameOf(context, finding.actorId)}. Sources: ${finding.sourceIds.map((id) => nameOf(context, id)).join(", ")}`,
        ),
      );
    }
    result.append(findings);
  }
  const contents = Object.values(context.site.entities).filter(
    (item) =>
      item.location.kind === "carried" && item.location.carrierId === entity.id,
  );
  if (contents.length) {
    result.append(element("h4", "", "Physical contents / equipment"));
    for (const item of contents)
      result.append(
        button(
          `${item.name} (${item.amount})`,
          () => context.inspect(item.id),
          `contents:${item.id}`,
        ),
      );
  }
  return result;
}

export interface ActionChoice {
  label: string;
  action: ActionState;
  group?: string;
}

export function basicActionChoices(
  context: ViewContext,
  target: Entity | undefined,
): ActionChoice[] {
  const result: ActionChoice[] = [];
  const subject = context.site.entities[context.subjectId ?? ""];
  if (subject?.kind !== "pawn") return result;
  if (context.tile) {
    result.push({
      label: "Move here",
      action: { kind: "move", destination: context.tile },
    });
    for (const cargo of carriedCargo(context.site.entities, subject.id))
      result.push({
        label: `Deliver ${cargo.name} here`,
        action: {
          kind: "deliver",
          targetId: cargo.id,
          destination: context.tile,
        },
      });
  }
  if (!target) return result;
  const targetId = target.id;
  if (target.carryable && target.id !== subject.id)
    result.push({
      label: "Take / recover",
      action: { kind: "take", targetId },
    });
  if (target.location.kind === "carried")
    result.push({ label: "Put down", action: { kind: "drop", targetId } });
  if (target.nutrition)
    result.push({ label: "Eat", action: { kind: "eat", targetId } });
  if (target.kind === "item" && target.equipment)
    result.push(
      { label: "Fit equipment", action: { kind: "equip", targetId } },
      { label: "Remove equipment", action: { kind: "unequip", targetId } },
    );
  if (target.kind === "item" && target.case)
    result.push({
      label: "Unpack case",
      action: { kind: "unpack", targetId, workTicks: 0 },
    });
  if (target.kind === "door") {
    for (const policy of ["automatic", "held-open", "held-closed"] as const)
      result.push({
        label: `Door: ${policy}`,
        group: "Door policy",
        action: { kind: "door", targetId, policy, workTicks: 0 },
      });
  }
  if (target.kind === "facility") {
    for (const kind of Object.keys(target.activities) as ActivityKind[])
      result.push({ label: kind, action: { kind, targetId, workTicks: 0 } });
    if (target.service)
      result.push({
        label: "Repair / service",
        action: { kind: "service", targetId, workTicks: 0 },
      });
    for (const plan of target.study?.plans ?? []) {
      result.push({
        label: `Study ${plan.title}`,
        group: "Study",
        action: {
          kind: "study",
          targetId,
          planId: plan.id,
          workTicks: 0,
        },
      });
    }
  }
  if (target.kind === "pawn" && target.id !== subject.id)
    result.push({
      label: "Stabilize bleeding",
      action: { kind: "treat", targetId, workTicks: 0 },
    });
  return result;
}

export function basicOrders(
  context: ViewContext,
  target: Entity | undefined,
): HTMLElement {
  const result = fieldset("Orders for selected worker");
  const subject = context.site.entities[context.subjectId ?? ""];
  if (subject?.kind !== "pawn") {
    result.append(
      element(
        "p",
        "",
        "Choose a worker to issue orders. Inspection never changes the command recipient.",
      ),
    );
    return result;
  }
  result.append(
    element(
      "p",
      "",
      `Subject: ${subject.name}. Commands append; cancelled work does not refund supplies.`,
    ),
  );
  for (const choice of basicActionChoices(context, target)) {
    if (choice.action.kind === "study" && target?.kind === "facility") {
      const planId = choice.action.planId;
      const plan = target.study?.plans.find((entry) => entry.id === planId);
      if (plan)
        result.append(
          element(
            "p",
            "",
            `Study: ${plan.title} | ${plan.ticks} work ticks | physical sources: ${plan.requires.map((id) => entities[id]?.name ?? id).join(", ")}`,
          ),
        );
    }
    result.append(orderButton(context, choice.label, choice.action));
  }
  if (target?.id === subject.id) {
    const duration = quantityChoice(context, "Wait ticks", 10);
    result.append(
      fieldset(
        "Deliberate wait",
        duration.node,
        orderButton(
          context,
          "Wait in place",
          () => ({ kind: "wait", ticks: duration.value }),
          [duration.node],
        ),
      ),
    );
  }
  return result;
}
