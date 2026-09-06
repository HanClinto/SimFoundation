import {
  effectiveJobPriority,
  type SiteJob,
  type WorkPriority,
} from "../../simulation/jobs";
import type { PersonnelRecord } from "../../simulation/personnel";
import type { SiteWorld } from "../../simulation/world";

function titleCase(value: string): string {
  return value.replace(
    /(^|-)([a-z])/g,
    (_match, prefix, letter: string) =>
      `${prefix === "-" ? " " : ""}${letter.toUpperCase()}`,
  );
}

interface WorkOrderDesk {
  selectedId: string | null;
  refresh: () => void;
  setPriority?: (id: string, priority: WorkPriority | null) => void;
}

const desks = new WeakMap<HTMLElement, WorkOrderDesk>();

function prepareDesk(container: HTMLElement): WorkOrderDesk {
  const existing = desks.get(container);
  if (existing) return existing;
  const desk: WorkOrderDesk = { selectedId: null, refresh: () => {} };
  container.innerHTML = `<div class="order-toolbar"><label>View <select data-order-filter aria-label="Work order view"><option value="open">Open orders</option><option value="proposed">Awaiting authorization</option><option value="in-progress">Assigned work</option><option value="completed">Completed</option><option value="all">All orders</option></select></label><input type="search" data-order-search aria-label="Search work orders" placeholder="Search orders" /></div><div class="order-desk"><div class="order-ledger-scroll"><table class="order-ledger" aria-label="Work order ledger"><thead><tr><th>Work order</th><th>Priority</th><th>Status</th><th>Assigned</th></tr></thead><tbody data-order-rows></tbody></table><p data-order-empty hidden>No matching work orders.</p></div><div class="order-report" data-order-reports aria-label="Selected work order"></div></div><div class="order-register-status" data-order-count></div>`;
  container.addEventListener("change", (event) => {
    const control = (event.target as Element).closest<HTMLSelectElement>(
      "[data-job-priority]",
    );
    const id = control?.closest<HTMLElement>("[data-job-id]")?.dataset.jobId;
    if (control && id)
      desk.setPriority?.(
        id,
        control.value === "automatic" ? null : (control.value as WorkPriority),
      );
  });
  container
    .querySelector("[data-order-filter]")!
    .addEventListener("change", () => desk.refresh());
  container
    .querySelector("[data-order-search]")!
    .addEventListener("input", () => desk.refresh());
  container.addEventListener("click", (event) => {
    const row = (event.target as Element).closest<HTMLElement>(
      "[data-order-row]",
    );
    if (row) {
      desk.selectedId = row.dataset.orderRow!;
      desk.refresh();
    }
  });
  container.addEventListener("keydown", (event) => {
    const row = (event.target as Element).closest<HTMLElement>(
      "[data-order-row]",
    );
    if (!row) return;
    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-order-row]"),
    );
    const index = rows.indexOf(row);
    const next =
      event.key === "ArrowDown"
        ? rows[Math.min(rows.length - 1, index + 1)]
        : event.key === "ArrowUp"
          ? rows[Math.max(0, index - 1)]
          : event.key === "Enter" || event.key === " "
            ? row
            : null;
    if (next) {
      event.preventDefault();
      desk.selectedId = next.dataset.orderRow!;
      desk.refresh();
      next.focus();
    }
  });
  desks.set(container, desk);
  return desk;
}

export function updateWorkOrders(
  container: HTMLElement,
  jobs: readonly SiteJob[],
  personnel: readonly PersonnelRecord[],
  world: SiteWorld,
  setPriority?: (id: string, priority: WorkPriority | null) => void,
): void {
  const desk = prepareDesk(container);
  desk.setPriority = setPriority;
  desk.refresh = () =>
    updateWorkOrders(container, jobs, personnel, world, setPriority);
  const filter = container.querySelector<HTMLSelectElement>(
    "[data-order-filter]",
  )!.value;
  const search = container
    .querySelector<HTMLInputElement>("[data-order-search]")!
    .value.toLowerCase()
    .trim();
  const people = new Map(personnel.map((person) => [person.id, person]));
  const visible = jobs
    .filter(
      (job) =>
        (filter === "all" ||
          (filter === "open"
            ? job.status !== "completed"
            : job.status === filter)) &&
        `${job.title} ${job.skillId} ${people.get(job.assignedPersonId ?? "")?.name ?? ""}`
          .toLowerCase()
          .includes(search),
    )
    .sort(
      (first, second) =>
        effectiveJobPriority(second) - effectiveJobPriority(first) ||
        first.id.localeCompare(second.id),
    );
  if (!visible.some(({ id }) => id === desk.selectedId))
    desk.selectedId = visible[0]?.id ?? null;
  const reportList = container.querySelector<HTMLElement>(
    "[data-order-reports]",
  )!;
  const rows = container.querySelector<HTMLElement>("[data-order-rows]")!;
  const existingRows = new Map(
    Array.from(rows.children, (element) => [
      (element as HTMLElement).dataset.orderRow,
      element as HTMLElement,
    ]),
  );
  visible.forEach((job, index) => {
    const row = existingRows.get(job.id) ?? document.createElement("tr");
    if (!existingRows.has(job.id))
      row.innerHTML = "<td></td><td></td><td></td><td></td>";
    row.dataset.orderRow = job.id;
    row.tabIndex = desk.selectedId === job.id ? 0 : -1;
    row.setAttribute("aria-selected", String(desk.selectedId === job.id));
    row.children[0]!.textContent = job.title;
    row.children[1]!.textContent =
      job.priority >= 90
        ? `Emergency ${effectiveJobPriority(job)}`
        : `${titleCase(job.priorityOverride ?? "automatic")} ${effectiveJobPriority(job)}`;
    row.children[2]!.textContent = titleCase(job.status);
    row.children[3]!.textContent =
      people.get(job.assignedPersonId ?? "")?.name ?? "Unassigned";
    if (rows.children[index] !== row)
      rows.insertBefore(row, rows.children[index] ?? null);
    existingRows.delete(job.id);
  });
  for (const row of existingRows.values()) row.remove();
  container.querySelector<HTMLElement>("[data-order-empty]")!.hidden =
    visible.length !== 0;
  container.querySelector<HTMLElement>("[data-order-count]")!.textContent =
    `${visible.length} displayed / ${jobs.filter(({ status }) => status === "proposed").length} awaiting authorization / ${jobs.filter(({ status }) => status === "in-progress").length} assigned`;
  const existing = new Map(
    Array.from(reportList.children, (element) => [
      (element as HTMLElement).dataset.jobId,
      element as HTMLElement,
    ]),
  );
  jobs.forEach((job, index) => {
    const article = existing.get(job.id) ?? document.createElement("article");
    if (!existing.has(job.id)) {
      article.innerHTML = `<header><strong data-job-title></strong><span class="work-order-status"></span></header><p data-job-description></p><dl><div><dt>Skill</dt><dd data-job-skill></dd></div><div><dt>Location</dt><dd data-job-location></dd></div><div><dt>Assigned</dt><dd data-job-assigned></dd></div><div><dt>Activity</dt><dd data-job-activity></dd></div></dl><progress></progress><footer><span data-job-progress></span><button type="button" data-job-locate>Locate</button><button type="button" data-job-authorize>Authorize Work</button></footer><p class="assignment-reason"></p>`;
      const priorityRow = document.createElement("div");
      priorityRow.className = "field-row";
      priorityRow.innerHTML =
        '<label>Priority <select data-job-priority><option value="automatic">Automatic</option><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label><span data-priority-status></span>';
      article.querySelector("[data-job-description]")!.before(priorityRow);
    }
    article.className = `work-order work-order-${job.status}`;
    article.dataset.jobId = job.id;
    article.hidden = desk.selectedId !== job.id;
    const setText = (selector: string, value: string) => {
      const element = article.querySelector<HTMLElement>(selector)!;
      if (element.textContent !== value) element.textContent = value;
    };
    const assigned = job.assignedPersonId
      ? people.get(job.assignedPersonId)
      : null;
    const room = world.map.rooms.find(
      (room) =>
        job.workSite.x >= room.x &&
        job.workSite.x < room.x + room.width &&
        job.workSite.y >= room.y &&
        job.workSite.y < room.y + room.height,
    );
    setText("[data-job-title]", job.title);
    setText(".work-order-status", titleCase(job.status));
    setText("[data-job-description]", job.description);
    const priority = article.querySelector<HTMLSelectElement>(
      "[data-job-priority]",
    )!;
    priority.value = job.priorityOverride ?? "automatic";
    priority.disabled =
      !setPriority || job.status === "completed" || job.priority >= 90;
    priority.setAttribute("aria-label", `Priority for ${job.title}`);
    priority.title =
      job.priority >= 90
        ? "Automatic emergency priority cannot be lowered."
        : job.status === "completed"
          ? "Completed work cannot be reprioritized."
          : "Orders eligible work; existing assignments and cargo ownership are retained.";
    setText(
      "[data-priority-status]",
      `Effective ${effectiveJobPriority(job)} / automatic ${job.priority}`,
    );
    setText("[data-job-skill]", titleCase(job.skillId));
    setText("[data-job-location]", room?.name ?? "Exterior works");
    setText(
      "[data-job-assigned]",
      assigned?.name ??
        (job.status === "proposed" ? "Not authorized" : "Awaiting assignment"),
    );
    setText(
      "[data-job-activity]",
      job.status === "in-progress"
        ? (assigned?.activity ?? "Awaiting report")
        : titleCase(job.status),
    );
    setText("[data-job-progress]", `${job.progress} / ${job.requiredProgress}`);
    setText(".assignment-reason", job.assignmentReason ?? "");
    article.querySelector<HTMLElement>(".assignment-reason")!.hidden =
      !job.assignmentReason;
    const progress = article.querySelector("progress")!;
    progress.max = job.requiredProgress;
    progress.value = job.progress;
    progress.setAttribute(
      "aria-label",
      `${job.title} progress: ${job.progress} of ${job.requiredProgress}`,
    );
    const locate =
      article.querySelector<HTMLButtonElement>("[data-job-locate]")!;
    locate.dataset.locateJob = job.id;
    locate.setAttribute("aria-label", `Locate ${job.title}`);
    const authorize = article.querySelector<HTMLButtonElement>(
      "[data-job-authorize]",
    )!;
    authorize.dataset.authorizeJob = job.id;
    authorize.setAttribute("aria-label", `Authorize ${job.title}`);
    authorize.hidden = job.status !== "proposed";
    if (reportList.children[index] !== article)
      reportList.insertBefore(article, reportList.children[index] ?? null);
    existing.delete(job.id);
  });
  for (const article of existing.values()) article.remove();
}
