import type { Simulation, TickEvent } from "../simulation/core/Simulation";
import {
  advanceSimulation,
  createSimulation,
  SIMULATION_VERSION,
} from "../simulation/core/Simulation";
import {
  instantiateSite,
  type SiteTemplate,
} from "../simulation/core/site/Site";
import {
  startQuest,
  evaluateQuest,
  type Quest,
  type QuestState,
} from "../simulation/core/quest/Quest";
import { entities, materials } from "../simulation/catalog";
import sightSite from "../simulation/catalog/sites/tests/SightAndPassage.json";
import { responseScenario } from "../simulation/catalog/quests/response/setup";
import { dailyScenario } from "../simulation/catalog/quests/daily/setup";
import { colonyScenario } from "../simulation/catalog/quests/colony/setup";
import { consumptionScenario } from "../simulation/catalog/quests/consumption/setup";
import { scp1867Scenario } from "../simulation/catalog/quests/scp1867/setup";
import { scp1370Scenario } from "../simulation/catalog/quests/scp1370/setup";
import {
  deployPawn,
  type Deployment,
} from "../simulation/core/site/Deployment";
import {
  createCampaign,
  type Campaign,
} from "../simulation/catalog/campaign/Campaign";

export const scenarios: Readonly<
  Record<
    string,
    {
      site: SiteTemplate;
      quest?: Quest;
      deployment?: Deployment;
      bindings?: Readonly<Record<string, string>>;
    }
  >
> = {
  response: responseScenario,
  daily: dailyScenario,
  sight: { site: sightSite as SiteTemplate },
  colony: colonyScenario,
  consumption: consumptionScenario,
  scp1867: scp1867Scenario,
  scp1370: scp1370Scenario,
};

export interface ScenarioSession {
  version: 6;
  campaign: Campaign | null;
  phase: "setup" | "running";
  teamIds: string[];
  bindings: Record<string, string>;
  labels: Record<string, string>;
  nextPawnLabel: number;
  nextObjectLabel: number;
  simulationVersion: typeof SIMULATION_VERSION;
  scenario: string;
  state: Simulation;
  quest: QuestState | null;
  events: TickEvent[];
}

export function loadScenario(name: string): ScenarioSession {
  if (name === "campaign") {
    const { state, campaign } = createCampaign(entities);
    return labelEntities({
      version: 6,
      campaign,
      phase: "running",
      teamIds: [],
      bindings: {},
      labels: {},
      nextPawnLabel: 1,
      nextObjectLabel: 1,
      simulationVersion: SIMULATION_VERSION,
      scenario: name,
      state,
      quest: null,
      events: [],
    });
  }
  const scenario = scenarios[name];
  if (!scenario) throw new Error(`Unknown scenario: ${name}`);
  const created = instantiateSite(createSimulation(), scenario.site, entities);
  const bindings = Object.fromEntries(
    Object.entries(scenario.bindings ?? {}).map(([role, localId]) => [
      role,
      `${created.siteId}:${localId}`,
    ]),
  );
  return labelEntities({
    version: 6,
    campaign: null,
    phase: scenario.deployment ? "setup" : "running",
    teamIds: [],
    bindings,
    labels: {},
    nextPawnLabel: 1,
    nextObjectLabel: 1,
    simulationVersion: SIMULATION_VERSION,
    scenario: name,
    state: created.state,
    quest:
      scenario.quest && !scenario.deployment
        ? startQuest(scenario.quest, created.siteId, 0, bindings)
        : null,
    events: [],
  });
}

function labelEntities(session: ScenarioSession): ScenarioSession {
  const labels = { ...session.labels };
  let nextPawnLabel = session.nextPawnLabel;
  let nextObjectLabel = session.nextObjectLabel;
  const team = session.campaign?.staffIds ?? session.teamIds;
  const rank = (id: string) => {
    const index = team.indexOf(id);
    return index < 0 ? team.length : index;
  };
  const all = [
    ...Object.values(session.state.sites),
    ...Object.values(session.state.transfers),
  ]
    .flatMap((owner) => Object.values(owner.entities))
    .sort(
      (first, second) =>
        rank(first.id) - rank(second.id) ||
        (first.id < second.id ? -1 : first.id > second.id ? 1 : 0),
    );
  for (const entity of all) {
    if (!labels[entity.id])
      labels[entity.id] =
        entity.kind === "pawn"
          ? `@${nextPawnLabel++}`
          : `o${nextObjectLabel++}`;
  }
  return { ...session, labels, nextPawnLabel, nextObjectLabel };
}

export function deployAgent(
  session: ScenarioSession,
  templateId: string,
  alias: string,
  requestedRole?: string,
): ScenarioSession {
  const deployment = scenarios[session.scenario]?.deployment;
  if (session.phase !== "setup" || !deployment)
    throw new Error("Deployment is only available before mission start.");
  if (session.teamIds.length >= deployment.maximumTeam)
    throw new Error("The deployment team is full.");
  const unassigned = deployment.roles.filter((role) => !session.bindings[role]);
  const role =
    requestedRole ??
    (deployment.roles.includes(alias)
      ? alias
      : unassigned.length === 1
        ? unassigned[0]
        : undefined);
  if (!role && unassigned.length > 1)
    throw new Error(
      "Choose an explicit quest role when multiple roles are unassigned.",
    );
  if (role && !deployment.roles.includes(role))
    throw new Error("Unknown quest role.");
  if (role && session.bindings[role])
    throw new Error("That quest role is already assigned.");
  const siteId = Object.keys(session.state.sites)[0]!;
  const state = deployPawn(
    session.state,
    siteId,
    deployment,
    entities,
    templateId,
    alias,
    "entry",
  );
  const id = `${siteId}:${alias}`;
  return labelEntities({
    ...session,
    state,
    teamIds: [...session.teamIds, id],
    bindings: role ? { ...session.bindings, [role]: id } : session.bindings,
  });
}

export function startSession(session: ScenarioSession): ScenarioSession {
  if (session.phase === "running")
    throw new Error("The mission has already started.");
  const scenario = scenarios[session.scenario]!;
  const missing = scenario.deployment!.roles.filter(
    (role) => !session.bindings[role],
  );
  if (missing.length)
    throw new Error(`Deploy agents for required roles: ${missing.join(", ")}.`);
  for (const id of session.teamIds) {
    const actor = Object.values(session.state.sites)
      .map((site) => site.entities[id])
      .find(Boolean);
    if (
      actor?.kind !== "pawn" ||
      !actor.canAct ||
      actor.location.kind !== "ground"
    )
      throw new Error("A deployed agent is unavailable.");
  }
  const siteId = Object.keys(session.state.sites)[0]!;
  return {
    ...session,
    phase: "running",
    quest: scenario.quest
      ? startQuest(scenario.quest, siteId, session.state.tick, session.bindings)
      : null,
  };
}

export function stepSession(
  session: ScenarioSession,
  ticks: number,
): ScenarioSession {
  if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 10000)
    throw new Error("Ticks must be an integer from 0 to 10000.");
  if (session.phase !== "running")
    throw new Error("Mission is in setup. Deploy the team, then start.");
  let result = session;
  for (let index = 0; index < ticks; index++) {
    const next = advanceSimulation(result.state, materials);
    const definition = scenarios[result.scenario]?.quest;
    result = labelEntities({
      ...result,
      state: next.state,
      quest:
        definition && result.quest
          ? evaluateQuest(definition, result.quest, next.state, next.events)
          : null,
      events: [...result.events, ...next.events].slice(-100),
    });
  }
  return result;
}

export function restoreSession(text: string): ScenarioSession | null {
  try {
    const value = JSON.parse(text);
    return value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.version === 6 &&
      value.simulationVersion === SIMULATION_VERSION
      ? (value as ScenarioSession)
      : null;
  } catch {
    return null;
  }
}
