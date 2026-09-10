import type { OperationsContext } from "./travel";
import { button, element, fieldset, table } from "../desktop/dom";
import { healthStatus } from "../../../simulation/core/entity/pawn/Health";
import { firstAlarm, alarmPriority } from "../../../application/Alarms";
import { hasLivingStaff } from "../../../simulation/catalog/campaign/Campaign";

export function attentionView(context: OperationsContext): HTMLElement {
  const session = context.controller.session;
  const root = element("div");
  root.append(
    element("h3", "", "Response desk"),
    element(
      "p",
      "",
      "Current inspectable conditions, not diagnoses inferred from old history. All sites keep ticking; locate first, choose a worker, then issue physical response.",
    ),
  );
  const patients: (string | Node)[][] = [];
  for (const site of Object.values(session.state.sites)) {
    for (const person of Object.values(site.entities)) {
      if (
        person.kind !== "pawn" ||
        !person.health ||
        !(
          person.health.death ||
          person.health.incapacity ||
          person.health.bloodLoss > 0 ||
          person.health.wounds.some((wound) => wound.severity > 0)
        )
      )
        continue;
      patients.push([
        button(
          person.name,
          () => context.locate(site.id, person.id),
          `patient:${person.id}`,
        ),
        site.name,
        healthStatus(person),
        `Blood ${person.health.bloodLoss.toFixed(1)}, bleeding ${person.health.wounds.reduce((total, wound) => total + wound.bleeding, 0).toFixed(2)}/tick`,
      ]);
    }
  }
  root.append(
    table(
      ["Locate patient / body", "Site", "Condition", "Care needs"],
      patients,
    ),
  );
  const critical = session.events.filter((event) => alarmPriority(event) >= 0);
  const latest = firstAlarm([...critical].reverse());
  if (latest)
    root.append(
      element(
        "p",
        "blocked-reason",
        `Highest retained severity: ${latest.kind} at tick ${latest.tick}: ${latest.reason ?? latest.entityId}`,
      ),
    );
  const recovery = fieldset("Personnel recovery");
  recovery.append(
    element(
      "p",
      "",
      "Recovery uses surviving members of the starting roster and ordinary preparation, travel and physical work. There are no replacement personnel.",
    ),
  );
  const campaign = session.campaign;
  if (campaign && !hasLivingStaff(session.state, campaign))
    recovery.append(
      element(
        "strong",
        "blocked-reason",
        "No surviving campaign staff. You can inspect the remaining world or start a new campaign.",
      ),
    );
  root.append(recovery);
  return root;
}
