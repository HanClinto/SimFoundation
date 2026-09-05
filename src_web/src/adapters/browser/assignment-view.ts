import type {
  PersonnelRecord,
  PersonnelSkill,
} from "../../simulation/personnel";
import type { SiteJob } from "../../simulation/jobs";
import { pawnPortrait } from "./pawn-art";

export interface AssignmentViewOptions {
  readonly id: string;
  readonly label: string;
  readonly skillId: PersonnelSkill["id"];
  readonly eligibility: (person: PersonnelRecord) => string;
  readonly onChange: (ids: readonly string[]) => void;
}

export function createAssignmentView(
  container: HTMLElement,
  options: AssignmentViewOptions,
) {
  container.innerHTML = `<div class="assignment-toolbar"><input type="search" data-assignment-search aria-label="Search assignees" placeholder="Search personnel" /><label>Sort <select data-assignment-sort aria-label="Sort assignees"><option value="name">Name</option><option value="skill">Recorded skill</option><option value="availability">Current availability</option></select></label><output data-assignment-count></output></div><div class="assignment-scroll"><table class="data-table assignment-table"><thead><tr><th>Assigned</th><th>Personnel</th><th>Recorded skill</th><th>Current availability</th><th>Eligibility</th></tr></thead><tbody></tbody></table></div>`;
  container.querySelector("table")!.setAttribute("aria-label", options.label);
  const body = container.querySelector("tbody")!;
  const search = container.querySelector<HTMLInputElement>(
    "[data-assignment-search]",
  )!;
  const sort = container.querySelector<HTMLSelectElement>(
    "[data-assignment-sort]",
  )!;
  let people: readonly PersonnelRecord[] = [];
  let work: readonly SiteJob[] = [];
  let selection: readonly string[] = [];
  let otherCommitments: Readonly<Record<string, string>> = {};

  function render(
    personnel: readonly PersonnelRecord[],
    jobs: readonly SiteJob[],
    selectedIds: readonly string[],
    unavailable: Readonly<Record<string, string>> = {},
  ) {
    people = personnel;
    work = jobs;
    selection = selectedIds;
    otherCommitments = unavailable;
    const busy = (id: string) =>
      jobs.find(
        (job) =>
          job.status === "in-progress" &&
          (job.assignedPersonId === id || job.assessment?.patientId === id),
      );
    const level = (person: PersonnelRecord) =>
      person.skills.find(({ id }) => id === options.skillId)?.level ?? 0;
    const ordered = [...personnel].sort(
      (first, second) =>
        (sort.value === "skill"
          ? level(second) - level(first)
          : sort.value === "availability"
            ? Number(Boolean(busy(first.id) || unavailable[first.id])) -
              Number(Boolean(busy(second.id) || unavailable[second.id]))
            : 0) || first.name.localeCompare(second.name),
    );
    const rows = new Map(
      Array.from(body.children, (element) => [
        (element as HTMLElement).dataset.assignmentPerson,
        element as HTMLElement,
      ]),
    );
    ordered.forEach((person, index) => {
      let row = rows.get(person.id);
      if (!row) {
        row = document.createElement("tr");
        row.dataset.assignmentPerson = person.id;
        row.innerHTML =
          '<td><div class="field-row"><input type="checkbox" data-assignment-toggle /><label></label></div></td><td><div class="pawn-identity"><img data-assignment-portrait alt="" /><span data-assignment-name></span></div></td><td data-assignment-skill></td><td data-assignment-availability></td><td data-assignment-eligibility></td>';
        row.querySelector<HTMLImageElement>("[data-assignment-portrait]")!.src =
          pawnPortrait(person.id);
        const input = row.querySelector<HTMLInputElement>("input")!;
        input.id = `${options.id}-${person.id}`;
        input.dataset.assignmentToggle = person.id;
        const label = row.querySelector("label")!;
        label.htmlFor = input.id;
        label.textContent = "Assign";
        input.setAttribute("aria-label", `Assign ${person.name}`);
      }
      row.hidden = !`${person.name} ${person.assignment}`
        .toLowerCase()
        .includes(search.value.toLowerCase().trim());
      row.querySelector<HTMLInputElement>("input")!.checked =
        selectedIds.includes(person.id);
      row.querySelector("[data-assignment-name]")!.textContent = person.name;
      row.querySelector("[data-assignment-skill]")!.textContent =
        level(person) > 0
          ? `${options.skillId[0]!.toUpperCase()}${options.skillId.slice(1)} ${level(person)}`
          : "Untrained / no level recorded";
      const job = busy(person.id);
      row.querySelector("[data-assignment-availability]")!.textContent = job
        ? job.assessment?.patientId === person.id
          ? "Attending appointment (patient)"
          : job.title
        : (unavailable[person.id] ?? "Available for assignment");
      row.querySelector("[data-assignment-eligibility]")!.textContent =
        options.eligibility(person);
      if (body.children[index] !== row)
        body.insertBefore(row, body.children[index] ?? null);
      rows.delete(person.id);
    });
    for (const row of rows.values()) row.remove();
    container.querySelector("[data-assignment-count]")!.textContent =
      `${selectedIds.length} assigned / ${personnel.filter((person) => selectedIds.includes(person.id) && !busy(person.id) && !unavailable[person.id]).length} currently free`;
  }
  search.addEventListener("input", () =>
    render(people, work, selection, otherCommitments),
  );
  sort.addEventListener("change", () =>
    render(people, work, selection, otherCommitments),
  );
  body.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    const id = input.dataset.assignmentToggle;
    if (!id) return;
    options.onChange(
      input.checked
        ? [...selection.filter((entry) => entry !== id), id]
        : selection.filter((entry) => entry !== id),
    );
  });
  return { render };
}
