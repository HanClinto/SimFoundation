import type { GameState } from "../../simulation/state";
import { OBJECT_DEFINITIONS } from "../../simulation/objects";
import { projectPsychology } from "../../simulation/personnel";
import { scheduleAt } from "../../simulation/routines";
import { sameTile } from "../../simulation/world";
import type { MapPerspective } from "./map-settings";

export type PawnCueIcon =
  | "meal"
  | "sleep"
  | "break"
  | "walk"
  | "tools"
  | "box"
  | "medical"
  | "research"
  | "guard"
  | "chat"
  | "wait"
  | "alert"
  | "happy"
  | "tense"
  | "sad"
  | "reserved";
export interface PawnCue {
  readonly icon: PawnCueIcon;
  readonly kind: "action" | "thought" | "speech" | "mood";
  readonly label: string;
}

export function pawnCues(
  state: GameState,
  personId: string,
  perspective: MapPerspective,
): readonly PawnCue[] {
  const person = state.personnel.find((person) => person.id === personId);
  const position = state.world.positions[personId];
  if (
    !person ||
    !position ||
    (perspective === "recorded" &&
      !state.observations.visibleEntityIds.includes(personId))
  )
    return [];
  const routine = state.routines.activities[personId];
  const station = state.routines.stations.find(
    (station) => station.id === routine?.stationId,
  );
  const job = state.jobs.find(
    (job) =>
      job.status === "in-progress" &&
      (job.assignedPersonId === personId ||
        job.assessment?.patientId === personId),
  );
  const blocked =
    perspective === "world"
      ? state.routines.blockedReasons[personId]
      : state.observations.entities[personId]?.blockedReason;
  let action: PawnCue;
  const carried = state.objects.items.find(
    (item) =>
      item.location.kind === "carried" && item.location.personId === personId,
  );
  if (routine?.kind === "meal" && carried?.kind === "meals") {
    action = {
      icon: "meal",
      kind: "action",
      label: "Carrying a meal to a seat",
    };
  } else if (routine) {
    const arrived = station && sameTile(position, station.position);
    const labels = {
      meal: "Eating",
      sleep: "Sleeping",
      break: "Taking a break",
    };
    action = {
      icon: routine.kind,
      kind: arrived ? "action" : "thought",
      label: arrived
        ? labels[routine.kind]
        : {
            meal: "Going to eat",
            sleep: "Going to bed",
            break: "Going for a break",
          }[routine.kind],
    };
  } else if (job) {
    const travelling = !sameTile(position, job.workSite);
    const icons = {
      engineering: "tools",
      logistics: "box",
      medical: "medical",
      research: "research",
      security: "guard",
    } as const;
    action = {
      icon: travelling
        ? job.requiredWorkerId === personId
          ? "box"
          : "walk"
        : icons[job.skillId],
      kind: "action",
      label: travelling
        ? `${carried ? `Carrying ${OBJECT_DEFINITIONS[carried.kind].name.toLowerCase()}` : job.requiredWorkerId === personId ? "Carrying materials" : "Travelling"}: ${job.title}`
        : job.assessment?.patientId === personId
          ? "Attending clinical appointment"
          : `Working: ${job.title}`,
    };
  } else if (
    state.scp999.status === "comforting" &&
    state.scp999.targetPersonId === personId &&
    (perspective === "world" ||
      state.observations.visibleEntityIds.includes("SCP-999"))
  ) {
    action = {
      icon: "chat",
      kind: "speech",
      label: "Social contact with SCP-999",
    };
  } else if (blocked) {
    action = { icon: "alert", kind: "thought", label: blocked };
  } else if (perspective === "world" && person.needs.satiety < 40) {
    action = { icon: "meal", kind: "thought", label: "Hungry" };
  } else if (perspective === "world" && person.needs.rest < 30) {
    action = { icon: "sleep", kind: "thought", label: "Tired" };
  } else {
    action = {
      icon: "wait",
      kind: "thought",
      label:
        scheduleAt(state, personId) === "work"
          ? "Available for work"
          : "Off duty",
    };
  }
  if (
    routine?.kind === "sleep" &&
    station &&
    sameTile(position, station.position)
  )
    return [action];
  const appearance =
    perspective === "world"
      ? projectPsychology(person).moodAppearance
      : state.observations.entities[personId]?.moodAppearance;
  const moodIcons: Record<string, PawnCueIcon> = {
    "Appears deeply distressed": "sad",
    "Appears unhappy": "sad",
    "Appears tense": "tense",
    "Appears content": "happy",
    "Appears upbeat": "happy",
    "Smiles during conversation": "happy",
    "Expression difficult to read": "reserved",
  };
  const mood = appearance ? moodIcons[appearance] : undefined;
  return mood
    ? [action, { icon: mood, kind: "mood", label: appearance! }]
    : [action];
}
