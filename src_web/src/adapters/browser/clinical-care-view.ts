import type {
  GameController,
  ControllerSnapshot,
} from "../../application/controller";
import {
  ASSESSMENT_LABELS,
  SURVEY_KINDS,
  SURVEY_INTERVAL_FIELDS,
  ASSESSMENT_REQUIREMENTS,
  clinicalQualificationReasons,
  lastClinicalReview,
  type SurveyKind,
  type ClinicalCarePolicy,
} from "../../simulation/clinical";
import { recordAge } from "./personnel-records";
import { createAssignmentView } from "./assignment-view";

export function createClinicalCareView(
  container: HTMLElement,
  controller: GameController,
) {
  const id = container.id || "occupational-health";
  container.innerHTML = `
    <header class="clinical-policy-heading"><h2>Occupational Health</h2><p>Staff surveys and duty coverage</p></header>
    <menu class="dossier-tabs clinical-tabs" role="tablist" aria-label="Occupational health sections">${["Surveys", "Assignments", "Records"].map((label, index) => `<button type="button" role="tab" id="${id}-tab-${index}" data-clinical-tab="${index}" aria-controls="${id}-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${label}</button>`).join("")}</menu>
    <section class="clinical-panel" id="${id}-panel-0" role="tabpanel" aria-labelledby="${id}-tab-0" data-clinical-panel="0">
      <fieldset><legend>Routine surveys</legend><div class="clinical-survey-policies">${SURVEY_KINDS.map((kind) => `<label>${ASSESSMENT_LABELS[kind]}<select data-survey-interval="${kind}" aria-label="${ASSESSMENT_LABELS[kind]} interval"><option value="0">Referrals only</option><option value="240">Every 4 hours</option><option value="480">Every 8 hours</option><option value="1440">Daily</option></select><small data-survey-coverage="${kind}"></small></label>`).join("")}</div></fieldset>
      <p class="clinical-coverage-status" data-clinical-coverage role="status"></p>
    </section>
    <section class="clinical-panel" id="${id}-panel-1" role="tabpanel" aria-labelledby="${id}-tab-1" data-clinical-panel="1" hidden>
      <label class="procedure-choice">Procedure <select data-clinical-procedure aria-label="Compare procedure eligibility">${SURVEY_KINDS.map((kind) => `<option value="${kind}">${ASSESSMENT_LABELS[kind]}</option>`).join("")}</select></label><div data-clinical-duty></div>
    </section>
    <section class="clinical-panel" id="${id}-panel-2" role="tabpanel" aria-labelledby="${id}-tab-2" data-clinical-panel="2" hidden>
      <div class="clinical-register-scroll"><table class="data-table" aria-label="Staff clinical reviews"><thead><tr><th>Staff member</th><th>Physical</th><th>Mood</th><th>Psychiatric</th><th>Anomalous</th><th>Appointments</th><th>Record</th></tr></thead><tbody data-clinical-staff></tbody></table></div>
    </section>`;
  const tabs = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-clinical-tab]"),
  );
  function selectTab(tab: HTMLButtonElement) {
    for (const candidate of tabs) {
      candidate.setAttribute("aria-selected", String(candidate === tab));
      candidate.tabIndex = candidate === tab ? 0 : -1;
    }
    for (const panel of container.querySelectorAll<HTMLElement>(
      "[data-clinical-panel]",
    ))
      panel.hidden = panel.dataset.clinicalPanel !== tab.dataset.clinicalTab;
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? tabs[(index + 1) % tabs.length]
          : event.key === "ArrowLeft"
            ? tabs[(index + tabs.length - 1) % tabs.length]
            : event.key === "Home"
              ? tabs[0]
              : event.key === "End"
                ? tabs.at(-1)
                : null;
      if (next) {
        event.preventDefault();
        selectTab(next);
        next.focus();
      }
    });
  });
  const duty = container.querySelector<HTMLElement>("[data-clinical-duty]")!;
  const initial = controller.getSnapshot();
  const procedure = container.querySelector<HTMLSelectElement>(
    "[data-clinical-procedure]",
  )!;
  let current = initial;
  const assignment = createAssignmentView(duty, {
    id: "clinical-duty",
    label: "Medical duty assignments",
    skillId: "medical",
    eligibility: (person) =>
      clinicalQualificationReasons(
        person,
        procedure.value as SurveyKind,
        current.game.capabilities.anomalousPsychometrics,
      ).join("; ") || "Qualified for procedure",
    onChange: (ids) =>
      controller.setClinicalCarePolicy({
        ...controller.getSnapshot().game.clinicalCare,
        clinicianIds: ids,
      }),
  });
  procedure.addEventListener("change", () => render(current));
  for (const kind of SURVEY_KINDS) {
    const select = container.querySelector<HTMLSelectElement>(
      `[data-survey-interval="${kind}"]`,
    )!;
    select.addEventListener("change", () =>
      controller.setClinicalCarePolicy({
        ...controller.getSnapshot().game.clinicalCare,
        [SURVEY_INTERVAL_FIELDS[kind]]: Number(
          select.value,
        ) as ClinicalCarePolicy["reviewInterval"],
      }),
    );
  }
  const table = container.querySelector<HTMLElement>("[data-clinical-staff]")!;
  for (const person of initial.game.personnel) {
    const row = document.createElement("tr");
    row.dataset.clinicalPerson = person.id;
    row.innerHTML = `<td data-clinical-name></td>${SURVEY_KINDS.map((kind) => `<td data-clinical-reviewed="${kind}"></td>`).join("")}<td data-clinical-appointment></td><td><button type="button" data-open-related-window="assessment-record-${person.id}">Assessments</button></td>`;
    row.querySelector("[data-clinical-name]")!.textContent = person.name;
    table.append(row);
  }
  function render(snapshot: ControllerSnapshot) {
    current = snapshot;
    const selectedStaff = snapshot.game.personnel.filter((person) =>
      snapshot.game.clinicalCare.clinicianIds.includes(person.id),
    );
    for (const kind of SURVEY_KINDS) {
      container.querySelector<HTMLSelectElement>(
        `[data-survey-interval="${kind}"]`,
      )!.value = String(
        snapshot.game.clinicalCare[SURVEY_INTERVAL_FIELDS[kind]] ?? 0,
      );
      const count = selectedStaff.filter(
        (person) =>
          clinicalQualificationReasons(
            person,
            kind,
            snapshot.game.capabilities.anomalousPsychometrics,
          ).length === 0,
      ).length;
      container.querySelector(`[data-survey-coverage="${kind}"]`)!.textContent =
        `Medical ${ASSESSMENT_REQUIREMENTS[kind].medicalLevel}+ / ${count} assigned and qualified${kind === "anomalous" && !snapshot.game.capabilities.anomalousPsychometrics ? " / Research unavailable" : ""}`;
    }
    assignment.render(
      snapshot.game.personnel,
      snapshot.game.jobs,
      snapshot.game.clinicalCare.clinicianIds,
    );
    const coverage = snapshot.game.clinicalCare.clinicianIds.length;
    container.querySelector("[data-clinical-coverage]")!.textContent =
      coverage === 0
        ? "No medical duty coverage. Referrals await a clinician."
        : coverage === 1
          ? "One staff member assigned. A second clinician with the procedure requirements is needed for their own evaluation."
          : `${coverage} staff assigned. Qualification does not guarantee current availability; patients cannot examine themselves.`;
    for (const person of snapshot.game.personnel) {
      const row = table.querySelector<HTMLElement>(
        `[data-clinical-person="${person.id}"]`,
      )!;
      for (const kind of SURVEY_KINDS) {
        const tick = lastClinicalReview(person, kind);
        row.querySelector(`[data-clinical-reviewed="${kind}"]`)!.textContent =
          tick !== undefined
            ? recordAge(snapshot.game.tick, tick)
            : "No review on record";
      }
      const appointments = snapshot.game.jobs.filter(
        (job) =>
          job.assessment?.patientId === person.id && job.status !== "completed",
      );
      row.querySelector("[data-clinical-appointment]")!.textContent =
        appointments.length
          ? appointments
              .map(
                (appointment) =>
                  `${ASSESSMENT_LABELS[appointment.assessment!.kind]} / ${snapshot.game.personnel.find(({ id }) => id === appointment.assignedPersonId)?.name ?? appointment.assignmentReason ?? "Queued"}`,
              )
              .join("; ")
          : "No pending referral";
    }
  }
  render(initial);
  return { render };
}
