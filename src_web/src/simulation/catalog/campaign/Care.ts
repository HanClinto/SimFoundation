import type { Simulation } from "../../core/Simulation";
import type { Materials } from "../../core/material/Material";
import { distance, positionOf } from "../../core/site/TileMap";
import { executeCommand } from "../../core/ControlPolicy";
import type { Campaign } from "./Campaign";

export function admitToCare(
  state: Simulation,
  campaign: Campaign,
  personId: string,
  bedId: string,
  materials: Materials,
): { state: Simulation; campaign: Campaign } {
  const site = state.sites[campaign.homeId]!;
  const person = site.entities[personId];
  const bed = site.entities[bedId];
  if (
    person?.kind !== "pawn" ||
    !person.acceptsEscort ||
    person.location.kind !== "ground" ||
    !person.canAct ||
    person.queue.length
  )
    throw new Error(
      "Bring an available cooperative person home and finish their escort first.",
    );
  if (!person.needs.fatigue)
    throw new Error(
      "This subject has no ordinary rest need; home-bed admission is not applicable.",
    );
  if (
    bed?.kind !== "facility" ||
    !bed.activities.sleep ||
    bed.location.kind !== "ground" ||
    distance(positionOf(site, person.id)!, bed.location.position) > 1
  )
    throw new Error("Escort the person to within one tile of a home bed.");
  if (person.health?.wounds.some((wound) => wound.bleeding > 0))
    throw new Error(
      "Stabilize active bleeding before admitting to ordinary rest.",
    );
  if (campaign.admissions[personId])
    throw new Error("This person already has a home admission record.");
  const result = executeCommand(
    state,
    {
      kind: "enqueue",
      siteId: site.id,
      entityId: personId,
      action: { kind: "sleep", targetId: bedId, workTicks: 0 },
    },
    materials,
    { source: "script" },
  );
  if (result.code === "rejected") throw new Error(result.reason!);
  const enabled = executeCommand(
    result.state,
    { kind: "autonomy", siteId: site.id, entityId: personId, enabled: true },
    materials,
    { source: "script" },
  );
  return {
    state: enabled.state,
    campaign: {
      ...campaign,
      admissions: {
        ...campaign.admissions,
        [personId]: { tick: state.tick, bedId },
      },
    },
  };
}
