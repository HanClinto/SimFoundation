import type { SessionController } from "../../../application/SessionController";
import { travelSession } from "../../../application/Commands";
import { opportunities } from "../../../simulation/catalog/campaign/setup";
import { opportunityBlocker } from "../../../simulation/catalog/campaign/Campaign";
import { departureReadiness } from "../../../simulation/catalog/campaign/Readiness";
import type { Entity } from "../../../simulation/core/entity/Entity";
import type { Transfer } from "../../../simulation/core/site/Transfer";
import { healthStatus } from "../../../simulation/core/entity/pawn/Health";
import { button, element, fieldset, select, table } from "../desktop/dom";

export interface OperationsContext {
  controller: SessionController;
  siteId: string;
  act: (operation: () => void, message?: string) => void;
  report: (message: string) => void;
  locate: (siteId: string, entityId?: string) => void;
  refresh: () => void;
}

export function createTravelView() {
  let destination = "blackwood";
  let lastSite = "";
  const selected = new Set<string>();

  function render(context: OperationsContext): HTMLElement {
    const { controller, siteId, act, locate, refresh } = context;
    const session = controller.session;
    const campaign = session.campaign;
    const root = element("div", "travel-view");
    if (!campaign) {
      root.append(element("p", "", "Travel is available in a campaign."));
      return root;
    }
    const site = session.state.sites[siteId]!;
    const home = siteId === campaign.homeId;
    if (lastSite !== siteId) {
      lastSite = siteId;
      destination = home ? "blackwood" : "home";
      selected.clear();
    }
    const choices = home
      ? Object.entries(opportunities).map(([key, entry]) => ({
          value: key,
          label: `${entry.name}${opportunityBlocker(session.state, campaign, key) ? " [study required]" : ""}`,
        }))
      : [{ value: "home", label: "Home site" }];
    root.append(
      element("h3", "", "Expedition preparation"),
      element(
        "p",
        "",
        `Origin: ${site.name}. Choose one or two staff. Worn gear and carried contents travel with their actual owner; loose cargo competes for hands.`,
      ),
      select("Destination", choices, destination, (value) => {
        destination = value;
        refresh();
      }),
    );
    const key = home
      ? destination
      : Object.keys(campaign.siteIds).find(
          (key) => campaign.siteIds[key] === siteId,
        );
    const route = key ? opportunities[key] : undefined;
    if (route)
      root.append(
        element("p", "briefing", route.briefing),
        element(
          "p",
          "",
          `Reusable transport: ${route.duration} ticks each way, no fare. Other sites continue working. Keep arrival space clear.`,
        ),
      );
    if (route?.fatalAfterTicks)
      root.append(
        element(
          "p",
          "blocked-reason",
          "DANGER: this operation enables permanent casualties. Bring protection, supplies and a recovery plan; observation is not safety.",
        ),
      );
    const crew = fieldset("Team and walking passengers");
    const rows: (string | Node)[][] = [];
    for (const person of Object.values(site.entities)) {
      if (
        person.kind !== "pawn" ||
        (!campaign.staffIds.includes(person.id) &&
          !person.acceptsEscort &&
          !person.requiresRestraint)
      )
        continue;
      const label = element("label", "crew-choice");
      const check = element("input");
      check.type = "checkbox";
      check.checked = selected.has(person.id);
      check.dataset.focusKey = `crew:${person.id}`;
      check.addEventListener("change", () => {
        if (check.checked) selected.add(person.id);
        else selected.delete(person.id);
        refresh();
      });
      label.append(check, element("span", "", person.name));
      const contents = Object.values(site.entities).filter(
        (entry) =>
          entry.location.kind === "carried" &&
          entry.location.carrierId === person.id,
      );
      rows.push([
        label,
        campaign.staffIds.includes(person.id) ? "Staff" : "Passenger",
        person.queue[0]?.blockedReason ??
          person.queue[0]?.action.kind ??
          (person.canAct ? "Idle" : "Cannot act"),
        home ? (departureReadiness(person) ?? "Ready") : "Return needs exempt",
        contents.map((entry) => `${entry.name} (${entry.amount})`).join(", ") ||
          "No carried items",
      ]);
    }
    crew.append(
      table(
        ["Select", "Role", "Work", "Readiness", "Actual equipment / cargo"],
        rows,
      ),
    );
    root.append(crew);
    const ids = [...selected].filter((id) => site.entities[id]);
    const staff = ids.filter((id) => campaign.staffIds.includes(id));
    let prepareReason: string | null = null;
    let departureReason: string | null = null;
    let manifest: Transfer | null = null;
    try {
      travelSession(session, siteId, destination, staff, "prepare");
    } catch (error) {
      prepareReason = error instanceof Error ? error.message : String(error);
    }
    try {
      manifest = controller.previewTravel(siteId, destination, ids);
    } catch (error) {
      departureReason = error instanceof Error ? error.message : String(error);
    }
    const prepare = button("Assemble selected staff", () =>
      act(
        () => controller.travel(siteId, destination, staff, "prepare"),
        "Assembly ordered. Staff walk to loading pads; autonomy is off.",
      ),
    );
    prepare.disabled = prepareReason !== null;
    prepare.title = prepareReason ?? "Queue physical movement to loading pads.";
    const send = button("Depart with this manifest", () =>
      act(
        () => controller.travel(siteId, destination, ids, "depart"),
        "Departed. Same people and cargo are now in transit.",
      ),
    );
    send.disabled = departureReason !== null;
    send.title =
      departureReason ?? "Recheck departure and transfer the actual manifest.";
    const wait = button("Finish selected preparation", () =>
      act(() => context.report(controller.finish(ids))),
    );
    wait.disabled = !ids.length;
    root.append(prepare, wait, send);
    if (prepareReason)
      root.append(element("p", "blocked-reason", `Assembly: ${prepareReason}`));
    if (departureReason)
      root.append(
        element("p", "blocked-reason", `Departure: ${departureReason}`),
      );
    if (manifest)
      root.append(
        fieldset(
          "Prepared manifest - read-only preview",
          manifestTable(Object.values(manifest.entities)),
        ),
      );
    const transit = fieldset("In transit - current physical ownership");
    const transfers = Object.values(session.state.transfers);
    if (!transfers.length)
      transit.append(element("p", "", "No travellers in transit."));
    for (const transfer of transfers) {
      const destinationSite = session.state.sites[transfer.destinationId]!;
      const entry = fieldset(
        `${destinationSite.name} - due tick ${transfer.arrivesAt}`,
      );
      entry.append(
        element(
          "p",
          transfer.blockedReason ? "blocked-reason" : "",
          transfer.blockedReason
            ? `BLOCKED ARRIVAL: ${transfer.blockedReason}`
            : "Travelling; physiology and custody continue.",
        ),
        manifestTable(Object.values(transfer.entities)),
        button("Wait for arrival", () =>
          act(() =>
            context.report(
              controller.finish(
                Object.values(transfer.entities)
                  .filter((entity) => entity.kind === "pawn")
                  .map((entity) => entity.id),
              ),
            ),
          ),
        ),
        button("Inspect destination", () => locate(transfer.destinationId)),
      );
      transit.append(entry);
    }
    root.append(transit);
    root.append(
      button("Open destination map", () =>
        locate(campaign.siteIds[destination]!),
      ),
    );
    return root;
  }
  return { render };
}

function manifestTable(entities: readonly Entity[]): HTMLElement {
  return table(
    [
      "Identity",
      "Kind",
      "Quantity",
      "Condition / ownership",
      "Vitals / equipment",
    ],
    entities.map((entity) => {
      const location = entity.location;
      const owner =
        location.kind === "carried"
          ? `with ${entities.find((entry) => entry.id === location.carrierId)?.name ?? location.carrierId}`
          : "traveller / ground";
      return [
        entity.name,
        entity.kind,
        String(entity.amount),
        `${entity.integrity === undefined ? "" : `Integrity ${entity.integrity.toFixed(1)} | `}${owner}${entity.kind === "item" && entity.equipment?.worn ? " (worn)" : ""}`,
        entity.kind === "pawn"
          ? `${healthStatus(entity)} | blood ${entity.health?.bloodLoss.toFixed(1) ?? "n/a"} | ${Object.entries(
              entity.needs,
            )
              .map(([key, need]) => `${key} ${need.value.toFixed(1)}`)
              .join(", ")}`
          : entity.kind === "item" && entity.equipment
            ? `${entity.equipment.slot}${entity.equipment.subdual ? ` | charges ${entity.equipment.subdual.charges}` : ""}${entity.equipment.medicine ? ` | supplies ${entity.equipment.medicine.supplies}` : ""}`
            : "",
      ];
    }),
  );
}
