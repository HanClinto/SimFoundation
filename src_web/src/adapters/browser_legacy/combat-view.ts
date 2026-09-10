import type {
  ControllerSnapshot,
  GameController,
} from "../../application/legacy/controller";
import {
  engagementIssue,
  readyResponder,
  RESPONSE_RANGE,
  ENCOUNTER_RADIUS,
  type TacticalCode,
} from "../../simulation_legacy/combat";
import type { TilePosition } from "../../simulation_legacy/world";
import type { MapPerspective } from "./map-settings";
import { expeditionMember } from "../../simulation_legacy/expeditions";

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
  locate: (position: TilePosition) => void,
  control: (id: string) => string | null,
) {
  const element = document.createElement("section");
  element.id = "combat-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Tactical response");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Tactical Response</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><p data-tactical-status></p><div class="planner-roster-scroll"><table class="data-table" aria-label="Response team"><thead><tr><th>Responder</th><th>Duty</th><th>Condition</th><th>Order</th><th>Action</th></tr></thead><tbody data-tactical-roster></tbody></table></div><div class="field-row"><label for="tactical-person">Responder</label><select id="tactical-person"></select><button type="button" data-tactical-locate>Locate</button><button type="button" data-tactical-control>Control on Map</button></div><div class="dossier-actions"><button type="button" data-tactical-draft>Draft</button><button type="button" data-tactical-release>Release</button></div><dl class="trial-readings" data-tactical-readings></dl><fieldset><legend>Observed Threat</legend><button type="button" data-tactical-target>Locate 049-2</button><p data-tactical-encounter></p></fieldset><p role="status" data-tactical-feedback></p><ol data-tactical-events></ol></div><div class="resize-grip" aria-hidden="true"></div>';
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
  for (const [action, drafted] of [
    ["draft", true],
    ["release", false],
  ] as const)
    button(action).addEventListener("click", () => {
      if (perspective !== "world") return;
      const reason = controller.previewDraftResponder(selected, drafted);
      if (reason) {
        render(controller.getSnapshot());
        feedback.textContent = reason;
      } else apply(controller.draftResponder(selected, drafted));
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
    for (const [action, drafted] of [
      ["draft", true],
      ["release", false],
    ] as const) {
      const reason = recorded
        ? "Recorded view is inspection-only."
        : (controller.previewDraftResponder(selected, drafted) ??
          (responder.drafted === drafted
            ? drafted
              ? "Already drafted."
              : "Already on routine duty."
            : null));
      button(action).disabled = !!reason;
      button(action).title =
        reason ??
        (drafted
          ? "Take tactical duty; current personal orders are replaced."
          : "Return to routine duty; current personal orders are cleared.");
    }
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
    if (expeditionMember(snapshot.game, selected)) {
      element.querySelector("[data-tactical-readings]")!.textContent =
        "Assigned to expedition; use Expedition Operations for field orders and supplies.";
    }
    button("target").disabled = recorded ? !combat.sighting : !combat.adversary;
    const target = recorded ? combat.sighting?.adversary : combat.adversary;
    element.querySelector("[data-tactical-encounter]")!.textContent = target
      ? `${target.id} / ${target.health <= 0 ? "neutralized" : target.phase} / ${target.remaining} steps${recorded ? ` / last observed ${snapshot.game.tick - combat.sighting!.observedTick} minutes ago` : ` / ${target.health} integrity / response boundary ${ENCOUNTER_RADIUS} tiles`}`
      : recorded
        ? "No recorded threat."
        : "No active threat.";
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
