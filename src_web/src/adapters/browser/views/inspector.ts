import { button, element, replaceContents } from "../desktop/dom";
import { basicOrders, entityFacts, type ViewContext } from "./context";
import { physicalOrders } from "./physical";
import { responseOrders } from "./response";
import { apparatusView } from "./apparatus";
import { healthStatus } from "../../../simulation/core/entity/pawn/Health";

type InspectorTab =
  | "record"
  | "orders"
  | "physical"
  | "response"
  | "apparatus"
  | "all";

export function createInspector(refresh: () => void) {
  const root = element("div", "inspection-pane");
  let tab: InspectorTab = "orders";
  let lastTarget: string | null = null;
  let lastDestination = "";

  function render(context: ViewContext): void {
    const target = context.site.entities[context.targetId ?? ""];
    const subject = context.site.entities[context.subjectId ?? ""];
    if (context.targetId !== lastTarget) {
      lastTarget = context.targetId;
      if (tab !== "all")
        tab = target?.id === subject?.id && target ? "record" : "orders";
      root.scrollTop = 0;
    }
    const destination = context.tile
      ? `${context.tile.x},${context.tile.y}`
      : "";
    if (destination !== lastDestination) {
      lastDestination = destination;
      if (destination && tab !== "all") tab = "orders";
    }
    const record = target
      ? [entityFacts(context, target)]
      : [
          element(
            "p",
            "",
            "Inspect a person or object on the map or in the entity list.",
          ),
        ];
    const orders = [basicOrders(context, target)];
    const physical = physicalOrders(context, target);
    const response = responseOrders(context, target);
    const apparatus = apparatusView(context, target);
    const definitions: {
      id: InspectorTab;
      label: string;
      nodes: HTMLElement[];
    }[] = [
      { id: "record", label: "Record", nodes: record },
      { id: "orders", label: "Orders", nodes: orders },
      {
        id: "physical",
        label: target?.kind === "pawn" ? "Care & cargo" : "Cargo & gear",
        nodes: physical,
      },
      { id: "response", label: "Response", nodes: response },
      { id: "apparatus", label: "Apparatus", nodes: apparatus },
      {
        id: "all",
        label: "All details",
        nodes: [...record, ...orders, ...physical, ...response, ...apparatus],
      },
    ];
    const groups = definitions.filter((group) => group.nodes.length > 0);
    if (!groups.some((group) => group.id === tab)) tab = "orders";
    const header = element("div", "inspector-heading");
    header.append(
      element("strong", "", target?.name ?? "Floor / site inspection"),
    );
    if (target?.kind === "pawn")
      header.append(element("small", "", healthStatus(target)));
    const recipient = element("div", "inspector-recipient");
    recipient.append(
      element(
        "span",
        "",
        subject
          ? `Orders for: ${subject.name}`
          : context.subjectId
            ? "Worker is elsewhere / in transit"
            : "No command recipient",
      ),
    );
    if (context.subjectId)
      recipient.append(button("Deselect", () => context.control(null)));
    header.append(recipient);
    if (context.tile)
      header.append(
        element(
          "small",
          "destination-notice",
          `Floor destination: (${context.tile.x}, ${context.tile.y})`,
        ),
      );
    const tabs = element("div", "inspector-tabs");
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Inspector sections");
    for (const group of groups) {
      const node = button(
        group.label,
        () => {
          tab = group.id;
          root.scrollTop = 0;
          refresh();
        },
        `inspector-tab:${group.id}`,
      );
      node.setAttribute("role", "tab");
      node.setAttribute("aria-selected", String(tab === group.id));
      node.tabIndex = tab === group.id ? 0 : -1;
      node.onkeydown = (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        if (!(event.currentTarget instanceof HTMLButtonElement)) return;
        event.preventDefault();
        const choices = [
          ...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          ),
        ];
        const index = choices.indexOf(event.currentTarget);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? choices.length - 1
              : (index +
                  (event.key === "ArrowRight" ? 1 : -1) +
                  choices.length) %
                choices.length;
        choices[next]!.click();
        choices[next]!.focus();
      };
      tabs.append(node);
    }
    header.append(tabs);
    const body = element("div", "inspector-content");
    body.setAttribute("role", "tabpanel");
    body.setAttribute(
      "aria-label",
      groups.find((group) => group.id === tab)!.label,
    );
    body.append(...groups.find((group) => group.id === tab)!.nodes);
    replaceContents(root, header, body);
  }
  return {
    root,
    render,
    reset: () => {
      tab = "orders";
      lastTarget = null;
      lastDestination = "";
    },
  };
}
