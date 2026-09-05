import type { SiteJob } from "../../simulation/jobs";
import type { PersonnelRecord } from "../../simulation/personnel";
import type { SiteWorld } from "../../simulation/world";

function titleCase(value: string): string {
  return value.replace(
    /(^|-)([a-z])/g,
    (_match, prefix, letter: string) =>
      `${prefix === "-" ? " " : ""}${letter.toUpperCase()}`,
  );
}

export function updateWorkOrders(
  container: HTMLElement,
  jobs: readonly SiteJob[],
  personnel: readonly PersonnelRecord[],
  world: SiteWorld,
): void {
  const people = new Map(personnel.map((person) => [person.id, person]));
  const existing = new Map(
    Array.from(container.children, (element) => [
      (element as HTMLElement).dataset.jobId,
      element as HTMLElement,
    ]),
  );
  jobs.forEach((job, index) => {
    const article = existing.get(job.id) ?? document.createElement("article");
    if (!existing.has(job.id)) {
      article.innerHTML = `<header><strong data-job-title></strong><span class="work-order-status"></span></header><p data-job-description></p><dl><div><dt>Skill</dt><dd data-job-skill></dd></div><div><dt>Location</dt><dd data-job-location></dd></div><div><dt>Assigned</dt><dd data-job-assigned></dd></div><div><dt>Activity</dt><dd data-job-activity></dd></div></dl><progress></progress><footer><span data-job-progress></span><button type="button" data-job-locate>Locate</button><button type="button" data-job-authorize>Authorize Work</button></footer><p class="assignment-reason"></p>`;
    }
    article.className = `work-order work-order-${job.status}`;
    article.dataset.jobId = job.id;
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
    if (container.children[index] !== article)
      container.insertBefore(article, container.children[index] ?? null);
    existing.delete(job.id);
  });
  for (const article of existing.values()) article.remove();
}
