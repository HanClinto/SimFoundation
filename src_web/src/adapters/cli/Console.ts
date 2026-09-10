import {
  loadScenario,
  scenarios,
  stepSession,
  deployAgent,
  startSession,
  type ScenarioSession,
} from "../../application/ScenarioSession";
import { conditionMet } from "../../simulation/core/quest/Quest";
import {
  commandSession,
  travelSession,
  admitSession,
} from "../../application/Commands";
import { entities as catalog, materials } from "../../simulation/catalog";
import type { Entity } from "../../simulation/core/entity/Entity";
import { chooseConcern } from "../../simulation/core/entity/pawn/concerns/Concerns";
import { chooseNeedAction } from "../../simulation/core/entity/pawn/Needs";
import { needActions } from "../../simulation/core/entity/pawn/actions/NeedActions";
import type { ActionState } from "../../simulation/core/entity/pawn/actions/Action";
import { parseOrder } from "./Order";
import { campaignBrief, campaignStatus } from "./Campaign";
import { operatingPhase } from "../../simulation/core/site/OperatingCycle";
import { healthStatus } from "../../simulation/core/entity/pawn/Health";
import { carriedCargo } from "../../simulation/core/entity/Equipment";
import { restraintFor } from "../../simulation/core/entity/pawn/Custody";
import { directWatchers } from "../../simulation/core/entity/pawn/Attention";
import type { TickEvent } from "../../simulation/core/Simulation";
import { finishCommitments } from "../../application/Finish";
import { medicalOverview } from "./Medical";
import { alarmPriority, firstAlarm } from "../../application/Alarms";
import { describeAction, describeQueue } from "./Queue";
import { workboard } from "./Workboard";

export interface ConsoleState {
  session: ScenarioSession;
  siteId: string;
}

export function openConsole(name = "campaign"): ConsoleState {
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

function resolve(
  console: ConsoleState,
  value: string | undefined,
  actorId?: string,
  globalInspection = false,
): Entity {
  const members = roster(console);
  if (value === "@held") {
    if (!actorId) throw new Error("@held requires an order's worker.");
    const carried = carriedCargo(
      console.session.state.sites[console.siteId]!.entities,
      actorId,
    );
    if (carried.length !== 1)
      throw new Error(
        "This worker must carry exactly one object to use @held.",
      );
    return carried[0]!;
  }
  const all = globalInspection
    ? [
        ...Object.values(console.session.state.sites),
        ...Object.values(console.session.state.transfers),
      ].flatMap((owner) => Object.values(owner.entities))
    : members;
  const exact = all.find(
    (entity) => entity.id === value || token(console, entity) === value,
  );
  if (exact) return exact;
  let matches = members.filter(
    (entity) => entity.name === value || entity.id.split(":").at(-1) === value,
  );
  if (!matches.length && globalInspection)
    matches = all.filter(
      (entity) =>
        entity.name === value || entity.id.split(":").at(-1) === value,
    );
  if (matches.length > 1)
    throw new Error(
      `Ambiguous entity: ${value}. Use a stable label or full ID.`,
    );
  const found = matches[0];
  if (!found) throw new Error(`Unknown entity: ${value ?? "(missing)"}`);
  return found;
}

export function questStatus(console: ConsoleState): string {
  const { session } = console;
  if (session.campaign) return campaignStatus(session);
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
    ...(site.cycle
      ? [
          `Cycle: ${operatingPhase(site.cycle, console.session.state.tick).phase.toUpperCase()} | changes at ${operatingPhase(site.cycle, console.session.state.tick).changesAt ?? "first responder entry"}`,
        ]
      : []),
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
          : `${
              entity.kind === "item" && entity.equipment?.worn
                ? "worn by"
                : entity.kind === "item" && entity.restraint?.attached
                  ? "restraining"
                  : "carried by"
            } ${entity.location.carrierId}`;
      const current = entity.kind === "pawn" ? entity.queue[0] : null;
      return `${token(console, entity)} ${entity.name} [${entity.id}] @ ${location}${entity.kind === "pawn" ? ` | ${healthStatus(entity)} | ${current ? `${current.id}: ${describeAction(current.action)}` : "idle"}${current?.blockedReason ? ` | blocked: ${current.blockedReason}` : ""}${entity.queue.length > 1 ? ` | ${entity.queue.length - 1} pending` : ""}` : ""}`;
    }),
  ].join("\n");
}

export const help = `map | brief | status | events | sites | site <id>
events <alarms|here|route|site-id|entity-id|stable-label> (retained history only)
status [work] (work is a compact current-operations view)
medical [all] (read-only current care facts)
brief <route> | prepare <route> <staff...> | send <route> <staff...> (campaign)
preview-send <route> <staff...> (actual checks and manifest, no departure)
send home <staff...> [cooperative-passenger] | admit <person> <home-bed>
order <worker> equip <gear> | order <worker> unequip <gear> | order <worker> subdue <hostile>
order <worker> rearm <worn-tool> (finite physical supply)
order <worker> repair-equipment <gear> <bench>
order <worker> craft <bench> <recipe> (recorded research and physical supplies)
order <worker> process <machine> <recipe> <input> (load/activate an independent device cycle)
order <worker> observe <actor> <carried-recorder> (watch from current visible vantage)
order <worker> watch <subject> <ticks> (sustained direct attention; fatigue stops watch)
relieve <outgoing> <replacement> (replacement must already be actively watching the same subject)
order <worker> door <door> <open|closed|automatic> (physical controls)
order <worker> give <carried-object|@held> <teammate>
order <worker> capture <subject> <restraint|@held> <x> <y> (local physical job)
order <worker> restrain <hostile> <carried-restraint>
order <worker> contain <hostile> <cell> | order <worker> unrestrain <contained-hostile>
order <worker> lockdown <cell> (physical, finite emergency fallback)
deploy <staff-type> <name> | start
step [ticks] | run [maximum ticks] | finish [--alarms] <worker-or-machine...> (up to 1000 ticks; --alarms stops for any new critical event)
load <campaign|response|daily|sight|colony|consumption|scp1867|scp1370>
inspect <token|id> | queue <actor> | move <actor> <x> <y> (appends to queue)
study <actor> <station> <planId>
order <name|@N> <verb> <target> | order <name|@N> move <x> <y> | order <name|@N> wait <ticks>
order <name|@N> study <station> <planId> | autonomy <actor> <on|off> | cancel <actor> [actionId]
order <name|@N> deliver <target> <x> <y> (collect, carry and drop)
order <name|@N> dispense <machine> <request> [source]
order <name|@N> escort <person> <x> <y> (cooperative walking)
order <name|@N> pack <specimen> <case> | order <name|@N> unpack <case>
order <name|@N> nurse <patient> <clinical-bed> [wounds]
order <name|@N> take <supply-stack> [amount] (physical collection)
Use @held as an order target for that worker's actual carried object.
assign <worker> <counter|none> | order <worker> service <counter>
assign-watch <worker> <subject> <x> <y> | assign-watch <worker> none (individual post duty, not automatic team relief)
save <path> | restore <path> | help | quit`;

export function executeLine(
  console: ConsoleState,
  line: string,
): {
  console: ConsoleState;
  output: string;
  quit?: boolean;
  alarm?: TickEvent;
  rejected?: boolean;
} {
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
    case "prepare":
    case "preview-send":
    case "send": {
      const campaign = console.session.campaign;
      if (!campaign)
        throw new Error("This order requires a home-site campaign.");
      const ids = args.slice(1).map((value) => resolve(console, value).id);
      const { state } = travelSession(
        console.session,
        console.siteId,
        args[0]!,
        ids,
        command === "prepare" ? "prepare" : "depart",
      );
      if (command === "preview-send") {
        const transfer = Object.values(state.transfers).find(
          (candidate) => !console.session.state.transfers[candidate.id],
        )!;
        return finish(
          JSON.stringify(
            {
              preview: true,
              originId: transfer.originId,
              destinationId: transfer.destinationId,
              duration: transfer.arrivesAt - state.tick,
              arrival: transfer.arrival,
              arrivalRadius: transfer.arrivalRadius,
              manifest: Object.values(transfer.entities).map((entity) => ({
                id: entity.id,
                name: entity.name,
                kind: entity.kind,
                amount: entity.amount,
                integrity: entity.integrity,
                location: entity.location,
                ...(entity.kind === "item"
                  ? { equipment: entity.equipment, restraint: entity.restraint }
                  : {}),
                ...(entity.kind === "pawn" ? { health: entity.health } : {}),
              })),
              notice:
                "No time, supplies, identities or ownership changed. Use send to commit this prepared departure.",
            },
            null,
            2,
          ),
        );
      }
      next = { ...console, session: { ...console.session, state } };
      return finish(
        command === "prepare"
          ? "Preparation ordered. Staff walk to loading pads with autonomy off; inspect their queues, then send when ready."
          : "Departed with actual staff and carried cargo. Use status for transit and blocked admission; step advances every site.",
      );
    }
    case "admit": {
      const campaign = console.session.campaign;
      if (!campaign || args.length !== 2)
        throw new Error("Use admit <person> <home-bed> in a campaign.");
      const session = admitSession(
        console.session,
        resolve(console, args[0]).id,
        resolve(console, args[1]).id,
      );
      next = { ...console, session };
      return finish(
        "Admitted to home care. Ordinary bed rest is queued; injury and blood loss are retained.",
      );
    }
    case "sites":
      return finish(
        Object.values(console.session.state.sites)
          .map((site) => `${site.id} ${site.name}`)
          .join("\n"),
      );
    case "site": {
      const siteId = console.session.campaign?.siteIds[args[0]!] ?? args[0]!;
      if (!console.session.state.sites[siteId])
        throw new Error("Unknown site.");
      next = { ...console, siteId };
      return finish(renderMap(next));
    }
    case "map":
      return finish(renderMap(next));
    case "status":
      if (args.length > 1 || (args.length === 1 && args[0] !== "work"))
        throw new Error("Use status [work].");
      return finish(
        args[0] === "work" ? workboard(console.session) : questStatus(next),
      );
    case "medical":
      if (args.length > 1 || (args.length === 1 && args[0] !== "all"))
        throw new Error(
          "Use medical [all]; select a site for a local overview.",
        );
      return finish(
        medicalOverview(
          console.session,
          args[0] === "all" ? undefined : console.siteId,
        ),
      );
    case "brief": {
      if (console.session.campaign) return finish(campaignBrief(args[0]));
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
    case "events": {
      if (args.length > 1)
        throw new Error(
          "Use events [alarms|here|route|site-id|entity-id|stable-label].",
        );
      let events = console.session.events;
      const filter = args[0];
      if (filter === "alarms")
        events = events.filter((event) => alarmPriority(event) >= 0);
      else if (filter) {
        const siteId =
          filter === "here"
            ? console.siteId
            : (console.session.campaign?.siteIds[filter] ??
              (console.session.state.sites[filter] ? filter : undefined));
        if (siteId) events = events.filter((event) => event.siteId === siteId);
        else {
          const entity = resolve(console, filter, undefined, true);
          events = events.filter(
            (event) =>
              event.entityId === entity.id || event.targetId === entity.id,
          );
        }
      }
      return finish(
        `${filter ? `Retained history only (up to 100 events), filter ${filter}:\n` : ""}` +
          (events.map((event) => JSON.stringify(event)).join("\n") ||
            "No recent events."),
      );
    }
    case "finish": {
      if (console.session.phase !== "running")
        throw new Error("Start the mission before advancing work.");
      const stopOnAlarms = args[0] === "--alarms";
      const names = stopOnAlarms ? args.slice(1) : args;
      if (!names.length || names.some((name) => name.startsWith("--")))
        throw new Error("Use finish [--alarms] <worker-or-machine...>.");
      const workers = names.map((value) =>
        resolve(console, value, undefined, true),
      );
      const { session, elapsed, reason, notices, noticeCount, alarm } =
        finishCommitments(
          console.session,
          workers.map((worker) => worker.id),
          stopOnAlarms,
        );
      next = { ...console, session };
      return {
        ...finish(
          [
            `Advanced ${elapsed} ticks. ${reason}`,
            ...workers.map((worker) => {
              const owner = [
                ...Object.values(session.state.sites),
                ...Object.values(session.state.transfers),
              ].find((candidate) => candidate.entities[worker.id]);
              const current = owner?.entities[worker.id];
              return `${worker.name} at ${owner?.id ?? "MISSING"}: ${
                current?.kind === "facility" && current.processor
                  ? current.processor.current
                    ? `${current.processor.current.recipeId}, output due ${current.processor.current.completesAt}${current.processor.current.blockedReason ? ` | blocked: ${current.processor.current.blockedReason}` : ""}`
                    : "No active processing cycle."
                  : current
                    ? describeQueue(current)
                    : "not present"
              }`;
            }),
            ...(alarm
              ? [
                  "Stopped after the complete tick. Inspect selected queues and respond before continuing.",
                ]
              : noticeCount
                ? [
                    `New critical events during this wait (${notices.length} of ${noticeCount}, highest severity first). Use finish --alarms to stop on them:`,
                    ...notices.map(
                      (event) =>
                        `tick ${event.tick}: ${event.siteId} ${event.entityId} ${event.kind}: ${event.reason ?? "inspect events"}`,
                    ),
                  ]
                : []),
          ].join("\n"),
        ),
        ...(alarm ? { alarm } : {}),
      };
    }
    case "step":
    case "run": {
      const ticks = Number(args[0] ?? (command === "run" ? 400 : 1));
      if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 10000)
        throw new Error("Ticks must be from 0 to 10000.");
      let session = console.session;
      let alarm: TickEvent | undefined;
      for (let index = 0; index < ticks; index++) {
        if (
          command === "run" &&
          session.quest?.status !== "active" &&
          session.quest
        )
          break;
        let current: readonly Readonly<TickEvent>[] = [];
        session = stepSession(session, 1, (events) => {
          current = events;
        });
        if (command === "run" && session.campaign) {
          alarm = firstAlarm(current);
          if (alarm) break;
        }
      }
      next = { ...console, session };
      return {
        ...finish(
          `${alarm ? `ALARM at tick ${session.state.tick}: ${alarm.siteId} ${alarm.entityId} ${alarm.kind}: ${alarm.reason ?? "inspect events"}\nRun stopped after the complete tick. Inspect and respond, or deliberately step through the hazard.\n` : ""}${renderMap(next)}\n${questStatus(next)}`,
        ),
        ...(alarm ? { alarm } : {}),
      };
    }
    case "inspect": {
      const entity = resolve(console, args[0], undefined, true);
      const owner = [
        ...Object.values(console.session.state.sites),
        ...Object.values(console.session.state.transfers),
      ].find((candidate) => candidate.entities[entity.id])!;
      const watchers =
        entity.kind === "pawn" && entity.stillWhenWatched && "terrain" in owner
          ? directWatchers(owner, entity.id)
          : null;
      const context =
        entity.kind === "pawn" &&
        entity.canAct &&
        !entity.health?.death &&
        entity.location.kind === "ground" &&
        !restraintFor(owner.entities, entity.id) &&
        !watchers?.length &&
        "terrain" in owner
          ? {
              pawn: entity,
              site: owner,
              tick: console.session.state.tick,
              materials,
              events: [],
            }
          : null;
      return finish(
        JSON.stringify(
          {
            entity,
            owner:
              "terrain" in owner
                ? { kind: "site", id: owner.id, name: owner.name }
                : {
                    kind: "transit",
                    id: owner.id,
                    originId: owner.originId,
                    destinationId: owner.destinationId,
                    arrival: owner.arrival,
                    arrivalRadius: owner.arrivalRadius ?? 0,
                    arrivesAt: owner.arrivesAt,
                    blockedReason: owner.blockedReason,
                    mapPosition: null,
                  },
            restraint: restraintFor(owner.entities, entity.id),
            ...(watchers
              ? { directWatchers: watchers.map((watcher) => watcher.id) }
              : {}),
            contents: Object.values(owner.entities)
              .filter(
                (entry) =>
                  entry.location.kind === "carried" &&
                  entry.location.carrierId === entity.id,
              )
              .map((entry) => ({
                id: entry.id,
                name: entry.name,
                amount: entry.amount,
              })),
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
    case "assign":
    case "assign-watch":
    case "relieve":
    case "autonomy":
    case "cancel": {
      if (console.session.phase !== "running")
        throw new Error("Start the mission before issuing gameplay orders.");
      const actor = resolve(console, args[0]);
      const base = { siteId: console.siteId, entityId: actor.id };
      let result;
      if (command === "assign-watch") {
        if (args.length !== 4 && !(args.length === 2 && args[1] === "none"))
          throw new Error(
            "Use assign-watch <worker> <subject> <x> <y>, or assign-watch <worker> none.",
          );
        result = commandSession(console.session, {
          ...base,
          kind: "watch-duty",
          duty:
            args[1] === "none"
              ? null
              : {
                  targetId: resolve(console, args[1]).id,
                  post: { x: Number(args[2]), y: Number(args[3]) },
                },
        });
      } else if (command === "relieve") {
        if (args.length !== 2)
          throw new Error("Use relieve <outgoing> <replacement>.");
        result = commandSession(console.session, {
          ...base,
          kind: "relieve",
          replacementId: resolve(console, args[1]).id,
        });
      } else if (command === "assign") {
        if (args.length !== 2)
          throw new Error("Use assign <worker> <counter|none>.");
        result = commandSession(console.session, {
          ...base,
          kind: "duty",
          targetId: args[1] === "none" ? null : resolve(console, args[1]).id,
        });
      } else if (command === "autonomy") {
        if (args[1] !== "on" && args[1] !== "off")
          throw new Error("Use on or off.");
        result = commandSession(console.session, {
          ...base,
          kind: "autonomy",
          enabled: args[1] === "on",
        });
      } else if (command === "cancel") {
        const actionId =
          args[1] ?? (actor.kind === "pawn" ? actor.queue[0]?.id : undefined);
        if (!actionId) throw new Error("No action to cancel.");
        result = commandSession(console.session, {
          ...base,
          kind: "cancel",
          actionId,
        });
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
        if (
          action.kind === "move" ||
          action.kind === "deliver" ||
          action.kind === "escort" ||
          action.kind === "capture"
        ) {
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
            targetId: resolve(console, action.targetId, actor.id).id,
          };
          if (action.kind === "dispense" && action.sourceId)
            action = {
              ...action,
              sourceId: resolve(console, action.sourceId, actor.id).id,
            };
          if (action.kind === "pack")
            action = {
              ...action,
              caseId: resolve(console, action.caseId, actor.id).id,
            };
          if (action.kind === "nurse")
            action = {
              ...action,
              bedId: resolve(console, action.bedId, actor.id).id,
            };
          if (action.kind === "restrain" || action.kind === "capture")
            action = {
              ...action,
              restraintId: resolve(console, action.restraintId, actor.id).id,
            };
          if (action.kind === "contain")
            action = {
              ...action,
              cellId: resolve(console, action.cellId, actor.id).id,
            };
          if (action.kind === "repair-equipment")
            action = {
              ...action,
              benchId: resolve(console, action.benchId, actor.id).id,
            };
          if (action.kind === "give")
            action = {
              ...action,
              recipientId: resolve(console, action.recipientId).id,
            };
          if (action.kind === "observe")
            action = {
              ...action,
              recorderId: resolve(console, action.recorderId, actor.id).id,
            };
          if (action.kind === "process")
            action = {
              ...action,
              inputId: resolve(console, action.inputId, actor.id).id,
            };
        }
        result = commandSession(console.session, {
          ...base,
          kind: "enqueue",
          action,
        });
      }
      next = {
        ...console,
        session: { ...console.session, state: result.state },
      };
      if (command === "relieve" && result.code === "accepted")
        return finish(
          `Relieved ${actor.name}; ${args[1]} remains in active direct watch. Later queued work is preserved; no time or movement was added.`,
        );
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
      return {
        ...finish(
          `${result.code}${result.reason ? `: ${result.reason}` : ""}${result.actionId ? ` (${result.actionId})` : ""}`,
        ),
        ...(result.code === "rejected" ? { rejected: true } : {}),
      };
    }
    default:
      throw new Error(`Unknown command: ${command}. Type help.`);
  }
}
