import {
  latestPhysicalAssessment,
  projectBiases,
  projectPsychology,
  projectTraits,
  type PersonnelItem,
  type PersonnelRecord,
} from "../../simulation/personnel";

function initials(name: string): string {
  return name
    .replace("Dr. ", "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function compactMetricMarkup(label: string, field: string): string {
  return `
    <div class="compact-metric">
      <dt>${label}</dt>
      <dd data-value="${field}">0</dd>
    </div>
  `;
}

function itemKind(item: PersonnelItem | null): string {
  if (!item) return "empty";
  const id = item.id;
  if (/helmet|hardhat/.test(id)) return "headgear";
  if (/coat|coveralls|scrubs|vest|jacket/.test(id)) return "clothing";
  if (/tablet|scanner|multimeter|radio|dosimeter/.test(id)) return "device";
  if (/medkit|sedative/.test(id)) return "medical";
  if (/notebook|manifest/.test(id)) return "document";
  if (/coffee|snack/.test(id)) return "food";
  if (/mop|baton/.test(id)) return "tool";
  if (/toolbelt|keys|restraints/.test(id)) return "utility";
  return "supply";
}

function itemTileMarkup(slot: string, label: string): string {
  return `<div class="item-tile equipment-slot equipment-${slot} empty" data-equipment-tile="${slot}">
    <span class="item-slot-label">${label}</span>
    <span class="item-icon" data-item-kind="empty" aria-hidden="true"><span class="item-glyph"></span></span>
    <strong data-equipment-slot="${slot}">Empty</strong>
  </div>`;
}

function createItemTile(item: PersonnelItem | null): HTMLElement {
  const tile = document.createElement("div");
  tile.className = "item-tile inventory-slot";
  tile.classList.toggle("empty", item === null);
  tile.title = item?.description ?? "Empty inventory slot";

  const icon = document.createElement("span");
  icon.className = "item-icon";
  icon.dataset.itemKind = itemKind(item);
  icon.setAttribute("aria-hidden", "true");
  const glyph = document.createElement("span");
  glyph.className = "item-glyph";
  icon.append(glyph);

  const caption = document.createElement("strong");
  caption.textContent = item?.name ?? "Empty";
  tile.append(icon, caption);
  return tile;
}

const EQUIPMENT_SLOTS = [
  ["head", "Head"],
  ["body", "Body"],
  ["primaryHand", "Primary"],
  ["offHand", "Off hand"],
  ["accessory", "Accessory"],
] as const;

export function createPersonnelInspectorWindows(
  host: HTMLElement,
  personnel: readonly PersonnelRecord[],
): readonly HTMLElement[] {
  const windows = personnel.map((person) => {
    const windowElement = document.createElement("section");
    windowElement.id = `personnel-inspector-${person.id}`;
    windowElement.className = "window managed-window pawn-window";
    windowElement.dataset.personId = person.id;
    windowElement.setAttribute(
      "aria-label",
      `${person.name} personnel inspector`,
    );
    windowElement.hidden = true;
    windowElement.innerHTML = `
      <div class="title-bar">
        <div class="title-bar-text" data-field="title"></div>
        <div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div>
      </div>
      <div class="window-body pawn-inspector-body">
        <header class="pawn-summary">
          <div class="pawn-portrait" data-field="initials" aria-hidden="true"></div>
          <div>
            <h2 data-field="name"></h2>
            <p><span data-field="assignment"></span> / Clearance <span data-field="clearance"></span></p>
            <p data-field="activity"></p>
          </div>
        </header>
        <menu class="dossier-tabs" role="tablist" aria-label="Personnel dossier sections">
          <button id="dossier-${person.id}-tab-summary" type="button" role="tab" aria-selected="true" aria-controls="dossier-${person.id}-panel-summary" data-dossier-tab="summary">Summary</button>
          <button id="dossier-${person.id}-tab-equipment" type="button" role="tab" aria-selected="false" aria-controls="dossier-${person.id}-panel-equipment" data-dossier-tab="equipment">Equipment</button>
          <button id="dossier-${person.id}-tab-skills" type="button" role="tab" aria-selected="false" aria-controls="dossier-${person.id}-panel-skills" data-dossier-tab="skills">Skills</button>
          <button id="dossier-${person.id}-tab-influences" type="button" role="tab" aria-selected="false" aria-controls="dossier-${person.id}-panel-influences" data-dossier-tab="influences">Influences</button>
        </menu>
        <section id="dossier-${person.id}-panel-summary" class="dossier-panel" role="tabpanel" aria-labelledby="dossier-${person.id}-tab-summary" aria-hidden="false" data-dossier-panel="summary">
          <div class="summary-scores">
            <div><span>Physical</span><strong data-field="physical-summary"></strong><small data-field="physical-recency"></small></div>
            <div><span>Mood</span><strong data-field="mood-score"></strong><small data-field="mood-band"></small></div>
            <div><span>Sanity</span><strong data-field="sanity-score"></strong><small data-field="sanity-band"></small></div>
          </div>
          <fieldset>
            <legend>Records</legend>
            <div class="dossier-actions">
              <button type="button" data-open-related-window="medical-chart-${person.id}">Open Medical Chart</button>
              <button type="button" data-open-related-window="assessment-record-${person.id}">Open Assessment Record</button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Current condition</legend>
            <dl class="compact-metrics">
              ${compactMetricMarkup("Satiety", "satiety")}
              ${compactMetricMarkup("Rest", "rest")}
              ${compactMetricMarkup("Stress", "stress")}
              ${compactMetricMarkup("Fear", "fear")}
            </dl>
          </fieldset>
          <fieldset>
            <legend>At a glance</legend>
            <p><strong>Traits:</strong> <span data-field="traits-summary"></span></p>
            <p><strong>Best skill:</strong> <span data-field="best-skill"></span></p>
          </fieldset>
        </section>
        <section id="dossier-${person.id}-panel-equipment" class="dossier-panel equipment-panel" role="tabpanel" aria-labelledby="dossier-${person.id}-tab-equipment" aria-hidden="true" data-dossier-panel="equipment" hidden>
          <div class="paper-doll">
            <div class="paper-doll-figure" aria-hidden="true"><span></span></div>
            ${EQUIPMENT_SLOTS.map(([slot, label]) =>
              itemTileMarkup(slot, label),
            ).join("")}
          </div>
          <fieldset>
            <legend>Carried inventory</legend>
            <div class="inventory-slots" data-field="inventory"></div>
          </fieldset>
        </section>
        <section id="dossier-${person.id}-panel-skills" class="dossier-panel" role="tabpanel" aria-labelledby="dossier-${person.id}-tab-skills" aria-hidden="true" data-dossier-panel="skills" hidden>
          <fieldset>
            <legend>Training record</legend>
            <p class="system-note">Official training record. Levels range from 1 (novice) to 10 (expert); current practical performance may differ.</p>
            <table class="data-table compact-table">
              <thead><tr><th>Skill</th><th>Level</th><th>XP</th></tr></thead>
              <tbody data-field="skills"></tbody>
            </table>
          </fieldset>
        </section>
        <section id="dossier-${person.id}-panel-influences" class="dossier-panel" role="tabpanel" aria-labelledby="dossier-${person.id}-tab-influences" aria-hidden="true" data-dossier-panel="influences" hidden>
          <fieldset>
            <legend>Traits</legend>
            <p data-field="traits"></p>
          </fieldset>
          <fieldset>
            <legend>Active Effects</legend>
            <ul data-field="effects"></ul>
          </fieldset>
          <fieldset>
            <legend>Work preferences</legend>
            <dl class="preference-summary">
              <div><dt>Mind / Might</dt><dd data-field="bias-mind-might">Unassessed</dd></div>
              <div><dt>Receptive / Resolute</dt><dd data-field="bias-receptive-resolute">Unassessed</dd></div>
            </dl>
            <p class="system-note" data-field="bias-assessment-meta">No work-preference evaluation on record.</p>
          </fieldset>
          <div class="psychology-grid">
            <fieldset>
              <legend>Mood influences</legend>
              <ul data-field="mood-contributors"></ul>
            </fieldset>
            <fieldset>
              <legend>Sanity influences</legend>
              <ul data-field="sanity-contributors"></ul>
            </fieldset>
          </div>
        </section>
      </div>
      <div class="resize-grip" aria-hidden="true"></div>
    `;
    host.append(windowElement);
    windowElement.addEventListener("click", (event) => {
      const tab = (event.target as Element).closest<HTMLButtonElement>(
        "[data-dossier-tab]",
      );
      if (!tab?.dataset.dossierTab) return;
      for (const candidate of windowElement.querySelectorAll<HTMLButtonElement>(
        "[data-dossier-tab]",
      )) {
        candidate.setAttribute("aria-selected", String(candidate === tab));
      }
      for (const panel of windowElement.querySelectorAll<HTMLElement>(
        "[data-dossier-panel]",
      )) {
        panel.hidden = panel.dataset.dossierPanel !== tab.dataset.dossierTab;
        panel.setAttribute("aria-hidden", String(panel.hidden));
      }
    });
    return windowElement;
  });

  updatePersonnelInspectors(windows, personnel);
  return windows;
}

function setText(scope: HTMLElement, field: string, value: string): void {
  const element = scope.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!element) throw new Error(`Personnel field missing: ${field}`);
  element.textContent = value;
}

function setMetric(scope: HTMLElement, field: string, value: number): void {
  const rounded = Math.round(value);
  const valueElement = scope.querySelector<HTMLElement>(
    `[data-value="${field}"]`,
  );
  if (!valueElement)
    throw new Error(`Personnel metric value missing: ${field}`);
  valueElement.textContent = `${rounded}%`;
}

function setContributors(
  scope: HTMLElement,
  field: string,
  values: readonly string[],
): void {
  const list = scope.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!list) throw new Error(`Personnel contributor list missing: ${field}`);
  list.replaceChildren(
    ...values.map((value) => {
      const item = document.createElement("li");
      item.textContent = value;
      return item;
    }),
  );
}

export function updatePersonnelRoster(
  tableBody: HTMLElement,
  personnel: readonly PersonnelRecord[],
): void {
  const existingIds = new Set(
    Array.from(
      tableBody.querySelectorAll<HTMLElement>("[data-person-id]"),
      ({ dataset }) => dataset.personId,
    ),
  );
  if (existingIds.size !== personnel.length) {
    tableBody.replaceChildren(
      ...personnel.map((person) => {
        const row = document.createElement("tr");
        row.dataset.personId = person.id;
        row.tabIndex = 0;
        row.title = `Open ${person.name}`;
        row.innerHTML =
          '<td data-cell="name"></td><td data-cell="assignment"></td><td data-cell="activity"></td><td data-cell="mood"></td><td data-cell="sanity"></td>';
        return row;
      }),
    );
  }

  for (const person of personnel) {
    const row = tableBody.querySelector<HTMLElement>(
      `[data-person-id="${person.id}"]`,
    );
    if (!row) throw new Error(`Personnel row missing: ${person.id}`);
    const psychology = projectPsychology(person);
    for (const [cell, value] of [
      ["name", person.name],
      ["assignment", person.assignment],
      ["activity", person.activity],
      ["mood", psychology.moodAppearance],
      ["sanity", psychology.sanityAppearance],
    ] as const) {
      const target = row.querySelector<HTMLElement>(`[data-cell="${cell}"]`);
      if (!target) throw new Error(`Personnel roster cell missing: ${cell}`);
      target.textContent = value;
    }
  }
}

export function updatePersonnelInspectors(
  windows: readonly HTMLElement[],
  personnel: readonly PersonnelRecord[],
  currentTick = 0,
): void {
  for (const person of personnel) {
    const inspector = windows.find(
      ({ dataset }) => dataset.personId === person.id,
    );
    if (!inspector)
      throw new Error(`Personnel inspector missing: ${person.id}`);
    const psychology = projectPsychology(person);
    const psychologicalAssessment = psychology.assessment;
    const physicalAssessment = latestPhysicalAssessment(person);
    const projectedBiases = projectBiases(person);
    const projectedTraits = projectTraits(person);
    const traitSummary =
      projectedTraits.length > 0
        ? projectedTraits
            .map(({ label, status }) =>
              status === "disclosed" ? label : `${label} (${status})`,
            )
            .join(", ")
        : "No documented Traits";

    setText(inspector, "title", `${person.name} - Personnel Inspector`);
    setText(inspector, "initials", initials(person.name));
    setText(inspector, "name", person.name);
    setText(inspector, "assignment", person.assignment);
    setText(inspector, "clearance", person.clearance.toString());
    setText(inspector, "activity", person.activity);
    setText(
      inspector,
      "physical-summary",
      physicalAssessment
        ? `${physicalAssessment.estimate.minimum}-${physicalAssessment.estimate.maximum}`
        : "Unassessed",
    );
    setText(
      inspector,
      "physical-recency",
      physicalAssessment
        ? `Exam tick ${physicalAssessment.assessedTick}`
        : person.physicalObservations.length > 0
          ? "Visible signs reported; severity unknown"
          : "No current report",
    );
    setText(inspector, "traits", traitSummary);
    setText(inspector, "traits-summary", traitSummary);
    setText(
      inspector,
      "bias-mind-might",
      projectedBiases
        ? `${projectedBiases.mindMight.label} (${projectedBiases.mindMight.estimate.minimum} to ${projectedBiases.mindMight.estimate.maximum})`
        : "Unassessed",
    );
    setText(
      inspector,
      "bias-receptive-resolute",
      projectedBiases
        ? `${projectedBiases.receptiveResolute.label} (${projectedBiases.receptiveResolute.estimate.minimum} to ${projectedBiases.receptiveResolute.estimate.maximum})`
        : "Unassessed",
    );
    setText(
      inspector,
      "bias-assessment-meta",
      projectedBiases
        ? `${Math.round(projectedBiases.confidence * 100)}% confidence / assessment tick ${projectedBiases.assessedTick}`
        : "No work-preference evaluation on record.",
    );
    const bestSkill = [...person.skills].sort(
      (first, second) => second.level - first.level,
    )[0];
    setText(
      inspector,
      "best-skill",
      bestSkill
        ? `${bestSkill.id[0]?.toUpperCase()}${bestSkill.id.slice(1)} ${bestSkill.level}`
        : "None",
    );
    const assessmentAge = psychologicalAssessment
      ? currentTick - psychologicalAssessment.assessedTick
      : null;
    const assessmentLabel = psychologicalAssessment
      ? `${assessmentAge !== null && assessmentAge >= 30 ? "Stale" : "Assessed"} / tick ${psychologicalAssessment.assessedTick}`
      : "Observed only / unassessed";
    setText(
      inspector,
      "mood-score",
      psychologicalAssessment
        ? `${psychologicalAssessment.moodEstimate.minimum}-${psychologicalAssessment.moodEstimate.maximum}`
        : psychology.moodAppearance,
    );
    setText(inspector, "mood-band", assessmentLabel);
    setText(
      inspector,
      "sanity-score",
      psychologicalAssessment
        ? `${psychologicalAssessment.sanityEstimate.minimum}-${psychologicalAssessment.sanityEstimate.maximum}`
        : psychology.sanityAppearance,
    );
    setText(inspector, "sanity-band", assessmentLabel);
    setMetric(inspector, "satiety", person.needs.satiety);
    setMetric(inspector, "rest", person.needs.rest);
    setMetric(inspector, "stress", person.stress);
    setMetric(inspector, "fear", person.fear);
    setContributors(
      inspector,
      "mood-contributors",
      psychologicalAssessment?.moodContributors ?? [
        "Requires psychological assessment",
      ],
    );
    setContributors(
      inspector,
      "sanity-contributors",
      psychologicalAssessment?.sanityContributors ?? [
        "Requires psychological assessment",
      ],
    );
    setContributors(
      inspector,
      "effects",
      person.effects.length > 0
        ? person.effects.map((effect) =>
            effect.expiresAtTick === null
              ? effect.name
              : `${effect.name} / expires tick ${effect.expiresAtTick}`,
          )
        : ["No active Effects"],
    );

    for (const [slot] of EQUIPMENT_SLOTS) {
      const slotElement = inspector.querySelector<HTMLElement>(
        `[data-equipment-slot="${slot}"]`,
      );
      if (!slotElement)
        throw new Error(`Personnel equipment slot missing: ${slot}`);
      const item = person.equipment[slot];
      slotElement.textContent = item?.name ?? "Empty";
      slotElement.title = item?.description ?? "No item equipped";
      const tile = inspector.querySelector<HTMLElement>(
        `[data-equipment-tile="${slot}"]`,
      );
      const icon = tile?.querySelector<HTMLElement>("[data-item-kind]");
      if (!tile || !icon)
        throw new Error(`Personnel equipment tile missing: ${slot}`);
      tile.classList.toggle("empty", item === null);
      icon.dataset.itemKind = itemKind(item);
    }

    const inventory = inspector.querySelector<HTMLElement>(
      '[data-field="inventory"]',
    );
    if (!inventory) throw new Error("Personnel inventory missing");
    const inventoryEntries = [
      ...person.inventory,
      ...Array.from(
        { length: Math.max(0, 6 - person.inventory.length) },
        () => null,
      ),
    ];
    inventory.replaceChildren(...inventoryEntries.map(createItemTile));

    const skills = inspector.querySelector<HTMLElement>(
      '[data-field="skills"]',
    );
    if (!skills) throw new Error("Personnel skills table missing");
    skills.replaceChildren(
      ...person.skills.map((skill) => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        const level = document.createElement("td");
        const xp = document.createElement("td");
        name.textContent = skill.id[0]?.toUpperCase() + skill.id.slice(1);
        level.textContent = skill.level.toString();
        xp.textContent = skill.xp.toString();
        row.append(name, level, xp);
        return row;
      }),
    );
  }
}
