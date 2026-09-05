import type {
  GameController,
  ControllerSnapshot,
} from "../../application/controller";
import {
  ASSESSMENT_LABELS,
  type ClinicalCarePolicy,
} from "../../simulation/clinical";
import { recordAge } from "./personnel-records";

export function createClinicalCareView(
  container: HTMLElement,
  controller: GameController,
) {
  container.innerHTML = `<header class="clinical-policy-heading"><h2>Occupational Health</h2><p>Staff review and clinical coverage</p></header><fieldset><legend>Routine physical review</legend><label>Review interval <select data-clinical-interval aria-label="Routine physical review interval"><option value="0">Referrals only</option><option value="240">Every 4 hours</option><option value="480">Every 8 hours</option><option value="1440">Daily</option></select></label></fieldset><fieldset><legend>Medical duty</legend><div data-clinical-duty></div></fieldset><p class="clinical-coverage-status" data-clinical-coverage role="status"></p><div class="clinical-register-scroll"><table class="data-table" aria-label="Staff clinical reviews"><thead><tr><th>Staff member</th><th>Last physical review</th><th>Appointment</th><th>Record</th></tr></thead><tbody data-clinical-staff></tbody></table></div>`;
  const interval = container.querySelector<HTMLSelectElement>(
    "[data-clinical-interval]",
  )!;
  const duty = container.querySelector<HTMLElement>("[data-clinical-duty]")!;
  const initial = controller.getSnapshot();
  for (const person of initial.game.personnel.filter((person) =>
    person.skills.some((skill) => skill.id === "medical" && skill.level >= 3),
  )) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `clinical-duty-${person.id}`;
    checkbox.dataset.clinicalDuty = person.id;
    label.htmlFor = checkbox.id;
    label.append(document.createTextNode(person.name));
    const row = document.createElement("div");
    row.className = "field-row";
    row.append(checkbox, label);
    duty.append(row);
  }
  container.addEventListener("change", () => {
    controller.setClinicalCarePolicy({
      reviewInterval: Number(
        interval.value,
      ) as ClinicalCarePolicy["reviewInterval"],
      clinicianIds: Array.from(
        duty.querySelectorAll<HTMLInputElement>("input:checked"),
        (input) => input.dataset.clinicalDuty!,
      ),
    });
  });
  const table = container.querySelector<HTMLElement>("[data-clinical-staff]")!;
  for (const person of initial.game.personnel) {
    const row = document.createElement("tr");
    row.dataset.clinicalPerson = person.id;
    row.innerHTML = `<td data-clinical-name></td><td data-clinical-reviewed></td><td data-clinical-appointment></td><td><button type="button" data-open-related-window="medical-chart-${person.id}">Medical Chart</button></td>`;
    row.querySelector("[data-clinical-name]")!.textContent = person.name;
    table.append(row);
  }
  function render(snapshot: ControllerSnapshot) {
    interval.value = String(snapshot.game.clinicalCare.reviewInterval);
    for (const checkbox of duty.querySelectorAll<HTMLInputElement>(
      "[data-clinical-duty]",
    ))
      checkbox.checked = snapshot.game.clinicalCare.clinicianIds.includes(
        checkbox.dataset.clinicalDuty!,
      );
    const coverage = snapshot.game.clinicalCare.clinicianIds.length;
    container.querySelector("[data-clinical-coverage]")!.textContent =
      coverage === 0
        ? "No medical duty coverage. Referrals await a clinician."
        : coverage === 1
          ? "One clinician assigned. A second clinician is needed to examine the duty clinician."
          : `${coverage} clinicians assigned. Appointments depend on staff availability.`;
    for (const person of snapshot.game.personnel) {
      const row = table.querySelector<HTMLElement>(
        `[data-clinical-person="${person.id}"]`,
      )!;
      const assessment = person.physicalAssessments.at(-1);
      row.querySelector("[data-clinical-reviewed]")!.textContent = assessment
        ? recordAge(snapshot.game.tick, assessment.assessedTick)
        : "No examination on record";
      const appointment = snapshot.game.jobs.find(
        (job) =>
          job.assessment?.patientId === person.id && job.status !== "completed",
      );
      const clinician = snapshot.game.personnel.find(
        ({ id }) => id === appointment?.assignedPersonId,
      );
      row.querySelector("[data-clinical-appointment]")!.textContent =
        appointment?.assessment
          ? `${ASSESSMENT_LABELS[appointment.assessment.kind]} / ${clinician?.name ?? appointment.assignmentReason ?? "Queued"}`
          : "No pending referral";
    }
  }
  render(initial);
  return { render };
}
