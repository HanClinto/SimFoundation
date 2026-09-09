import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  fieldState,
  expeditionAssembled,
  EXPEDITION_ASSEMBLY,
  type ExpeditionCode,
} from "../../simulation/expeditions";
import { readyResponder } from "../../simulation/combat";
import { OBJECT_DEFINITIONS } from "../../simulation/objects";
import type { TilePosition } from "../../simulation/world";

const messages: Record<ExpeditionCode, string> = {
  accepted: "Expedition order accepted.",
  busy: "Resolve active work, cargo handling or casualty care first.",
  "invalid-team":
    "Select two or three available staff and a loadout within their supplies.",
  "not-found": "This notice or expedition is no longer available.",
  unreachable: "No reachable route to the requested destination.",
  "not-ready": "The team is not ready for this operation.",
};

export function createExpeditionsWindow(
  host: HTMLElement,
  controller: GameController,
  locateBase: (position: TilePosition) => void,
  openField: () => void,
  controlField: (expeditionId: string, personId: string) => string | null,
  focusField: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "expeditions-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Expedition operations");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Expedition Operations</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><div class="field-row"><label for="expedition-notice">Notice</label><select id="expedition-notice"></select></div><p data-expedition-report></p><fieldset><legend>Response Manifest</legend><div class="planner-roster-scroll"><table class="data-table" aria-label="Expedition manifest"><thead><tr><th>Enlist</th><th>Equipment</th><th>Rounds</th><th>Kits</th></tr></thead><tbody data-expedition-team></tbody></table></div></fieldset><div class="dossier-actions"><button type="button" data-expedition-enlist>Assemble team</button><button type="button" data-expedition-locate>Assembly point</button><button type="button" data-expedition-dispatch>Dispatch</button><button type="button" data-expedition-cancel>Cancel assembly</button><button type="button" data-expedition-map>Open field map</button><button type="button" data-expedition-recall>Regroup / return</button></div><p data-expedition-status></p><fieldset><legend>Field Responders</legend><div class="field-row"><label for="expedition-responder">Responder</label><select id="expedition-responder"></select><button type="button" data-expedition-find>Locate</button><button type="button" data-expedition-control>Control on Map</button></div><dl class="trial-readings" data-expedition-responder-state></dl></fieldset><fieldset><legend>Recovery</legend><p data-expedition-recovery></p></fieldset><p role="status" data-expedition-feedback></p><h3>Return Reports</h3><ol data-expedition-history></ol></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const manifest = element.querySelector("fieldset")!;
  const manifestDetails = document.createElement("details");
  const manifestSummary = document.createElement("summary");
  manifestSummary.textContent = "Team and equipment";
  manifestDetails.open = true;
  manifest.before(manifestDetails);
  manifestDetails.append(manifestSummary, manifest);
  let lastPhase: string | null = null;
  let current = controller.getSnapshot();
  const notice =
    element.querySelector<HTMLSelectElement>("#expedition-notice")!;
  const responder = element.querySelector<HTMLSelectElement>(
    "#expedition-responder",
  )!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-expedition-feedback]",
  )!;
  const button = (action: string) =>
    element.querySelector<HTMLButtonElement>(`[data-expedition-${action}]`)!;
  const table = element.querySelector("[data-expedition-team]")!;
  for (const person of current.game.personnel) {
    const row = document.createElement("tr");
    row.dataset.personId = person.id;
    row.innerHTML =
      '<td><div class="field-row"><input type="checkbox"/><label></label></div></td><td data-equipment></td><td><input type="number" min="0" step="1" data-rounds style="width:52px"/></td><td><input type="number" min="0" step="1" data-kits style="width:44px"/></td>';
    const checked = row.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checked.id = `enlist-${person.id}`;
    checked.checked = ["person-caleb-ward", "person-lena-ortiz"].includes(
      person.id,
    );
    row.querySelector("label")!.htmlFor = checked.id;
    row.querySelector("label")!.textContent = person.name;
    const supply =
      current.game.combat.responders[person.id] ?? readyResponder();
    row.querySelector<HTMLInputElement>("[data-rounds]")!.value = String(
      supply.ammunition,
    );
    row.querySelector<HTMLInputElement>("[data-kits]")!.value = String(
      supply.medicalSupplies,
    );
    row
      .querySelector<HTMLInputElement>("[data-rounds]")!
      .setAttribute("aria-label", `${person.name} rounds`);
    row
      .querySelector<HTMLInputElement>("[data-kits]")!
      .setAttribute("aria-label", `${person.name} medical kits`);
    table.append(row);
  }
  const apply = (result: {
    code: ExpeditionCode;
    reason: string | null;
    snapshot: ControllerSnapshot;
  }) => {
    render(result.snapshot);
    feedback.textContent = result.reason ?? messages[result.code];
  };
  notice.addEventListener("change", () => render(current));
  responder.addEventListener("change", () => render(current));
  function manifestInput() {
    const rows = Array.from(table.querySelectorAll<HTMLElement>("tr")).filter(
      (row) =>
        row.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
    );
    return {
      team: rows.map((row) => row.dataset.personId!),
      loadouts: Object.fromEntries(
        rows.map((row) => [
          row.dataset.personId!,
          {
            ammunition: Number(
              row.querySelector<HTMLInputElement>("[data-rounds]")!.value ||
                "NaN",
            ),
            medicalSupplies: Number(
              row.querySelector<HTMLInputElement>("[data-kits]")!.value ||
                "NaN",
            ),
          },
        ]),
      ),
    };
  }
  function updateLifecycleControls() {
    const manifest = manifestInput();
    const reasons = {
      enlist: controller.previewEnlistExpedition(
        notice.value,
        manifest.team,
        manifest.loadouts,
      ),
      dispatch: controller.previewDispatchExpedition(),
      cancel: controller.previewCancelExpedition(),
      recall: controller.previewRecallExpedition(),
    };
    const titles = {
      enlist: "Assemble the selected team with this loadout.",
      dispatch: "Dispatch the assembled team to the field site.",
      cancel: "Cancel assembly and release the mission's team assignment.",
      recall: "Regroup the whole team at extraction for return.",
    };
    for (const action of ["enlist", "dispatch", "cancel", "recall"] as const) {
      button(action).disabled = !!reasons[action];
      button(action).title = reasons[action] ?? titles[action];
    }
  }
  table.addEventListener("input", updateLifecycleControls);
  table.addEventListener("change", updateLifecycleControls);
  button("enlist").addEventListener("click", () => {
    const manifest = manifestInput();
    apply(
      controller.enlistExpedition(
        notice.value,
        manifest.team,
        manifest.loadouts,
      ),
    );
  });
  button("locate").addEventListener("click", () =>
    locateBase(EXPEDITION_ASSEMBLY),
  );
  button("dispatch").addEventListener("click", () =>
    apply(controller.dispatchExpedition()),
  );
  button("cancel").addEventListener("click", () =>
    apply(controller.cancelExpedition()),
  );
  button("map").addEventListener("click", openField);
  button("recall").addEventListener("click", () =>
    apply(controller.recallExpedition()),
  );
  button("find").addEventListener("click", () => {
    const position = fieldState(current.game)?.world.positions[responder.value];
    if (position) {
      openField();
      focusField(position);
    }
  });
  button("control").addEventListener("click", () => {
    const expeditionId = current.game.expeditions.active?.id;
    const id = responder.value;
    const snapshot = controller.getSnapshot();
    const active = snapshot.game.expeditions.active;
    const issue =
      active?.id !== expeditionId
        ? "This expedition is no longer available."
        : fieldControlIssue(snapshot, id);
    if (issue || !expeditionId) {
      render(snapshot);
      feedback.textContent = issue ?? "No active expedition.";
      return;
    }
    feedback.textContent = controlField(expeditionId, id) ?? "";
  });
  function fieldControlIssue(
    snapshot: ControllerSnapshot,
    id: string,
  ): string | null {
    const active = snapshot.game.expeditions.active;
    if (active?.phase !== "field")
      return "Personal control is available only while the team is in the field.";
    if (!active.team.includes(id) || !active.site?.world.positions[id])
      return "This responder is not present on the field map.";
    return null;
  }
  const options = (
    select: HTMLSelectElement,
    entries: readonly { id: string; name: string }[],
  ) => {
    const signature = JSON.stringify(entries);
    if (select.dataset.signature === signature) return;
    const selected = select.value;
    select.replaceChildren(
      ...entries.map((entry) => new Option(entry.name, entry.id)),
    );
    if (entries.some((entry) => entry.id === selected)) select.value = selected;
    select.dataset.signature = signature;
  };
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const state = snapshot.game;
    const active = state.expeditions.active;
    const field = fieldState(state);
    const phase = active?.phase ?? "planning";
    if (phase !== lastPhase) {
      manifestDetails.open = phase === "planning" || phase === "assembling";
      lastPhase = phase;
    }
    options(
      notice,
      state.expeditions.notices.map((entry) => ({
        id: entry.id,
        name: `${entry.title} / ${entry.status}`,
      })),
    );
    element.querySelector("[data-expedition-report]")!.textContent =
      state.expeditions.notices.find((entry) => entry.id === notice.value)
        ?.report ?? "No incident notices.";
    for (const row of table.querySelectorAll<HTMLElement>("tr")) {
      const person = state.personnel.find(
        (person) => person.id === row.dataset.personId,
      )!;
      row.querySelector("[data-equipment]")!.textContent =
        Object.values(person.equipment)
          .filter((item) => !!item)
          .map((item) => item!.name)
          .join(", ") || "No equipped items";
      for (const input of row.querySelectorAll<HTMLInputElement>("input"))
        input.disabled = !!active;
      const supply = state.combat.responders[person.id] ?? readyResponder();
      row.querySelector<HTMLInputElement>("[data-rounds]")!.max = String(
        supply.ammunition,
      );
      row.querySelector<HTMLInputElement>("[data-kits]")!.max = String(
        supply.medicalSupplies,
      );
    }
    const people = state.personnel.filter((person) =>
      active?.team.includes(person.id),
    );
    options(
      responder,
      people.map((person) => ({ id: person.id, name: person.name })),
    );
    const assembled = expeditionAssembled(state);
    element.querySelector("[data-expedition-status]")!.textContent = !active
      ? "No team dispatched."
      : `${active.id} / ${active.phase}${active.arrivesAt !== null ? ` / ${Math.max(0, active.arrivesAt - state.tick)} minutes to arrival` : active.phase === "assembling" ? (assembled ? " / Team assembled" : " / Gathering at departure point") : ""} / ${active.cargo.length} recovered object(s)`;
    if (active?.phase === "inbound" && active.arrivesAt! <= state.tick)
      element.querySelector("[data-expedition-status]")!.textContent +=
        " / Awaiting a clear home arrival point or available exposure-source capacity.";
    updateLifecycleControls();
    button("map").disabled = !["field", "regrouping"].includes(
      active?.phase ?? "",
    );
    button("find").disabled =
      !["field", "regrouping"].includes(active?.phase ?? "") ||
      !field?.world.positions[responder.value];
    const controlIssue = fieldControlIssue(snapshot, responder.value);
    button("control").disabled = !!controlIssue;
    button("control").title =
      controlIssue ??
      "Select and center this responder on the field map; existing work continues.";
    const member = field?.combat.responders[responder.value];
    const readings = member
      ? [
          ["Action", `${member.order} / ${member.phase} / ${member.remaining}`],
          [
            "Functional health",
            `${member.health}% / ${member.incapacitated ? "incapacitated" : member.injuries ? (member.stabilized ? "stabilized" : "deteriorating") : "no combat injury"}`,
          ],
          [
            "Supplies",
            `${member.ammunition} rounds / ${member.medicalSupplies} kits`,
          ],
          [
            "World / field threat",
            field?.combat.adversary
              ? `${field.combat.adversary.id} / ${field.combat.status} / ${field.combat.adversary.health} integrity`
              : "None",
          ],
          ["Obstruction", member.blockedReason ?? "None"],
        ]
      : [];
    element.querySelector("[data-expedition-responder-state]")!.replaceChildren(
      ...readings.flatMap(([label, value]) => {
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label!;
        description.textContent = value!;
        return [term, description];
      }),
    );
    element.querySelector("[data-expedition-recovery]")!.textContent =
      active?.recoveryOrders
        .map(
          (order) =>
            `${OBJECT_DEFINITIONS[field!.objects.items.find((item) => item.id === order.objectId)!.kind].name}: ${order.phase} / ${order.progress} / ${order.blockedReason ?? ""}`,
        )
        .join("; ") || "No recovery orders.";
    element.querySelector("[data-expedition-history]")!.replaceChildren(
      ...state.expeditions.history.map((entry) => {
        const item = document.createElement("li");
        item.textContent = `${entry.id}: ${entry.team.map((id) => state.personnel.find((person) => person.id === id)?.name ?? id).join(", ")} returned / ${entry.cargo.length === 2 ? "Recovery complete" : entry.cargo.length ? "Partial recovery" : "Withdrawn without cargo"} / ${entry.cargo
          .map((id) => state.objects.items.find((item) => item.id === id))
          .filter((item) => !!item)
          .map((item) => OBJECT_DEFINITIONS[item!.kind].name)
          .join(", ")}`;
        return item;
      }),
    );
  }
  render(current);
  return {
    element,
    render,
    select(id: string) {
      if (Array.from(responder.options).some((option) => option.value === id))
        responder.value = id;
      render(current);
    },
  };
}
