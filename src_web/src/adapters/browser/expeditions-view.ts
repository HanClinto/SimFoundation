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
import { FIELD_EXTRACTION } from "../../simulation/expedition-site";
import { readyResponder } from "../../simulation/combat";
import { OBJECT_DEFINITIONS } from "../../simulation/objects";
import type { PlacementRequest } from "./placement";
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
  beginField: (request: PlacementRequest) => void,
  focusField: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "expeditions-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Expedition operations");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Expedition Operations</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><div class="field-row"><label for="expedition-notice">Notice</label><select id="expedition-notice"></select></div><p data-expedition-report></p><fieldset><legend>Response Manifest</legend><div class="planner-roster-scroll"><table class="data-table" aria-label="Expedition manifest"><thead><tr><th>Enlist</th><th>Equipment</th><th>Rounds</th><th>Kits</th></tr></thead><tbody data-expedition-team></tbody></table></div></fieldset><div class="dossier-actions"><button type="button" data-expedition-enlist>Assemble team</button><button type="button" data-expedition-locate>Assembly point</button><button type="button" data-expedition-dispatch>Dispatch</button><button type="button" data-expedition-cancel>Cancel assembly</button><button type="button" data-expedition-map>Open field map</button><button type="button" data-expedition-recall>Regroup / return</button></div><p data-expedition-status></p><fieldset><legend>Field Orders</legend><div class="field-row"><label for="expedition-responder">Responder</label><select id="expedition-responder"></select><button type="button" data-expedition-find>Locate</button></div><div class="dossier-actions"><button type="button" data-expedition-move>Move</button><button type="button" data-expedition-hold>Hold</button><button type="button" data-expedition-engage>Engage</button><button type="button" data-expedition-retreat>Extraction point</button></div><div class="field-row"><label for="expedition-patient">Colleague</label><select id="expedition-patient"></select><button type="button" data-expedition-stabilize>Stabilize</button></div><dl class="trial-readings" data-expedition-responder-state></dl></fieldset><fieldset><legend>Recovery</legend><div class="field-row"><label for="expedition-cargo">Object</label><select id="expedition-cargo"></select><button type="button" data-expedition-recover>Secure / recover</button></div><p data-expedition-recovery></p></fieldset><p role="status" data-expedition-feedback></p><h3>Return Reports</h3><ol data-expedition-history></ol></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const manifest = element.querySelector("fieldset")!;
  const manifestDetails = document.createElement("details");
  const manifestSummary = document.createElement("summary");
  manifestSummary.textContent = "Team and equipment";
  manifestDetails.open = true;
  manifest.before(manifestDetails);
  manifestDetails.append(manifestSummary, manifest);
  let lastPhase: string | null = null;
  const cancelCargo = document.createElement("button");
  cancelCargo.type = "button";
  cancelCargo.textContent = "Cancel recovery / put down";
  cancelCargo.dataset.expeditionCancelRecovery = "";
  element
    .querySelector("#expedition-cargo")!
    .parentElement!.append(cancelCargo);
  let current = controller.getSnapshot();
  const notice =
    element.querySelector<HTMLSelectElement>("#expedition-notice")!;
  const responder = element.querySelector<HTMLSelectElement>(
    "#expedition-responder",
  )!;
  const patient = element.querySelector<HTMLSelectElement>(
    "#expedition-patient",
  )!;
  const cargo = element.querySelector<HTMLSelectElement>("#expedition-cargo")!;
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
    snapshot: ControllerSnapshot;
  }) => {
    render(result.snapshot);
    feedback.textContent = messages[result.code];
  };
  notice.addEventListener("change", () => render(current));
  responder.addEventListener("change", () => render(current));
  button("enlist").addEventListener("click", () => {
    const rows = Array.from(table.querySelectorAll<HTMLElement>("tr")).filter(
      (row) =>
        row.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked,
    );
    apply(
      controller.enlistExpedition(
        notice.value,
        rows.map((row) => row.dataset.personId!),
        Object.fromEntries(
          rows.map((row) => [
            row.dataset.personId!,
            {
              ammunition: Number(
                row.querySelector<HTMLInputElement>("[data-rounds]")!.value,
              ),
              medicalSupplies: Number(
                row.querySelector<HTMLInputElement>("[data-kits]")!.value,
              ),
            },
          ]),
        ),
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
  const order = (action: "hold" | "engage" | "stabilize", target?: string) => {
    const active = current.game.expeditions.active;
    if (!active) return;
    const result = controller.orderFieldResponder(
      active.id,
      responder.value,
      action,
      undefined,
      target,
    );
    render(result.snapshot);
    feedback.textContent =
      result.code === "accepted"
        ? "Field order accepted."
        : `Field order unavailable: ${result.code}.`;
  };
  button("hold").addEventListener("click", () => order("hold"));
  button("engage").addEventListener("click", () =>
    order("engage", "SCP-049-2"),
  );
  button("stabilize").addEventListener("click", () =>
    order("stabilize", patient.value),
  );
  for (const action of ["move", "retreat"] as const)
    button(action).addEventListener("click", () => {
      const active = current.game.expeditions.active;
      if (!active) return;
      const id = responder.value;
      const expeditionId = active.id;
      beginField({
        label: `${action === "move" ? "Move" : "Withdraw"} field responder`,
        origin:
          action === "retreat"
            ? FIELD_EXTRACTION
            : fieldState(current.game)!.world.positions[id]!,
        footprint: (position) => [{ position }],
        validate: (position) => {
          const code = controller.previewFieldOrder(
            expeditionId,
            id,
            action,
            position,
          );
          return code === "accepted" ? null : `Order unavailable: ${code}.`;
        },
        confirm: (position) => {
          const result = controller.orderFieldResponder(
            expeditionId,
            id,
            action,
            position,
          );
          return {
            accepted: result.code === "accepted",
            message:
              result.code === "accepted"
                ? "Field movement ordered."
                : result.code,
            snapshot: result.snapshot,
          };
        },
      });
    });
  button("recover").addEventListener("click", () => {
    const active = current.game.expeditions.active;
    if (active)
      apply(
        controller.recoverExpeditionObject(
          active.id,
          responder.value,
          cargo.value,
        ),
      );
  });
  cancelCargo.addEventListener("click", () => {
    const active = current.game.expeditions.active;
    if (active) apply(controller.cancelRecovery(active.id, responder.value));
  });
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
      if (!active) {
        const rounds = row.querySelector<HTMLInputElement>("[data-rounds]")!;
        const kits = row.querySelector<HTMLInputElement>("[data-kits]")!;
        if (Number(rounds.value) > supply.ammunition)
          rounds.value = String(supply.ammunition);
        if (Number(kits.value) > supply.medicalSupplies)
          kits.value = String(supply.medicalSupplies);
      }
    }
    const people = state.personnel.filter((person) =>
      active?.team.includes(person.id),
    );
    options(
      responder,
      people.map((person) => ({ id: person.id, name: person.name })),
    );
    options(
      patient,
      people.map((person) => ({ id: person.id, name: person.name })),
    );
    options(
      cargo,
      field?.objects.items
        .filter((item) => !active?.cargo.includes(item.id))
        .map((item) => ({
          id: item.id,
          name: OBJECT_DEFINITIONS[item.kind].name,
        })) ?? [],
    );
    const assembled = expeditionAssembled(state);
    element.querySelector("[data-expedition-status]")!.textContent = !active
      ? "No team dispatched."
      : `${active.id} / ${active.phase}${active.arrivesAt !== null ? ` / ${Math.max(0, active.arrivesAt - state.tick)} minutes to arrival` : active.phase === "assembling" ? (assembled ? " / Team assembled" : " / Gathering at departure point") : ""} / ${active.cargo.length} recovered object(s)`;
    if (active?.phase === "inbound" && active.arrivesAt! <= state.tick)
      element.querySelector("[data-expedition-status]")!.textContent +=
        " / Awaiting a clear home arrival point or available exposure-source capacity.";
    button("enlist").disabled =
      !!active ||
      state.expeditions.notices.find((entry) => entry.id === notice.value)
        ?.status !== "available";
    button("dispatch").disabled = active?.phase !== "assembling" || !assembled;
    button("cancel").disabled = active?.phase !== "assembling";
    button("map").disabled = !["field", "regrouping"].includes(
      active?.phase ?? "",
    );
    button("recall").disabled = active?.phase !== "field";
    for (const action of [
      "move",
      "hold",
      "engage",
      "retreat",
      "stabilize",
      "recover",
      "find",
    ])
      button(action).disabled = active?.phase !== "field" || !responder.value;
    const member = field?.combat.responders[responder.value];
    cancelCargo.disabled = !active?.recoveryOrders.some(
      (order) =>
        order.personId === responder.value && order.phase !== "delivered",
    );
    if (member?.incapacitated)
      for (const action of [
        "move",
        "hold",
        "engage",
        "retreat",
        "stabilize",
        "recover",
      ])
        button(action).disabled = true;
    button("recover").disabled ||= !cargo.value;
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
