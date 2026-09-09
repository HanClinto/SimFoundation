import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  engagementIssue,
  readyResponder,
  RESPONSE_RANGE,
  ENCOUNTER_RADIUS,
  type TacticalCode,
} from "../../simulation/combat";
import type { PlacementRequest } from "./placement";
import type { TilePosition } from "../../simulation/world";
import type { MapPerspective } from "./map-settings";
import { expeditionMember } from "../../simulation/expeditions";

const messages: Record<TacticalCode, string> = {
  accepted: "Order accepted.",
  "not-found": "Responder not found.",
  busy: "Finish cargo delivery or clinical work first. Active teams and unstable casualties cannot be released; encounters require two or three drafted responders.",
  "not-drafted": "Draft the responder first.",
  incapacitated: "Responder incapacitated; stabilization required.",
  unreachable: "Choose a reachable clear floor position.",
  "invalid-order": "No eligible target or supplies for this order.",
};

export function createCombatWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
  control: (id: string) => string | null,
) {
  const element = document.createElement("section");
  element.id = "combat-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Tactical response");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Tactical Response</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><p data-tactical-status></p><div class="planner-roster-scroll"><table class="data-table" aria-label="Response team"><thead><tr><th>Responder</th><th>Duty</th><th>Condition</th><th>Order</th><th>Action</th></tr></thead><tbody data-tactical-roster></tbody></table></div><div class="field-row"><label for="tactical-person">Responder</label><select id="tactical-person"></select><button type="button" data-tactical-locate>Locate</button><button type="button" data-tactical-control>Control on Map</button></div><div class="dossier-actions"><button type="button" data-tactical-draft>Draft</button><button type="button" data-tactical-release>Release</button></div><dl class="trial-readings" data-tactical-readings></dl><fieldset><legend>Isolated Encounter - Sandbox</legend><div class="dossier-actions"><button type="button" data-tactical-start>Place 049-2</button><button type="button" data-tactical-target>Locate 049-2</button></div><p data-tactical-encounter></p></fieldset><p role="status" data-tactical-feedback></p><ol data-tactical-events></ol></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const person = element.querySelector<HTMLSelectElement>("#tactical-person")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-tactical-feedback]",
  )!;
  let current = controller.getSnapshot();
  let perspective: MapPerspective = "world";
  let selected = "person-caleb-ward";
  person.replaceChildren(
    ...current.game.personnel.map((entry) => new Option(entry.name, entry.id)),
  );
  const button = (action: string) =>
    element.querySelector<HTMLButtonElement>(`[data-tactical-${action}]`)!;
  const apply = (result: {
    code: TacticalCode;
    snapshot: ControllerSnapshot;
  }) => {
    render(result.snapshot);
    feedback.textContent = messages[result.code];
  };
  person.addEventListener("change", () => {
    selected = person.value;
    render(current);
  });
  button("draft").addEventListener("click", () => {
    if (perspective === "world")
      apply(controller.draftResponder(selected, true));
  });
  button("release").addEventListener("click", () => {
    if (perspective === "world")
      apply(controller.draftResponder(selected, false));
  });
  button("control").addEventListener("click", () => {
    if (perspective === "world" && !button("control").disabled)
      feedback.textContent = control(selected) ?? "";
  });
  button("locate").addEventListener("click", () => {
    const position =
      perspective === "world"
        ? current.game.world.positions[selected]
        : current.game.observations.entities[selected]?.position;
    if (position) locate(position);
  });
  button("start").addEventListener("click", () => {
    if (perspective !== "world") return;
    begin({
      label: "Isolated 049-2 encounter",
      origin: { x: 72, y: 55 },
      footprint: (position) => [{ position }],
      validate: (position) => {
        const code = controller.previewEncounter(position);
        return code === "accepted" ? null : messages[code];
      },
      confirm: (position) => {
        const result = controller.startEncounter(position);
        apply(result);
        return {
          accepted: result.code === "accepted",
          message: messages[result.code],
          snapshot: result.snapshot,
        };
      },
    });
  });
  button("target").addEventListener("click", () => {
    const target =
      perspective === "world"
        ? current.game.combat.adversary
        : current.game.combat.sighting?.adversary;
    if (target) locate(target.position);
  });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    person.value = selected;
    const combat = snapshot.game.combat;
    const recorded = perspective === "recorded";
    const responder = combat.responders[selected] ?? readyResponder();
    element.querySelector("[data-tactical-status]")!.textContent = recorded
      ? "Recorded perspective / live tactical state withheld"
      : `Encounter: ${combat.status} / ${Object.values(combat.responders).filter((entry) => entry.drafted).length} drafted`;
    const roster = element.querySelector("[data-tactical-roster]")!;
    const rows = new Map(
      Array.from(roster.children).map((row) => [
        (row as HTMLElement).dataset.personId,
        row,
      ]),
    );
    for (const entry of snapshot.game.personnel) {
      let row = rows.get(entry.id);
      if (!row) {
        row = document.createElement("tr");
        (row as HTMLElement).dataset.personId = entry.id;
        for (let index = 0; index < 5; index += 1)
          row.append(document.createElement("td"));
        roster.append(row);
      }
      const status = combat.responders[entry.id] ?? readyResponder();
      const assigned = expeditionMember(snapshot.game, entry.id);
      const values = [
        entry.name,
        assigned
          ? "Expedition"
          : recorded
            ? "Not recorded"
            : status.drafted
              ? "Drafted"
              : "Routine",
        recorded
          ? "Not recorded"
          : status.incapacitated
            ? status.stabilized
              ? "Stabilized / recovering"
              : "Incapacitated"
            : status.injuries
              ? `${status.health}% / ${status.stabilized ? "stable" : "deteriorating"}`
              : "No combat injury",
        recorded ? "Not recorded" : status.order,
        recorded
          ? "Not recorded"
          : `${status.phase}${status.remaining ? ` / ${status.remaining}` : ""}`,
      ];
      values.forEach((value, index) => {
        row!.children[index]!.textContent = value;
      });
    }
    const issue = recorded
      ? "Live targeting unavailable."
      : engagementIssue(snapshot.game, selected);
    const readings = [
      ["Response range", `${RESPONSE_RANGE} tiles`],
      ["Targeting", issue ?? "Clear line of sight / in range"],
      [
        "Action",
        recorded
          ? "Not recorded"
          : `${responder.order} / ${responder.phase} / ${responder.remaining} steps`,
      ],
      [
        "Ammunition / kits",
        recorded
          ? "Not recorded"
          : `${responder.ammunition} rounds / ${responder.medicalSupplies} stabilization kits`,
      ],
      [
        "Injuries",
        recorded
          ? "Not recorded"
          : `${responder.injuries} / ${responder.health}% functional health${responder.stabilized ? " / stabilized" : ""}`,
      ],
      [
        "Obstruction",
        recorded ? "Not recorded" : (responder.blockedReason ?? "None"),
      ],
    ];
    element.querySelector("[data-tactical-readings]")!.replaceChildren(
      ...readings.flatMap(([label, value]) => {
        const term = document.createElement("dt");
        term.textContent = label!;
        const description = document.createElement("dd");
        description.textContent = value!;
        return [term, description];
      }),
    );
    button("release").disabled =
      recorded || !responder.drafted || responder.incapacitated;
    const controlIssue = recorded
      ? "Recorded view is inspection-only; use Locate."
      : expeditionMember(snapshot.game, selected)
        ? "Assigned to expedition; use its field map."
        : !snapshot.game.world.positions[selected]
          ? "This person is not present on this map."
          : null;
    button("control").disabled = !!controlIssue;
    button("control").title =
      controlIssue ??
      "Select and center this person on the map; existing work continues.";
    button("draft").disabled =
      recorded ||
      responder.drafted ||
      responder.incapacitated ||
      expeditionMember(snapshot.game, selected);
    if (expeditionMember(snapshot.game, selected)) {
      button("release").disabled = true;
      element.querySelector("[data-tactical-readings]")!.textContent =
        "Assigned to expedition; use Expedition Operations for field orders and supplies.";
    }
    button("start").disabled = recorded || combat.status === "active";
    button("target").disabled = recorded ? !combat.sighting : !combat.adversary;
    const target = recorded ? combat.sighting?.adversary : combat.adversary;
    element.querySelector("[data-tactical-encounter]")!.textContent = target
      ? `${target.id} / ${target.health <= 0 ? "neutralized" : target.phase} / ${target.remaining} steps${recorded ? ` / last observed ${snapshot.game.tick - combat.sighting!.observedTick} minutes ago` : ` / ${target.health} integrity / response boundary ${ENCOUNTER_RADIUS} tiles`}`
      : "No encounter placed. Team requirement: 2-3 drafted responders.";
    element.querySelector("[data-tactical-events]")!.replaceChildren(
      ...(recorded ? [] : combat.events.slice(-5)).map((event) => {
        const item = document.createElement("li");
        item.textContent = event.text;
        return item;
      }),
    );
  }
  render(current);
  return {
    element,
    render,
    select(
      id: string,
      snapshot: ControllerSnapshot,
      view: MapPerspective = "world",
    ) {
      if (snapshot.game.personnel.some((person) => person.id === id))
        selected = id;
      perspective = view;
      render(snapshot);
    },
  };
}
