import type {
  ControllerSnapshot,
  GameController,
} from "../../application/controller";
import { scheduleAt, type ScheduleBlock } from "../../simulation/routines";
import { pawnPortrait } from "./pawn-art";
import { observedSnapshot } from "./observed-view";
import { scheduleCoverage } from "./schedule-coverage";

export function createDayPlanner(
  container: HTMLElement,
  controller: GameController,
) {
  container.innerHTML = `<header class="clinical-policy-heading"><h2>Day Planner</h2><p data-routine-stock></p></header><div class="planner-toolbar"><label>Personnel <select data-planner-person aria-label="Plan personnel schedule"></select></label><div role="group" aria-label="Paint schedule"><button type="button" data-paint-block="work" aria-pressed="true">Work</button><button type="button" data-paint-block="free" aria-pressed="false">Free time</button><button type="button" data-paint-block="sleep" aria-pressed="false">Sleep</button></div><label>Preset <select data-planner-preset aria-label="Schedule preset"><option value="day">Day shift</option><option value="night">Night shift</option><option value="rest">Rest day</option></select></label><button type="button" data-apply-schedule>Replace selected schedule</button></div><p data-planner-feedback role="status"></p><div class="planner-person"><div class="pawn-identity"><img data-planner-portrait alt=""/><span data-planner-name></span></div><div><strong data-planner-activity></strong><p data-planner-exception role="status"></p></div></div><div class="hour-grid" role="group" aria-label="Hourly schedule"></div><details class="coverage-panel"><summary>Skill coverage / scheduled staff by hour</summary><p>Recorded skill level 1 or above. Shared staff count in each skill; this is not exclusive job allocation or guaranteed availability.</p><div class="coverage-scroll"><table class="data-table coverage-table" aria-label="Hourly skill coverage"></table></div></details><div class="planner-roster-scroll"><table class="data-table" aria-label="Daily routines"><thead><tr><th>Personnel</th><th>Scheduled</th><th>Current activity</th><th>Exception</th></tr></thead><tbody data-routine-roster></tbody></table></div>`;
  const people = container.querySelector<HTMLSelectElement>(
    "[data-planner-person]",
  )!;
  let block: ScheduleBlock = "work";
  for (const button of container.querySelectorAll<HTMLButtonElement>(
    "[data-paint-block]",
  ))
    button.addEventListener("click", () => {
      block = button.dataset.paintBlock as ScheduleBlock;
      for (const candidate of container.querySelectorAll("[data-paint-block]"))
        candidate.setAttribute("aria-pressed", String(candidate === button));
    });
  const preset = container.querySelector<HTMLSelectElement>(
    "[data-planner-preset]",
  )!;
  const hours = container.querySelector<HTMLElement>(".hour-grid")!;
  const body = container.querySelector<HTMLElement>("[data-routine-roster]")!;
  let current = controller.getSnapshot();
  for (const person of current.game.personnel) {
    people.append(new Option(person.name, person.id));
    const row = document.createElement("tr");
    row.dataset.routinePerson = person.id;
    row.innerHTML =
      "<td data-name></td><td data-schedule></td><td data-activity></td><td data-exception></td>";
    row.querySelector("[data-name]")!.textContent = person.name;
    body.append(row);
  }
  for (let hour = 0; hour < 24; hour += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.scheduleHour = String(hour);
    const paint = () => {
      const schedule = [...current.game.routines.schedules[people.value]!];
      schedule[hour] = block;
      render(controller.setPersonnelSchedule(people.value, schedule));
    };
    button.addEventListener("click", paint);
    button.addEventListener("pointerdown", (event) => {
      if (event.button === 0) {
        event.preventDefault();
        paint();
      }
    });
    button.addEventListener("pointerenter", (event) => {
      if (event.buttons === 1) paint();
    });
    hours.append(button);
  }
  people.addEventListener("change", () => render(current));
  preset.addEventListener("change", () => render(current));
  container
    .querySelector("[data-apply-schedule]")!
    .addEventListener("click", () => {
      const schedule = Array.from(
        { length: 24 },
        (_, hour): ScheduleBlock =>
          preset.value === "night"
            ? hour >= 22 || hour < 6
              ? "work"
              : hour >= 8 && hour < 16
                ? "sleep"
                : "free"
            : hour < 6 || hour >= 22
              ? "sleep"
              : preset.value === "rest"
                ? "free"
                : hour >= 8 && hour < 18
                  ? "work"
                  : "free",
      );
      render(controller.setPersonnelSchedule(people.value, schedule));
      container.querySelector("[data-planner-feedback]")!.textContent =
        `${people.selectedOptions[0]!.textContent}: ${preset.selectedOptions[0]!.textContent} applied to all 24 hours.`;
    });
  function render(snapshot: ControllerSnapshot) {
    snapshot = observedSnapshot(snapshot);
    current = snapshot;
    const person = snapshot.game.personnel.find(
      ({ id }) => id === people.value,
    )!;
    const labels = { work: "Work", free: "Free time", sleep: "Sleep" };
    container.querySelector<HTMLButtonElement>(
      "[data-apply-schedule]",
    )!.textContent =
      `Apply ${preset.selectedOptions[0]!.textContent} to ${person.name}`;
    container.querySelector("[data-routine-stock]")!.textContent =
      `Pantry: ${snapshot.game.routines.pantryMeals} meals / Store: ${snapshot.game.routines.reserveMeals} / Served: ${snapshot.game.routines.mealsConsumed}${snapshot.game.routines.supplyOrder ? " / Replenishment in progress" : ""}`;
    const portrait = container.querySelector<HTMLImageElement>(
      "[data-planner-portrait]",
    )!;
    const portraitUrl = pawnPortrait(person.id);
    if (portrait.src !== portraitUrl) portrait.src = portraitUrl;
    container.querySelector("[data-planner-name]")!.textContent = person.name;
    container.querySelector("[data-planner-activity]")!.textContent =
      person.activity;
    container.querySelector("[data-planner-exception]")!.textContent =
      snapshot.game.routines.blockedReasons[person.id] ?? "";
    for (const button of hours.querySelectorAll<HTMLButtonElement>("button")) {
      const hour = Number(button.dataset.scheduleHour);
      const scheduled = snapshot.game.routines.schedules[person.id]![hour]!;
      const label = `${String(hour).padStart(2, "0")}:00 ${labels[scheduled]}`;
      button.textContent = label;
      button.title = label;
      button.setAttribute("aria-label", `Set ${person.name} ${label}`);
      button.dataset.block = scheduled;
      button.setAttribute(
        "aria-current",
        String(Math.floor(snapshot.game.gameMinute / 60) % 24 === hour),
      );
    }
    for (const person of snapshot.game.personnel) {
      const row = body.querySelector<HTMLElement>(
        `[data-routine-person="${person.id}"]`,
      )!;
      row.querySelector("[data-schedule]")!.textContent =
        labels[scheduleAt(snapshot.game, person.id)];
      row.querySelector("[data-activity]")!.textContent = person.activity;
      row.querySelector("[data-exception]")!.textContent =
        snapshot.game.routines.blockedReasons[person.id] ?? "";
    }
    const coverage =
      container.querySelector<HTMLTableElement>(".coverage-table")!;
    const signature = JSON.stringify([
      snapshot.game.routines.schedules,
      snapshot.game.personnel.map(({ id, skills }) => [id, skills]),
    ]);
    if (coverage.dataset.signature !== signature) {
      coverage.replaceChildren();
      const header = document.createElement("tr");
      for (const label of [
        "Skill",
        ...Array.from({ length: 24 }, (_, hour) =>
          String(hour).padStart(2, "0"),
        ),
        "Staff-hours",
      ]) {
        const cell = document.createElement("th");
        cell.textContent = label;
        header.append(cell);
      }
      coverage.append(header);
      for (const row of scheduleCoverage(snapshot.game)) {
        const tableRow = document.createElement("tr");
        const heading = document.createElement("th");
        heading.textContent = row.skillId;
        tableRow.append(heading);
        row.hours.forEach((ids, hour) => {
          const cell = document.createElement("td");
          cell.textContent = String(ids.length);
          cell.dataset.coverage =
            ids.length === 0
              ? "none"
              : ids.length === 1
                ? "single"
                : "multiple";
          cell.title = `${String(hour).padStart(2, "0")}:00 / ${ids.map((id) => snapshot.game.personnel.find((person) => person.id === id)!.name).join(", ") || "No scheduled staff"}`;
          tableRow.append(cell);
        });
        const total = document.createElement("td");
        total.textContent = String(
          row.hours.reduce((sum, ids) => sum + ids.length, 0),
        );
        tableRow.append(total);
        coverage.append(tableRow);
      }
      coverage.dataset.signature = signature;
    }
  }
  render(current);
  return { render };
}
