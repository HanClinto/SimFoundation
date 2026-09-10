import {
  loadScenario,
  scenarios,
  stepSession,
  type ScenarioSession,
} from "../../application/ScenarioSession";
import { conditionMet } from "../../simulation/core/quest/Quest";
import { executeCommand } from "../../simulation/core/ControlPolicy";
import { materials } from "../../simulation/catalog";
import type { Entity } from "../../simulation/core/entity/Entity";
import { chooseConcern } from "../../simulation/core/entity/pawn/concerns/Concerns";
import { chooseNeedAction } from "../../simulation/core/entity/pawn/Needs";
import { needActions } from "../../simulation/core/entity/pawn/actions/NeedActions";
import type { ActionState } from "../../simulation/core/entity/pawn/actions/Action";

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

function token(index: number): string {
  return index.toString(36).padStart(2, "0");
}

function resolve(console: ConsoleState, value: string | undefined): Entity {
  const members = roster(console);
  const found = members.find(
    (entity, index) =>
      entity.id === value ||
      entity.id === `${console.siteId}:${value}` ||
      token(index) === value,
  );
  if (!found) throw new Error(`Unknown entity: ${value ?? "(missing)"}`);
  return found;
}

export function questStatus(console: ConsoleState): string {
  const { session } = console;
  const definition = scenarios[session.scenario]?.quest;
  const quest = session.quest;
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

export function renderMap(console: ConsoleState): string {
  const site = console.session.state.sites[console.siteId];
  if (!site) return "No selected site.";
  const members = roster(console);
  const occupants = new Map<string, string[]>();
  members.forEach((entity, index) => {
    if (entity.location.kind !== "ground") return;
    const key = `${entity.location.position.x},${entity.location.position.y}`;
    occupants.set(key, [...(occupants.get(key) ?? []), token(index)]);
  });
  return [
    `${site.name} (${site.id}) | tick ${console.session.state.tick}`,
    "    " +
      [...(site.terrain[0] ?? "")]
        .map((_symbol, index) => String(index).padEnd(3))
        .join(""),
    ...site.terrain.map(
      (row, rowIndex) =>
        `${String(rowIndex).padStart(3)} ` +
        [...row]
          .map((symbol, columnIndex) => {
            const present = occupants.get(`${columnIndex},${rowIndex}`) ?? [];
            return symbol + (present.length > 1 ? "++" : (present[0] ?? "  "));
          })
          .join(""),
    ),
    "Legend: terrain + two-character entity token; ++ = stacked (all listed below)",
    ...members.map((entity, index) => {
      const location =
        entity.location.kind === "ground"
          ? `${entity.location.position.x},${entity.location.position.y}`
          : `carried by ${entity.location.carrierId}`;
      const current = entity.kind === "pawn" ? entity.queue[0] : null;
      return `${token(index)} ${entity.name} [${entity.id}] @ ${location}${entity.kind === "pawn" ? ` | ${entity.canAct ? "active" : "incapable"} | ${current?.action.kind ?? "idle"}${current?.blockedReason ? `: ${current.blockedReason}` : ""}` : ""}`;
    }),
  ].join("\n");
}

export const help = `map | status | events | sites | site <id>
step [ticks] | run [maximum ticks] | load <response|daily|sight|colony|consumption>
inspect <token|id> | move <actor> <x> <y>
order <actor> <action JSON> | autonomy <actor> <on|off> | cancel <actor> [actionId]
save <path> | restore <path> | help | quit`;

export function executeLine(
  console: ConsoleState,
  line: string,
): { console: ConsoleState; output: string; quit?: boolean } {
  const [command, ...args] = line.trim().split(/\s+/);
  let next = console;
  const finish = (output: string) => ({ console: next, output });
  if (!command) return finish("");
  switch (command) {
    case "help":
      return finish(help);
    case "quit":
    case "exit":
      return { ...finish("Session closed."), quit: true };
    case "load":
      next = openConsole(args[0]);
      return finish(renderMap(next) + "\n" + questStatus(next));
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
    case "move":
    case "order":
    case "autonomy":
    case "cancel": {
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
            : JSON.parse(args.slice(1).join(" "));
        const kinds = [
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
        ];
        if (
          !action ||
          typeof action !== "object" ||
          !kinds.includes(action.kind)
        )
          throw new Error("Unknown action kind.");
        if (action.kind === "move") {
          if (
            !Number.isInteger(action.destination?.x) ||
            !Number.isInteger(action.destination?.y)
          )
            throw new Error("Move needs integer x/y coordinates.");
        } else if (action.kind === "wait") {
          if (!Number.isSafeInteger(action.ticks) || action.ticks < 1)
            throw new Error("Wait needs a positive integer duration.");
        } else {
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
      return finish(
        `${result.code}${result.reason ? `: ${result.reason}` : ""}${result.actionId ? ` (${result.actionId})` : ""}`,
      );
    }
    default:
      throw new Error(`Unknown command: ${command}. Type help.`);
  }
}
