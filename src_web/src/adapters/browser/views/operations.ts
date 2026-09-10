import {
  serviceDeadline,
  serviceStatus,
} from "../../../simulation/core/entity/Service";
import { button, element, replaceContents, table } from "../desktop/dom";
import { createTravelView, type OperationsContext } from "./travel";
import { researchView } from "./research";
import { attentionView } from "./attention";

export function createOperationsView(
  body: HTMLElement,
  context: () => OperationsContext,
) {
  let tab: "travel" | "work" | "history" | "research" | "response" = "work";
  const travel = createTravelView();
  const tabs = element("div", "panel-tabs");
  const content = element("div");
  for (const [key, title] of [
    ["travel", "Travel"],
    ["work", "Work & duties"],
    ["response", "Response desk"],
    ["research", "Research records"],
    ["history", "Alarm history"],
  ] as const) {
    const node = button(title, () => {
      tab = key;
      render();
    });
    node.dataset.tab = key;
    tabs.append(node);
  }
  body.append(tabs, content);

  function render(): void {
    const current = context();
    for (const node of tabs.querySelectorAll("button"))
      node.setAttribute("aria-pressed", String(node.dataset.tab === tab));
    if (tab === "travel") {
      replaceContents(content, travel.render(current));
      return;
    }
    if (tab === "research") {
      replaceContents(content, researchView(current));
      return;
    }
    if (tab === "response") {
      replaceContents(content, attentionView(current));
      return;
    }
    const session = current.controller.session;
    if (tab === "history") {
      const rows = [...session.events]
        .reverse()
        .map((event) => [
          String(event.tick ?? "?"),
          event.kind,
          button(
            session.state.sites[event.siteId]?.name ?? event.siteId,
            () =>
              current.locate(event.siteId, event.targetId ?? event.entityId),
            `event:${event.tick}:${event.entityId}:${event.kind}`,
          ),
          event.reason ?? `${event.actionKind ?? ""} ${event.entityId}`,
        ]);
      replaceContents(
        content,
        element("h3", "", "History - most recent 100 events"),
        table(["Tick", "Event", "Locate", "Detail"], rows),
      );
      return;
    }
    const rows: (string | Node)[][] = [];
    for (const site of Object.values(session.state.sites)) {
      for (const entity of Object.values(site.entities)) {
        if (
          entity.kind === "pawn" &&
          (entity.playerControllable || entity.queue.length)
        )
          rows.push([
            button(
              entity.name,
              () => current.locate(site.id, entity.id),
              `locate:${entity.id}`,
            ),
            site.name,
            entity.queue[0]?.action.kind ??
              (entity.health?.death ? "DEAD" : "Idle"),
            entity.queue[0]?.blockedReason ??
              (entity.watchDuty
                ? `Assigned watch: ${site.entities[entity.watchDuty.targetId]?.name ?? entity.watchDuty.targetId}`
                : entity.serviceDuty
                  ? `Service duty: ${site.entities[entity.serviceDuty]?.name ?? entity.serviceDuty}`
                  : ""),
          ]);
        if (
          entity.kind === "facility" &&
          entity.service &&
          serviceDeadline(entity.service) !== null
        )
          rows.push([
            button(
              entity.name,
              () => current.locate(site.id, entity.id),
              `locate:${entity.id}`,
            ),
            site.name,
            serviceStatus(entity.service, session.state.tick),
            `Due ${serviceDeadline(entity.service)}`,
          ]);
        if (entity.kind === "facility" && entity.processor?.current)
          rows.push([
            button(
              entity.name,
              () => current.locate(site.id, entity.id),
              `process:${entity.id}`,
            ),
            site.name,
            `Processing ${entity.processor.current.recipeId}`,
            entity.processor.current.blockedReason ??
              `Output due tick ${entity.processor.current.completesAt}; operator is free`,
          ]);
      }
    }
    replaceContents(
      content,
      element("h3", "", "Current commitments"),
      table(
        ["Person / apparatus", "Site", "Work / coverage", "Details / blocker"],
        rows,
      ),
    );
  }
  return {
    render,
    showTravel: () => {
      tab = "travel";
      render();
    },
    showResponse: () => {
      tab = "response";
      render();
    },
  };
}
