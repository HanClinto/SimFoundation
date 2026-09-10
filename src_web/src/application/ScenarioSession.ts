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

export const scenarios: Readonly<
  Record<string, { site: SiteTemplate; quest?: Quest }>
> = {
  response: responseScenario,
  daily: dailyScenario,
  sight: { site: sightSite as SiteTemplate },
  colony: colonyScenario,
  consumption: consumptionScenario,
};

export interface ScenarioSession {
  version: 1;
  simulationVersion: typeof SIMULATION_VERSION;
  scenario: string;
  state: Simulation;
  quest: QuestState | null;
  events: TickEvent[];
}

export function loadScenario(name: string): ScenarioSession {
  const scenario = scenarios[name];
  if (!scenario) throw new Error(`Unknown scenario: ${name}`);
  const created = instantiateSite(createSimulation(), scenario.site, entities);
  return {
    version: 1,
    simulationVersion: SIMULATION_VERSION,
    scenario: name,
    state: created.state,
    quest: scenario.quest
      ? startQuest(scenario.quest, created.siteId, 0)
      : null,
    events: [],
  };
}

export function stepSession(
  session: ScenarioSession,
  ticks: number,
): ScenarioSession {
  if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 10000)
    throw new Error("Ticks must be an integer from 0 to 10000.");
  let result = session;
  for (let index = 0; index < ticks; index++) {
    const next = advanceSimulation(result.state, materials);
    const definition = scenarios[result.scenario]?.quest;
    result = {
      ...result,
      state: next.state,
      quest:
        definition && result.quest
          ? evaluateQuest(definition, result.quest, next.state, next.events)
          : null,
      events: [...result.events, ...next.events].slice(-100),
    };
  }
  return result;
}

export function restoreSession(text: string): ScenarioSession | null {
  try {
    const value = JSON.parse(text);
    return value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      value.version === 1 &&
      value.simulationVersion === SIMULATION_VERSION
      ? (value as ScenarioSession)
      : null;
  } catch {
    return null;
  }
}
