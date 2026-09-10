import type { OperationsContext } from "./travel";
import { button, element, fieldset, table } from "../desktop/dom";
import { entities } from "../../../simulation/catalog";

export function researchView(context: OperationsContext): HTMLElement {
  const root = element("div", "research-records");
  const session = context.controller.session;
  root.append(
    element("h3", "", "Research records"),
    element(
      "p",
      "",
      "Findings are earned through physical work. Authored source descriptions are reference material, not discoveries. Select a station on its map to assign an investigator.",
    ),
  );
  for (const site of Object.values(session.state.sites)) {
    const stations = Object.values(site.entities).filter(
      (entity) => entity.kind === "facility" && entity.study,
    );
    if (!stations.length) continue;
    const section = fieldset(site.name);
    for (const station of stations) {
      if (station.kind !== "facility" || !station.study) continue;
      const record = fieldset(station.name);
      record.append(
        button(
          "Inspect station & work",
          () => context.locate(site.id, station.id),
          `research:${station.id}`,
        ),
      );
      for (const plan of station.study!.plans) {
        const findings = station.study!.findings.filter(
          (finding) => finding.planId === plan.id,
        );
        record.append(element("h4", "", plan.title));
        record.append(
          element(
            "p",
            "",
            `${plan.ticks} work ticks${plan.perActor ? "; each worker must qualify personally" : ""}. Required physical sources:`,
          ),
        );
        record.append(
          table(
            ["Source", "Present at this site"],
            plan.requires.map((definitionId) => [
              entities[definitionId]?.name ?? definitionId,
              Object.values(site.entities)
                .filter((entity) => entity.definitionId === definitionId)
                .map((entity) => entity.name)
                .join(", ") || "Not present",
            ]),
          ),
        );
        if (!findings.length)
          record.append(
            element(
              "p",
              "",
              "No earned finding yet. Sources must be intact and physically accessible near the station; command preview reports the actual blocker.",
            ),
          );
        for (const finding of findings) {
          const paper = element("article", "finding");
          paper.append(
            element("h4", "", `Recorded at tick ${finding.tick}`),
            element("p", "", finding.text),
            element(
              "p",
              "",
              `Investigator: ${finding.actorId}; sources: ${finding.sourceIds.join(", ")}`,
            ),
          );
          record.append(paper);
        }
      }
      section.append(record);
    }
    root.append(section);
  }
  return root;
}
