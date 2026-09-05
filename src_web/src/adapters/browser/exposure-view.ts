import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import {
  exposureTiles,
  type ExposureCommandCode,
  type ExposureSourcePolicy,
} from "../../simulation/environment";
import { surfaceAt } from "../../simulation/materials";
import type { TilePosition } from "../../simulation/world";
import type { PlacementRequest } from "./placement";

const messages: Record<ExposureCommandCode, string> = {
  accepted: "Source settings saved.",
  "invalid-source":
    "Set a name, positive intensity up to 1000, and a radius from 0 to 16.",
  "invalid-position":
    "Choose an unobstructed tile, not an intact wall or closed door.",
  "limit-reached": "The site supports at most 32 exposure sources.",
  "not-found": "This source no longer exists.",
};

export function createExposureWindow(
  host: HTMLElement,
  controller: GameController,
  begin: (request: PlacementRequest) => void,
  locate: (position: TilePosition) => void,
) {
  const element = document.createElement("section");
  element.id = "exposure-window";
  element.className = "window managed-window";
  element.hidden = true;
  element.setAttribute("aria-label", "Exposure sources sandbox");
  element.innerHTML =
    '<div class="title-bar"><div class="title-bar-text">Exposure Sources - Sandbox</div><div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div></div><div class="window-body construction-body"><div class="field-row"><label for="exposure-source">Source</label><select id="exposure-source"></select><button type="button" data-exposure-new>New source</button></div><dl class="trial-readings" data-exposure-record></dl><fieldset><legend>Source settings</legend><div class="field-row"><label for="exposure-name">Name</label><input id="exposure-name" maxlength="60"/></div><div class="field-row"><label for="exposure-kind">Effect</label><select id="exposure-kind"><option value="corrosion">Corrosion</option><option value="impact">Impact</option></select></div><div class="field-row"><label for="exposure-dose">Intensity / minute</label><input id="exposure-dose" type="number" min="0.1" max="1000" step="0.1"/></div><div class="field-row"><label for="exposure-radius">Radius (tiles)</label><input id="exposure-radius" type="number" min="0" max="16" step="1"/></div><div class="field-row"><input id="exposure-enabled" type="checkbox"/><label for="exposure-enabled">Enabled</label></div></fieldset><div class="dossier-actions"><button type="button" data-exposure-place>Place source</button><button type="button" data-exposure-save>Apply settings</button><button type="button" data-exposure-locate>Locate</button><button type="button" data-exposure-remove>Remove source</button></div><p role="status" data-exposure-feedback></p></div><div class="resize-grip" aria-hidden="true"></div>';
  host.append(element);
  const choice = element.querySelector<HTMLSelectElement>("#exposure-source")!;
  const name = element.querySelector<HTMLInputElement>("#exposure-name")!;
  const kind = element.querySelector<HTMLSelectElement>("#exposure-kind")!;
  const dose = element.querySelector<HTMLInputElement>("#exposure-dose")!;
  const radius = element.querySelector<HTMLInputElement>("#exposure-radius")!;
  const enabled = element.querySelector<HTMLInputElement>("#exposure-enabled")!;
  const feedback = element.querySelector<HTMLElement>(
    "[data-exposure-feedback]",
  )!;
  let current = controller.getSnapshot();
  let selected: string | undefined;
  let signature = "";
  const source = () =>
    current.game.environment.sources.find((source) => source.id === selected);
  function policy(position: TilePosition): ExposureSourcePolicy {
    return {
      name: name.value,
      kind: kind.value as ExposureSourcePolicy["kind"],
      dose: Number(dose.value),
      radius: Number(radius.value),
      enabled: enabled.checked,
      position,
    };
  }
  function choose(id?: string) {
    selected = id;
    const existing = source();
    name.value = existing?.name ?? "Local exposure";
    kind.value = existing?.kind ?? "corrosion";
    dose.value = String(existing?.dose ?? 4);
    radius.value = String(existing?.radius ?? 4);
    enabled.checked = existing?.enabled !== false;
    feedback.textContent = "";
    render(current);
  }
  choice.addEventListener("change", () => choose(choice.value || undefined));
  element
    .querySelector("[data-exposure-new]")!
    .addEventListener("click", () => choose());
  element
    .querySelector("[data-exposure-place]")!
    .addEventListener("click", () => {
      const id = selected;
      const origin = source()?.position ?? { x: 60, y: 54 };
      const draft = policy(origin);
      begin({
        label: `${draft.name} / ${draft.kind} / ${draft.dose} per minute / radius ${draft.radius}`,
        origin,
        footprint: (position) => [{ position }],
        validate: (position) => {
          const issue = controller.previewExposureSource(
            { ...draft, position },
            id,
          );
          return issue ? messages[issue] : null;
        },
        confirm: (position) => {
          const result = controller.setExposureSource(
            { ...draft, position },
            id,
          );
          current = result.snapshot;
          if (result.code === "accepted")
            choose(id ?? current.game.environment.sources.at(-1)!.id);
          feedback.textContent = messages[result.code];
          return {
            accepted: result.code === "accepted",
            message: messages[result.code],
            snapshot: result.snapshot,
          };
        },
      });
    });
  element
    .querySelector("[data-exposure-save]")!
    .addEventListener("click", () => {
      const existing = source();
      if (!existing) return;
      const result = controller.setExposureSource(
        policy(existing.position),
        existing.id,
      );
      render(result.snapshot);
      feedback.textContent = messages[result.code];
    });
  enabled.addEventListener("change", () => {
    const existing = source();
    if (!existing) return;
    const result = controller.setExposureSource(
      { ...existing, enabled: enabled.checked },
      existing.id,
    );
    render(result.snapshot);
    feedback.textContent = messages[result.code];
  });
  element
    .querySelector("[data-exposure-remove]")!
    .addEventListener("click", () => {
      if (!selected) return;
      current = controller.removeExposureSource(selected);
      choose();
      feedback.textContent = "Source removed; existing barrier damage remains.";
    });
  element
    .querySelector("[data-exposure-locate]")!
    .addEventListener("click", () => {
      const existing = source();
      if (existing) locate(existing.position);
    });
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const next = JSON.stringify(
      snapshot.game.environment.sources.map((source) => [
        source.id,
        source.name,
      ]),
    );
    if (next !== signature) {
      choice.replaceChildren(
        new Option("New source", ""),
        ...snapshot.game.environment.sources.map(
          (source) => new Option(source.name, source.id),
        ),
      );
      signature = next;
    }
    choice.value = selected ?? "";
    const existing = source();
    const tiles = existing ? exposureTiles(snapshot.game, existing) : [];
    const barriers = tiles
      .map((position) =>
        surfaceAt(snapshot.game.world.map, position, "structure"),
      )
      .filter((surface) => surface && surface.integrity > 0);
    const rows = existing
      ? [
          ["Location", `${existing.position.x}, ${existing.position.y}`],
          ["State", existing.enabled === false ? "Disabled" : "Emitting"],
          [
            "Current reach",
            `${tiles.length} tiles / ${barriers.length} intact barriers`,
          ],
          [
            "Lowest barrier integrity",
            barriers.length
              ? `${Math.min(...barriers.map((surface) => surface!.integrity))}%`
              : "No intact barriers in reach",
          ],
        ]
      : [["Selection", "New sandbox source"]];
    element.querySelector("[data-exposure-record]")!.replaceChildren(
      ...rows.map(([label, value]) => {
        const row = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label!;
        description.textContent = value!;
        row.append(term, description);
        return row;
      }),
    );
    for (const action of ["save", "remove", "locate"])
      element.querySelector<HTMLButtonElement>(
        `[data-exposure-${action}]`,
      )!.disabled = !existing;
    element.querySelector("[data-exposure-place]")!.textContent = existing
      ? "Relocate source"
      : "Place source";
  }
  choose();
  return {
    element,
    render,
    select(id: string, snapshot: ControllerSnapshot) {
      current = snapshot;
      choose(id);
    },
  };
}
