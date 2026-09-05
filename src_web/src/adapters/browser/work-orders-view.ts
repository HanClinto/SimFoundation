import type { SiteJob } from "../../simulation/jobs";
import type { PersonnelRecord } from "../../simulation/personnel";

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
): void {
  const people = new Map(personnel.map((person) => [person.id, person]));
  container.replaceChildren(
    ...jobs.map((job) => {
      const article = document.createElement("article");
      article.className = `work-order work-order-${job.status}`;
      article.dataset.jobId = job.id;

      const header = document.createElement("header");
      const title = document.createElement("strong");
      title.textContent = job.title;
      const status = document.createElement("span");
      status.className = "work-order-status";
      status.textContent = titleCase(job.status);
      header.append(title, status);

      const description = document.createElement("p");
      description.textContent = job.description;

      const details = document.createElement("dl");
      const assignedPerson = job.assignedPersonId
        ? people.get(job.assignedPersonId)
        : null;
      const unassignedLabel =
        job.status === "proposed" ? "Not authorized" : "Awaiting assignment";
      for (const [term, value] of [
        ["Skill", titleCase(job.skillId)],
        ["Assigned", assignedPerson?.name ?? unassignedLabel],
        [
          "Activity",
          job.status === "in-progress"
            ? (assignedPerson?.activity ?? "Awaiting report")
            : titleCase(job.status),
        ],
      ] as const) {
        const row = document.createElement("div");
        const key = document.createElement("dt");
        const result = document.createElement("dd");
        key.textContent = term;
        result.textContent = value;
        row.append(key, result);
        details.append(row);
      }

      const progress = document.createElement("progress");
      progress.max = job.requiredProgress;
      progress.value = job.progress;
      progress.setAttribute(
        "aria-label",
        `${job.title} progress: ${job.progress} of ${job.requiredProgress}`,
      );

      const footer = document.createElement("footer");
      const progressLabel = document.createElement("span");
      progressLabel.textContent = `${job.progress} / ${job.requiredProgress}`;
      footer.append(progressLabel);
      if (job.status === "proposed") {
        const authorize = document.createElement("button");
        authorize.type = "button";
        authorize.dataset.authorizeJob = job.id;
        authorize.textContent = "Authorize Work";
        authorize.setAttribute("aria-label", `Authorize ${job.title}`);
        footer.append(authorize);
      }

      article.append(header, description, details, progress, footer);
      if (job.assignmentReason) {
        const reason = document.createElement("p");
        reason.className = "assignment-reason";
        reason.textContent = job.assignmentReason;
        article.append(reason);
      }
      return article;
    }),
  );
}
