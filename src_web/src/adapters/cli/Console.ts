import {
  loadScenario,
  scenarios,
  stepSession,
  deployAgent,
  startSession,
  type ScenarioSession,
} from "../../application/ScenarioSession";
import { conditionMet } from "../../simulation/core/quest/Quest";
import { executeCommand } from "../../simulation/core/ControlPolicy";
import { entities as catalog, materials } from "../../simulation/catalog";
import type { Entity } from "../../simulation/core/entity/Entity";
import { chooseConcern } from "../../simulation/core/entity/pawn/concerns/Concerns";
import { chooseNeedAction } from "../../simulation/core/entity/pawn/Needs";
import { needActions } from "../../simulation/core/entity/pawn/actions/NeedActions";
import type { ActionState } from "../../simulation/core/entity/pawn/actions/Action";
import { parseOrder } from "./Order";

export interface ConsoleState {
  session: ScenarioSession;
  siteId: string;
}

export function openConsole(name = "response"): ConsoleState {
  const session = loadScenario(name);
  return { session, siteId: Object.keys(session.state.sites)[0]! };
}

function roster(console: ConsoleState): Entity[] {
  return Object.values(
    console.session.state.sites[console.siteId]?.entities ?? {},
  ).sort((first, second) =>
    first.id < second.id ? -1 : first.id > second.id ? 1 : 0,
  );
}

function token(console: ConsoleState, entity: Entity): string {
  return console.session.labels[entity.id] ?? "??";
}

function resolve(console: ConsoleState, value: string | undefined): Entity {
  const members = roster(console);
  const found = members.find(
    (entity) =>
      entity.id === value ||
      entity.id === `${console.siteId}:${value}` ||
      token(console, entity) === value,
  );
  if (!found) throw new Error(`Unknown entity: ${value ?? "(missing)"}`);
  return found;
}

export function questStatus(console: ConsoleState): string {
  const { session } = console;
  const definition = scenarios[session.scenario]?.quest;
  const quest = session.quest;
  if (session.phase === "setup") {
    const deployment = scenarios[session.scenario]!.deployment!;
    return [
      `Tick ${session.state.tick} | ${definition?.name ?? session.scenario} | SETUP (mission clock stopped)`,
      `Available staff: ${deployment.templates.join(", ")}`,
      `Entry points: ${Object.entries(deployment.entries)
        .map(
          ([name, positions]) =>
            `${name} [${positions.map((point) => `${point.x},${point.y}`).join("; ")}]`,
        )
        .join(" | ")}`,
      `Team: ${session.teamIds.length}/${deployment.maximumTeam}`,
      ...deployment.roles.map(
        (role) =>
          `${role}: ${session.bindings[role] ? `${session.labels[session.bindings[role]!]} ${session.bindings[role]}` : "not assigned"}`,
      ),
      "deploy <staff-type> <name>, then start (agents use the map entry)",
    ].join("\n");
  }
  if (!quest || !definition)
    return `Tick ${session.state.tick} | Sandbox (no quest)`;
  return [
    `Tick ${session.state.tick} | ${definition.name} | ${quest.status.toUpperCase()} | deadline ${quest.startedTick + definition.deadline}`,
    ...definition.objectives.map(
      (objective) =>
        `[${conditionMet(objective.condition, quest, session.state, objective.id) ? "x" : " "}] ${objective.description}${objective.condition.kind === "event" ? ` (${quest.counts[objective.id] ?? 0}/${objective.condition.count})` : ""}`,
    ),
    ...(quest.reason ? [quest.reason] : []),
  ].join("\n");
}

function describeAction(action: ActionState): string {
  if (action.kind === "deliver")
    return `deliver ${action.targetId} to (${action.destination.x},${action.destination.y})`;
  if (action.kind === "move")
    return `move to (${action.destination.x},${action.destination.y})`;
  if (action.kind === "wait") return `wait ${action.ticks} ticks`;
  if (action.kind === "study")
    return `study ${action.planId} at ${action.targetId}`;
  return `${action.kind} ${action.targetId}`;
}

function describeQueue(entity: Entity): string {
  if (entity.kind !== "pawn") return "Only pawns have action queues.";
  return (
    entity.queue
      .map(
        (entry, index) =>
          `${index + 1}. ${index === 0 ? "current" : "pending"} ${entry.id}: ${describeAction(entry.action)} [${entry.source}]${entry.blockedReason ? ` | blocked: ${entry.blockedReason}` : ""}`,
      )
      .join("\n") || "No queued actions."
  );
}

export function renderMap(console: ConsoleState): string {
  const site = console.session.state.sites[console.siteId];
  if (!site) return "No selected site.";
  const members = roster(console);
  const tokenWidth = Math.max(
    2,
    ...Object.values(console.session.labels).map((label) => label.length),
  );
  const cellWidth = tokenWidth + 1;
  const occupants = new Map<string, string[]>();
  members.forEach((entity) => {
    if (entity.location.kind !== "ground") return;
    const key = `${entity.location.position.x},${entity.location.position.y}`;
    occupants.set(key, [...(occupants.get(key) ?? []), token(console, entity)]);
  });
  return [
    `${site.name} (${site.id}) | tick ${console.session.state.tick}`,
    "    " +
      [...(site.terrain[0] ?? "")]
        .map((_symbol, index) => String(index).padEnd(cellWidth))
        .join(""),
    ...site.terrain.map(
      (row, rowIndex) =>
        `${String(rowIndex).padStart(3)} ` +
        [...row]
          .map((symbol, columnIndex) => {
            const present = occupants.get(`${columnIndex},${rowIndex}`) ?? [];
            return (
              symbol +
              (present.length > 1 ? "++" : (present[0] ?? "")).padEnd(
                tokenWidth,
              )
            );
          })
          .join(""),
    ),
    "Legend: terrain + stable label; @N = pawn, oN = object, ++ = stacked (all listed below)",
    ...members.map((entity) => {
      const location =
        entity.location.kind === "ground"
          ? `${entity.location.position.x},${entity.location.position.y}`
          : `carried by ${entity.location.carrierId}`;
      const current = entity.kind === "pawn" ? entity.queue[0] : null;
      return `${token(console, entity)} ${entity.name} [${entity.id}] @ ${location}${entity.kind === "pawn" ? ` | ${entity.canAct ? "active" : "incapable"} | ${current ? `${current.id}: ${describeAction(current.action)}` : "idle"}${current?.blockedReason ? ` | blocked: ${current.blockedReason}` : ""}${entity.queue.length > 1 ? ` | ${entity.queue.length - 1} pending` : ""}` : ""}`;
    }),
  ].join("\n");
}

export const help = `map | brief | status | events | sites | site <id>
deploy <staff-type> <name> | start
step [ticks] | run [maximum ticks] | load <response|daily|sight|colony|consumption|scp1867|scp1370>
inspect <token|id> | queue <actor> | move <actor> <x> <y> (appends to queue)
study <actor> <station> <planId>
order <name|@N> <verb> <target> | order <name|@N> move <x> <y> | order <name|@N> wait <ticks>
order <name|@N> study <station> <planId> | autonomy <actor> <on|off> | cancel <actor> [actionId]
order <name|@N> deliver <target> <x> <y> (collect, carry and drop)
save <path> | restore <path> | help | quit`;

export function executeLine(
  console: ConsoleState,
  line: string,
): { console: ConsoleState; output: string; quit?: boolean } {
  const [command, ...args] = line.trim().split(/\s+/);
  let next = console;
  const finish = (output: string) => ({ console: next, output });
  if (!command || command.startsWith("#")) return finish("");
  switch (command) {
    case "help":
      return finish(help);
    case "quit":
    case "exit":
      return { ...finish("Session closed."), quit: true };
    case "load":
      next = openConsole(args[0]);
      return finish(renderMap(next) + "\n" + questStatus(next));
    case "deploy": {
      if (args.length !== 2)
        throw new Error(
          "Use deploy <staff-type> <name>; the map entry is automatic.",
        );
      next = {
        ...console,
        session: deployAgent(console.session, args[0]!, args[1]!),
      };
      return finish(
        `Deployed ${next.session.labels[`${console.siteId}:${args[1]}`]} ${args[1]}.\n${questStatus(next)}`,
      );
    }
    case "start":
      next = { ...console, session: startSession(console.session) };
      return finish(questStatus(next));
    case "sites":
      return finish(
        Object.values(console.session.state.sites)
          .map((site) => `${site.id} ${site.name}`)
          .join("\n"),
      );
    case "site":
      if (!console.session.state.sites[args[0]!])
        throw new Error("Unknown site.");
      next = { ...console, siteId: args[0]! };
      return finish(renderMap(next));
    case "map":
      return finish(renderMap(next));
    case "status":
      return finish(questStatus(next));
    case "brief": {
      const quest = scenarios[console.session.scenario]?.quest;
      return finish(
        quest
          ? [
              quest.name,
              quest.briefing ?? "See status for the scenario objectives.",
              ...(quest.sources ?? []).map(
                (source) =>
                  `${source.title} by ${source.author} | ${source.license} | ${source.url}`,
              ),
            ].join("\n")
          : "Inspection sandbox: no quest briefing.",
      );
    }
    case "events":
      return finish(
        console.session.events
          .map((event) => JSON.stringify(event))
          .join("\n") || "No recent events.",
      );
    case "step":
    case "run": {
      const ticks = Number(args[0] ?? (command === "run" ? 400 : 1));
      if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 10000)
        throw new Error("Ticks must be from 0 to 10000.");
      let session = console.session;
      for (let index = 0; index < ticks; index++) {
        if (
          command === "run" &&
          session.quest?.status !== "active" &&
          session.quest
        )
          break;
        session = stepSession(session, 1);
      }
      next = { ...console, session };
      return finish(renderMap(next) + "\n" + questStatus(next));
    }
    case "inspect": {
      const entity = resolve(console, args[0]);
      const context =
        entity.kind === "pawn"
          ? {
              pawn: entity,
              site: console.session.state.sites[console.siteId]!,
              tick: console.session.state.tick,
              materials,
              events: [],
            }
          : null;
      return finish(
        JSON.stringify(
          {
            entity,
            label: token(console, entity),
            description: catalog[entity.definitionId]?.description,
            attribution: catalog[entity.definitionId]?.attribution,
            ...(context
              ? {
                  concern: chooseConcern(context),
                  needCandidate: chooseNeedAction(context, needActions),
                }
              : {}),
          },
          null,
          2,
        ),
      );
    }
    case "queue":
      return finish(describeQueue(resolve(console, args[0])));
    case "move":
    case "study":
    case "order":
    case "autonomy":
    case "cancel": {
      if (console.session.phase !== "running")
        throw new Error("Start the mission before issuing gameplay orders.");
      const actor = resolve(console, args[0]);
      const base = { siteId: console.siteId, entityId: actor.id };
      let result;
      if (command === "autonomy") {
        if (args[1] !== "on" && args[1] !== "off")
          throw new Error("Use on or off.");
        result = executeCommand(
          console.session.state,
          { ...base, kind: "autonomy", enabled: args[1] === "on" },
          materials,
        );
      } else if (command === "cancel") {
        const actionId =
          args[1] ?? (actor.kind === "pawn" ? actor.queue[0]?.id : undefined);
        if (!actionId) throw new Error("No action to cancel.");
        result = executeCommand(
          console.session.state,
          { ...base, kind: "cancel", actionId },
          materials,
        );
      } else {
        let action: ActionState =
          command === "move"
            ? {
                kind: "move",
                destination: { x: Number(args[1]), y: Number(args[2]) },
              }
            : command === "study"
              ? {
                  kind: "study",
                  targetId: args[1]!,
                  planId: args[2]!,
                  workTicks: 0,
                }
              : parseOrder(args.slice(1));
        const kinds = [
          "deliver",
          "move",
          "take",
          "drop",
          "eat",
          "wait",
          "sleep",
          "relax",
          "research",
          "read",
          "exercise",
          "attack",
          "treat",
          "flee",
          "study",
        ];
        if (
          !action ||
          typeof action !== "object" ||
          !kinds.includes(action.kind)
        )
          throw new Error("Unknown action kind.");
        if (action.kind === "move" || action.kind === "deliver") {
          if (
            !Number.isInteger(action.destination?.x) ||
            !Number.isInteger(action.destination?.y)
          )
            throw new Error("Move needs integer x/y coordinates.");
        }
        if (action.kind === "wait") {
          if (!Number.isSafeInteger(action.ticks) || action.ticks < 1)
            throw new Error("Wait needs a positive integer duration.");
        } else if ("targetId" in action) {
          if (
            action.kind === "study" &&
            (typeof action.planId !== "string" || !action.planId)
          )
            throw new Error("Study needs a plan ID; inspect the station.");
          action = {
            ...action,
            targetId: resolve(console, action.targetId).id,
          };
          if (
            [
              "sleep",
              "relax",
              "research",
              "read",
              "exercise",
              "attack",
              "treat",
              "study",
            ].includes(action.kind)
          )
            action = { ...action, workTicks: 0 } as ActionState;
        }
        result = executeCommand(
          console.session.state,
          { ...base, kind: "enqueue", action },
          materials,
        );
      }
      next = {
        ...console,
        session: { ...console.session, state: result.state },
      };
      if (result.actionId) {
        const updated = result.state.sites[console.siteId]!.entities[actor.id];
        if (updated?.kind === "pawn") {
          const index = updated.queue.findIndex(
            (entry) => entry.id === result.actionId,
          );
          const entry = updated.queue[index]!;
          const current = updated.queue[0]!;
          return finish(
            `accepted (${result.actionId}): ${describeAction(entry.action)}; ${index === 0 ? "first in queue, starts on the next tick" : `queued at position ${index + 1} behind ${current.id}: ${describeAction(current.action)}`}${index > 0 && current.blockedReason ? `\nCurrent action is blocked: ${current.blockedReason}\nUse queue ${args[0]} to inspect or cancel ${args[0]} ${current.id} to remove it.` : ""}`,
          );
        }
      }
      return finish(
        `${result.code}${result.reason ? `: ${result.reason}` : ""}${result.actionId ? ` (${result.actionId})` : ""}`,
      );
    }
    default:
      throw new Error(`Unknown command: ${command}. Type help.`);
  }
}
