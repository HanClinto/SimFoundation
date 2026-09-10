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
  action: ActionState,
): HTMLElement {
  const row = element("div", "order-option");
  const command = {
    kind: "enqueue" as const,
    siteId: context.site.id,
    entityId: context.subjectId ?? "",
    action,
  };
  const preview = context.controller.preview(command);
  const node = button(
    label,
    () =>
      context.act(
        () => context.controller.dispatch(command),
        `Queued: ${label}.`,
      ),
    `${label}:${JSON.stringify(action)}`,
  );
  node.disabled = preview.code === "rejected";
  node.title =
    preview.reason ??
    "Append to this worker's queue; rechecked when work starts.";
  row.append(node);
  if (preview.reason)
    row.append(element("small", "blocked-reason", preview.reason));
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
  if (entity.integrity !== undefined)
    result.append(
      element("p", "", `Integrity: ${entity.integrity.toFixed(1)}`),
    );
  if (entity.kind === "pawn") {
    result.append(element("p", "", healthStatus(entity)));
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
        "Choose a worker to issue orders. Inspecting objects never changes the command recipient.",
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
  if (context.tile) {
    result.append(
      orderButton(context, "Move here", {
        kind: "move",
        destination: context.tile,
      }),
    );
    for (const cargo of carriedCargo(context.site.entities, subject.id))
      result.append(
        orderButton(context, `Deliver ${cargo.name} here`, {
          kind: "deliver",
          targetId: cargo.id,
          destination: context.tile,
        }),
      );
  }
  if (!target) return result;
  const targetId = target.id;
  if (target.carryable)
    result.append(
      orderButton(context, "Take / recover", { kind: "take", targetId }),
    );
  if (target.location.kind === "carried")
    result.append(orderButton(context, "Put down", { kind: "drop", targetId }));
  if (target.nutrition)
    result.append(orderButton(context, "Eat", { kind: "eat", targetId }));
  if (target.kind === "item" && target.equipment)
    result.append(
      orderButton(
        context,
        target.equipment.worn ? "Remove equipment" : "Fit equipment",
        { kind: target.equipment.worn ? "unequip" : "equip", targetId },
      ),
    );
  if (target.kind === "item" && target.case)
    result.append(
      orderButton(context, "Unpack case", {
        kind: "unpack",
        targetId,
        workTicks: 0,
      }),
    );
  if (target.kind === "door") {
    for (const policy of ["automatic", "held-open", "held-closed"] as const)
      result.append(
        orderButton(context, `Door: ${policy}`, {
          kind: "door",
          targetId,
          policy,
          workTicks: 0,
        }),
      );
  }
  if (target.kind === "facility") {
    for (const kind of Object.keys(target.activities) as ActivityKind[])
      result.append(
        orderButton(context, kind, { kind, targetId, workTicks: 0 }),
      );
    if (target.service)
      result.append(
        orderButton(context, "Repair / service", {
          kind: "service",
          targetId,
          workTicks: 0,
        }),
      );
    for (const plan of target.study?.plans ?? []) {
      result.append(
        element(
          "p",
          "",
          `Study: ${plan.title} | ${plan.ticks} work ticks | physical sources: ${plan.requires.join(", ")}`,
        ),
      );
      result.append(
        orderButton(context, `Study ${plan.title}`, {
          kind: "study",
          targetId,
          planId: plan.id,
          workTicks: 0,
        }),
      );
    }
  }
  if (target.kind === "pawn" && target.id !== subject.id)
    result.append(
      orderButton(context, "Stabilize bleeding", {
        kind: "treat",
        targetId,
        workTicks: 0,
      }),
    );
  return result;
}
