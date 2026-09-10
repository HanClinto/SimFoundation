import type { OperationsContext } from "./travel";
import { button, element, fieldset, table } from "../desktop/dom";
import { healthStatus } from "../../../simulation/core/entity/pawn/Health";
import { firstAlarm, alarmPriority } from "../../../application/Alarms";

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
  const reserves = fieldset("Finite reserve recovery");
  reserves.append(
    element(
      "p",
      "",
      "Devon and Riley already exist at the reserve station. Dispatch uses each actual person once; it never resurrects staff or recovers equipment for you.",
    ),
  );
  const campaign = session.campaign;
  if (campaign) {
    const key = Object.keys(campaign.siteIds).find(
      (key) => campaign.siteIds[key] === context.siteId,
    );
    for (const name of ["devon", "riley"]) {
      const person =
        session.state.sites[campaign.siteIds.reserve!]?.entities[
          `${campaign.siteIds.reserve}:${name}`
        ];
      const dispatch = button(`Dispatch ${name} to inspected site`, () =>
        context.act(
          () => context.controller.reserve(key ?? "", name),
          `Reserve ${name} dispatched; use Travel to inspect and wait for the actual transfer.`,
        ),
      );
      dispatch.disabled = !person;
      dispatch.title = person
        ? `Destination: ${session.state.sites[context.siteId]?.name}. Arrival in 12 ticks; revalidated on dispatch.`
        : "This existing reserve has already left the station.";
      reserves.append(dispatch);
    }
  }
  root.append(reserves);
  return root;
}
