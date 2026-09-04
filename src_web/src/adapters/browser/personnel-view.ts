import {
  deriveMood,
  deriveSanity,
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

function metricMarkup(label: string, field: string): string {
  return `
    <div class="personnel-metric">
      <span>${label}</span>
      <div class="meter-shell"><span data-meter="${field}"></span></div>
      <strong data-value="${field}">0</strong>
    </div>
  `;
}

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
        <fieldset>
          <legend>Condition</legend>
          ${metricMarkup("Health", "health")}
          ${metricMarkup("Satiety", "satiety")}
          ${metricMarkup("Rest", "rest")}
          ${metricMarkup("Recreation", "recreation")}
          ${metricMarkup("Stress", "stress")}
          ${metricMarkup("Fear", "fear")}
        </fieldset>
        <div class="psychology-grid">
          <fieldset>
            <legend>Mood</legend>
            <strong class="derived-score" data-field="mood-score"></strong>
            <span class="derived-band" data-field="mood-band"></span>
            <ul data-field="mood-contributors"></ul>
          </fieldset>
          <fieldset>
            <legend>Sanity</legend>
            <strong class="derived-score" data-field="sanity-score"></strong>
            <span class="derived-band" data-field="sanity-band"></span>
            <ul data-field="sanity-contributors"></ul>
          </fieldset>
        </div>
        <fieldset>
          <legend>Traits and skills</legend>
          <p><strong>Traits:</strong> <span data-field="traits"></span></p>
          <table class="data-table compact-table">
            <thead><tr><th>Skill</th><th>Level</th></tr></thead>
            <tbody data-field="skills"></tbody>
          </table>
        </fieldset>
      </div>
      <div class="resize-grip" aria-hidden="true"></div>
    `;
    host.append(windowElement);
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

function setMetric(
  scope: HTMLElement,
  field: string,
  value: number,
  lowerIsBetter = false,
): void {
  const rounded = Math.round(value);
  const meter = scope.querySelector<HTMLElement>(`[data-meter="${field}"]`);
  if (!meter) throw new Error(`Personnel meter missing: ${field}`);
  meter.style.width = `${rounded}%`;
  meter.dataset.band = lowerIsBetter
    ? rounded > 70
      ? "critical"
      : rounded > 45
        ? "warning"
        : "normal"
    : rounded < 30
      ? "critical"
      : rounded < 55
        ? "warning"
        : "normal";
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
    const mood = deriveMood(person);
    const sanity = deriveSanity(person);
    for (const [cell, value] of [
      ["name", person.name],
      ["assignment", person.assignment],
      ["activity", person.activity],
      ["mood", `${mood.score}% ${mood.band}`],
      ["sanity", `${sanity.score}% ${sanity.band}`],
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
): void {
  for (const person of personnel) {
    const inspector = windows.find(
      ({ dataset }) => dataset.personId === person.id,
    );
    if (!inspector)
      throw new Error(`Personnel inspector missing: ${person.id}`);
    const mood = deriveMood(person);
    const sanity = deriveSanity(person);

    setText(inspector, "title", `${person.name} - Personnel Inspector`);
    setText(inspector, "initials", initials(person.name));
    setText(inspector, "name", person.name);
    setText(inspector, "assignment", person.assignment);
    setText(inspector, "clearance", person.clearance.toString());
    setText(inspector, "activity", person.activity);
    setText(inspector, "traits", person.traits.join(", "));
    setText(inspector, "mood-score", `${mood.score}%`);
    setText(inspector, "mood-band", mood.band);
    setText(inspector, "sanity-score", `${sanity.score}%`);
    setText(inspector, "sanity-band", sanity.band);
    setMetric(inspector, "health", person.health);
    setMetric(inspector, "satiety", person.needs.satiety);
    setMetric(inspector, "rest", person.needs.rest);
    setMetric(inspector, "recreation", person.needs.recreation);
    setMetric(inspector, "stress", person.stress, true);
    setMetric(inspector, "fear", person.fear, true);
    setContributors(inspector, "mood-contributors", mood.contributors);
    setContributors(inspector, "sanity-contributors", sanity.contributors);

    const skills = inspector.querySelector<HTMLElement>(
      '[data-field="skills"]',
    );
    if (!skills) throw new Error("Personnel skills table missing");
    skills.replaceChildren(
      ...person.skills.map((skill) => {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        const level = document.createElement("td");
        name.textContent = skill.id[0]?.toUpperCase() + skill.id.slice(1);
        level.textContent = skill.level.toString();
        row.append(name, level);
        return row;
      }),
    );
  }
}
