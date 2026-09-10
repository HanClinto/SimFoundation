import type { ScenarioSession } from "./ScenarioSession";
import {
  executeCommand,
  previewCommand,
  type Command,
} from "../simulation/core/ControlPolicy";
import { materials } from "../simulation/catalog";
import {
  prepareTeam,
  departTeam,
} from "../simulation/catalog/campaign/Campaign";
import { admitToCare } from "../simulation/catalog/campaign/Care";
import { dispatchReserve } from "../simulation/catalog/campaign/Reserve";

export function commandSession(session: ScenarioSession, command: Command) {
  return executeCommand(session.state, command, materials);
}

export function previewSessionCommand(
  session: ScenarioSession,
  command: Command,
) {
  return previewCommand(session.state, command, materials);
}

export function travelSession(
  session: ScenarioSession,
  originId: string,
  destination: string,
  ids: readonly string[],
  operation: "prepare" | "depart",
): ScenarioSession {
  if (!session.campaign)
    throw new Error("Travel requires a home-site campaign.");
  const state =
    operation === "prepare"
      ? prepareTeam(
          session.state,
          session.campaign,
          originId,
          destination,
          ids,
          materials,
        )
      : departTeam(session.state, session.campaign, originId, destination, ids);
  return { ...session, state };
}

export function admitSession(
  session: ScenarioSession,
  personId: string,
  bedId: string,
): ScenarioSession {
  if (!session.campaign)
    throw new Error("Admission requires a home-site campaign.");
  return {
    ...session,
    ...admitToCare(session.state, session.campaign, personId, bedId, materials),
  };
}

export function reserveSession(
  session: ScenarioSession,
  destination: string,
  responder: string,
): ScenarioSession {
  if (!session.campaign)
    throw new Error("Reserve dispatch requires a home-site campaign.");
  return {
    ...session,
    ...dispatchReserve(session.state, session.campaign, destination, responder),
  };
}
