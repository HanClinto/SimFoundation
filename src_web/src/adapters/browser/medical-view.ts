import {
  latestPhysicalAssessment,
  projectTraits,
  type BodyRegion,
  type PersonnelRecord,
} from "../../simulation/personnel";

const BODY_REGIONS: readonly [BodyRegion, string][] = [
  ["head", "Head"],
  ["torso", "Torso"],
  ["leftArm", "Left arm"],
  ["rightArm", "Right arm"],
  ["leftHand", "Left hand"],
  ["rightHand", "Right hand"],
  ["leftLeg", "Left leg"],
  ["rightLeg", "Right leg"],
  ["leftFoot", "Left foot"],
  ["rightFoot", "Right foot"],
];

export interface PersonnelMedicalWindows {
  readonly medicalCharts: readonly HTMLElement[];
  readonly assessmentRecords: readonly HTMLElement[];
}

function createWindow(
  id: string,
  person: PersonnelRecord,
  kind: "medical" | "assessments",
  body: string,
): HTMLElement {
  const windowElement = document.createElement("section");
  windowElement.id = id;
  windowElement.className = `window managed-window ${kind}-window`;
  windowElement.dataset.personId = person.id;
  windowElement.dataset.personnelWindowKind = kind;
  windowElement.setAttribute(
    "aria-label",
    `${person.name} ${kind === "medical" ? "medical chart" : "assessment record"}`,
  );
  windowElement.hidden = true;
  windowElement.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-text">${person.name} - ${kind === "medical" ? "Medical Chart" : "Assessment Record"}</div>
      <div class="title-bar-controls"><button type="button" aria-label="Close" data-window-close></button></div>
    </div>
    <div class="window-body ${kind}-body">${body}</div>
    <div class="resize-grip" aria-hidden="true"></div>
  `;
  return windowElement;
}

function medicalChartMarkup(person: PersonnelRecord): string {
  return `
    <header class="medical-summary">
      <div>
        <strong data-medical-field="physical-summary">No current assessment</strong>
        <small data-medical-field="assessment-meta">Physical condition unassessed</small>
      </div>
      <button type="button" data-assess-person-id="${person.id}">Schedule Examination</button>
    </header>
    <div class="medical-workspace">
      <section class="body-chart-pane" aria-label="Assessed body regions">
        <div class="body-map-toolbar">
          <strong>Body map</strong>
          <button type="button" class="body-filter selected" data-body-filter="all" aria-pressed="true">All</button>
        </div>
        <div class="body-map" data-medical-field="body-map">
          ${BODY_REGIONS.map(
            ([region, label]) =>
              `<button type="button" class="body-region body-region-${region}" data-body-region="${region}" title="${label}: unassessed"><span>${label}</span></button>`,
          ).join("")}
        </div>
        <div class="medical-legend" aria-label="Body map legend">
          <span><i class="legend-unassessed"></i>Unassessed</span>
          <span><i class="legend-observed"></i>Observed sign</span>
          <span><i class="legend-clear"></i>No finding</span>
          <span><i class="legend-suspected"></i>Suspected</span>
          <span><i class="legend-confirmed"></i>Confirmed</span>
        </div>
      </section>
      <section class="medical-findings-pane">
        <h3>Physical findings</h3>
        <div class="medical-findings" data-medical-field="findings"></div>
      </section>
    </div>
  `;
}

function assessmentRecordMarkup(person: PersonnelRecord): string {
  return `
    <header class="record-heading">
      <div><strong>Assessment history</strong><span>Newest first</span></div>
      <button type="button" data-assess-traits-person-id="${person.id}" disabled>Run Anomalous Screening</button>
    </header>
    <div class="assessment-history" data-assessment-field="history"></div>
  `;
}

export function createPersonnelMedicalWindows(
  host: HTMLElement,
  personnel: readonly PersonnelRecord[],
): PersonnelMedicalWindows {
  const medicalCharts: HTMLElement[] = [];
  const assessmentRecords: HTMLElement[] = [];

  for (const person of personnel) {
    const medicalChart = createWindow(
      `medical-chart-${person.id}`,
      person,
      "medical",
      medicalChartMarkup(person),
    );
    const assessmentRecord = createWindow(
      `assessment-record-${person.id}`,
      person,
      "assessments",
      assessmentRecordMarkup(person),
    );
    host.append(medicalChart, assessmentRecord);
    medicalCharts.push(medicalChart);
    assessmentRecords.push(assessmentRecord);

    medicalChart.addEventListener("click", (event) => {
      const filter = (event.target as Element).closest<HTMLButtonElement>(
        "[data-body-filter], [data-body-region]",
      );
      if (!filter) return;
      const region = filter.dataset.bodyRegion ?? "all";
      for (const button of medicalChart.querySelectorAll<HTMLButtonElement>(
        "[data-body-filter], [data-body-region]",
      )) {
        const selected =
          region === "all"
            ? button.dataset.bodyFilter === "all"
            : button.dataset.bodyRegion === region;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
      for (const finding of medicalChart.querySelectorAll<HTMLElement>(
        "[data-finding-regions]",
      )) {
        const regions = finding.dataset.findingRegions?.split(" ") ?? [];
        finding.hidden = region !== "all" && !regions.includes(region);
      }
    });
  }

  const windows = { medicalCharts, assessmentRecords };
  updatePersonnelMedicalWindows(windows, personnel, 0, false);
  return windows;
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "high confidence";
  if (confidence >= 0.6) return "moderate confidence";
  return "low confidence";
}

function assessmentAge(currentTick: number, assessedTick: number): string {
  const minutes = Math.max(0, currentTick - assessedTick);
  if (minutes === 0) return "just now";
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}

function textElement<TagName extends keyof HTMLElementTagNameMap>(
  tagName: TagName,
  text: string,
): HTMLElementTagNameMap[TagName] {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
}

function updateMedicalChart(
  chart: HTMLElement,
  person: PersonnelRecord,
  currentTick: number,
): void {
  const assessment = latestPhysicalAssessment(person);
  const summary = chart.querySelector<HTMLElement>(
    '[data-medical-field="physical-summary"]',
  );
  const meta = chart.querySelector<HTMLElement>(
    '[data-medical-field="assessment-meta"]',
  );
  const findings = chart.querySelector<HTMLElement>(
    '[data-medical-field="findings"]',
  );
  if (!summary || !meta || !findings)
    throw new Error("Medical chart incomplete");

  summary.textContent = assessment
    ? `Physical ${assessment.estimate.minimum}-${assessment.estimate.maximum}`
    : "No current assessment";
  meta.textContent = assessment
    ? `${assessment.method} / ${confidenceLabel(assessment.confidence)} / ${assessmentAge(currentTick, assessment.assessedTick)}`
    : person.physicalObservations.length > 0
      ? "Observable signs present; severity not assessed"
      : "Unknown is not equivalent to healthy";

  const conclusions = assessment?.conclusions ?? [];
  const observationItems = person.physicalObservations.map((observation) => {
    const item = document.createElement("article");
    item.className = "medical-finding finding-observed";
    item.dataset.findingRegions = observation.bodyRegions.join(" ");
    item.append(
      textElement("strong", observation.label),
      textElement(
        "span",
        `observed / ${observation.source} / ${assessmentAge(currentTick, observation.observedTick)}`,
      ),
      textElement(
        "small",
        observation.bodyRegions
          .map(
            (region) =>
              BODY_REGIONS.find(([id]) => id === region)?.[1] ?? region,
          )
          .join(", "),
      ),
    );
    return item;
  });
  const conclusionItems = conclusions.map((conclusion) => {
    const item = document.createElement("article");
    item.className = `medical-finding finding-${conclusion.status}`;
    item.dataset.findingRegions = conclusion.bodyRegions.join(" ");
    item.append(
      textElement("strong", conclusion.label),
      textElement(
        "span",
        `${conclusion.status} / ${confidenceLabel(conclusion.confidence)}`,
      ),
      textElement(
        "small",
        conclusion.bodyRegions
          .map(
            (region) =>
              BODY_REGIONS.find(([id]) => id === region)?.[1] ?? region,
          )
          .join(", "),
      ),
    );
    return item;
  });
  findings.replaceChildren(
    ...(conclusionItems.length > 0 || observationItems.length > 0
      ? [...conclusionItems, ...observationItems]
      : assessment
        ? [
            Object.assign(document.createElement("p"), {
              className: "empty-record",
              textContent: "No physical findings reported by this examination.",
            }),
          ]
        : [
            Object.assign(document.createElement("p"), {
              className: "empty-record",
              textContent:
                "No suitable physical examination is on record. Body regions remain unassessed.",
            }),
          ]),
  );

  for (const regionElement of chart.querySelectorAll<HTMLElement>(
    "[data-body-region]",
  )) {
    const region = regionElement.dataset.bodyRegion as BodyRegion;
    const regionConclusion = conclusions.find((conclusion) =>
      conclusion.bodyRegions.includes(region),
    );
    const regionObservation = person.physicalObservations.find((observation) =>
      observation.bodyRegions.includes(region),
    );
    const state = regionConclusion
      ? regionConclusion.status
      : assessment
        ? "clear"
        : regionObservation
          ? "observed"
          : "unassessed";
    const label = BODY_REGIONS.find(([id]) => id === region)?.[1] ?? region;
    regionElement.dataset.assessmentState = state;
    regionElement.title = `${label}: ${state}`;
    regionElement.setAttribute("aria-label", `${label}: ${state}`);
  }
}

function updateAssessmentRecord(
  record: HTMLElement,
  person: PersonnelRecord,
  currentTick: number,
): void {
  const history = record.querySelector<HTMLElement>(
    '[data-assessment-field="history"]',
  );
  if (!history) throw new Error("Assessment record incomplete");

  const observationEntries = person.physicalObservations.map((observation) => {
    const entry = document.createElement("article");
    entry.className = "assessment-entry observation-entry";
    const header = document.createElement("header");
    header.append(
      textElement("strong", "Direct observation"),
      textElement(
        "time",
        `Tick ${observation.observedTick} / ${assessmentAge(currentTick, observation.observedTick)}`,
      ),
    );
    const details = document.createElement("dl");
    const source = document.createElement("div");
    source.append(
      textElement("dt", "Source"),
      textElement("dd", observation.source),
    );
    details.append(source);
    entry.append(header, details, textElement("p", observation.label));
    return {
      tick: observation.observedTick,
      sequence: observation.recordedOrder,
      entry,
    };
  });
  const assessmentEntries = person.physicalAssessments.map((assessment) => {
    const entry = document.createElement("article");
    entry.className = "assessment-entry";
    const findingText =
      assessment.conclusions.length > 0
        ? assessment.conclusions
            .map((conclusion) => `${conclusion.label} (${conclusion.status})`)
            .join("; ")
        : "No physical findings reported";
    const header = document.createElement("header");
    header.append(
      textElement("strong", assessment.method),
      textElement(
        "time",
        `Tick ${assessment.assessedTick} / ${assessmentAge(currentTick, assessment.assessedTick)}`,
      ),
    );
    const details = document.createElement("dl");
    for (const [term, value] of [
      ["Assessor", assessment.assessor],
      ["Confidence", `${Math.round(assessment.confidence * 100)}%`],
      [
        "Estimate",
        `Physical ${assessment.estimate.minimum}-${assessment.estimate.maximum}`,
      ],
    ] as const) {
      const row = document.createElement("div");
      row.append(textElement("dt", term), textElement("dd", value));
      details.append(row);
    }
    entry.append(header, details, textElement("p", findingText));
    return {
      tick: assessment.assessedTick,
      sequence: assessment.recordedOrder,
      entry,
    };
  });
  const traitEvidenceEntries = person.traitEvidence.map((evidence) => {
    const entry = document.createElement("article");
    entry.className = "assessment-entry observation-entry";
    const header = document.createElement("header");
    header.append(
      textElement("strong", "Behavioral evidence"),
      textElement(
        "time",
        `Tick ${evidence.observedTick} / ${assessmentAge(currentTick, evidence.observedTick)}`,
      ),
    );
    const details = document.createElement("dl");
    const source = document.createElement("div");
    source.append(
      textElement("dt", "Source"),
      textElement("dd", evidence.source),
    );
    details.append(source);
    entry.append(header, details, textElement("p", evidence.label));
    return {
      tick: evidence.observedTick,
      sequence: evidence.recordedOrder,
      entry,
    };
  });
  const traitAssessmentEntries = person.traitAssessments.map((assessment) => {
    const entry = document.createElement("article");
    entry.className = "assessment-entry trait-assessment-entry";
    const header = document.createElement("header");
    header.append(
      textElement("strong", assessment.method),
      textElement(
        "time",
        `Tick ${assessment.assessedTick} / ${assessmentAge(currentTick, assessment.assessedTick)}`,
      ),
    );
    const details = document.createElement("dl");
    const protocol = document.createElement("div");
    protocol.append(
      textElement("dt", "Protocol"),
      textElement("dd", `Version ${assessment.protocolVersion}`),
    );
    details.append(protocol);
    const conclusions = assessment.conclusions
      .map(
        (conclusion) =>
          `${conclusion.label} (${conclusion.status}, ${Math.round(conclusion.confidence * 100)}%)`,
      )
      .join("; ");
    entry.append(header, details, textElement("p", conclusions));
    return {
      tick: assessment.assessedTick,
      sequence: assessment.recordedOrder,
      entry,
    };
  });
  const recordEntries = [
    ...assessmentEntries,
    ...observationEntries,
    ...traitEvidenceEntries,
    ...traitAssessmentEntries,
  ]
    .sort(
      (first, second) =>
        second.tick - first.tick || second.sequence - first.sequence,
    )
    .map(({ entry }) => entry);
  history.replaceChildren(
    ...(recordEntries.length > 0
      ? recordEntries
      : [
          Object.assign(document.createElement("p"), {
            className: "empty-record",
            textContent:
              "No physical observations or assessments are on record.",
          }),
        ]),
  );
}

export function updatePersonnelMedicalWindows(
  windows: PersonnelMedicalWindows,
  personnel: readonly PersonnelRecord[],
  currentTick: number,
  anomalousPsychometricsUnlocked: boolean,
): void {
  for (const person of personnel) {
    const chart = windows.medicalCharts.find(
      ({ dataset }) => dataset.personId === person.id,
    );
    const record = windows.assessmentRecords.find(
      ({ dataset }) => dataset.personId === person.id,
    );
    if (!chart || !record)
      throw new Error(`Medical windows missing: ${person.id}`);
    updateMedicalChart(chart, person, currentTick);
    updateAssessmentRecord(record, person, currentTick);
    const screeningButton = record.querySelector<HTMLButtonElement>(
      "[data-assess-traits-person-id]",
    );
    if (screeningButton) {
      const projectedTraits = projectTraits(person);
      const supportedHiddenTraits = Object.entries(person.traits).filter(
        ([traitId, trait]) =>
          !trait.disclosed &&
          trait.tags.includes("anomalous") &&
          person.traitEvidence.some(
            ({ supportsTraitId }) => supportsTraitId === traitId,
          ),
      );
      const screeningComplete =
        supportedHiddenTraits.length > 0 &&
        supportedHiddenTraits.every(([traitId]) =>
          projectedTraits.some(
            (projection) =>
              projection.traitId === traitId &&
              projection.status === "confirmed",
          ),
        );
      screeningButton.disabled =
        !anomalousPsychometricsUnlocked ||
        supportedHiddenTraits.length === 0 ||
        screeningComplete;
      screeningButton.textContent = screeningComplete
        ? "Screening Complete"
        : "Run Anomalous Screening";
      screeningButton.title = !anomalousPsychometricsUnlocked
        ? "Requires Anomalous Psychometrics research"
        : supportedHiddenTraits.length === 0
          ? "No qualifying anomalous evidence"
          : screeningComplete
            ? "Supported anomalous Traits are confirmed"
            : "Run targeted anomalous psychometrics";
    }
  }
}
