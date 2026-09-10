# Simulation

This is the replacement headless simulation. The previous engine remains in [../simulation_legacy](../simulation_legacy) for reference. Existing browser/application bindings still explicitly run that archive; this directory has no legacy imports or compatibility facade.

The organizing principle is **open the file for a thing to understand that thing**. Core defines reusable mechanics. Catalog defines named things in the game using those mechanics. Prefer a readable local implementation over distributed switches, inheritance ladders, or speculative frameworks.

## Core Versus Catalog

```text
application / headless tests
	-> catalog (named definitions and authored sites)
	-> core (generic mechanics, accepting supplied definitions)

catalog -> core
core -X-> catalog, legacy, application, browser
```

Core knows what a pawn, door, material, and diet are. It does not know FieldAgent, Steel, SCP-999, or Site 828. The caller supplies entity definitions to site instantiation and material definitions to ticking/commands. There is no hidden default catalog or global registration. The catalog index only lists entries; it does not implement their behavior.

## Layout

```text
simulation/
	core/
		Simulation.ts
		ControlPolicy.ts
		Snapshot.ts
		entity/
			Entity.ts
			EntityTemplate.ts
			Item.ts
			Door.ts
			Facility.ts
			pawn/
				Pawn.ts
				Needs.ts
				Health.ts
				Response.ts
				Autonomy.ts
				concerns/
					Concern.ts
					Concerns.ts
					Threat.ts
					Care.ts
				actions/
					Action.ts
					ActionQueue.ts
					NeedActions.ts
					Move.ts
					Take.ts
					Drop.ts
					Eat.ts
					Wait.ts
					Sleep.ts
					Relax.ts
					Research.ts
					Read.ts
					Exercise.ts
					Attack.ts
					Flee.ts
					Treat.ts
					FacilityAction.ts
					FindTarget.ts
		material/
			Material.ts
		site/
			Site.ts
			EntityPlacement.ts
			TileMap.ts
			Tile.ts
			Pathfinding.ts
			Visibility.ts
			Transfer.ts
	catalog/
		actors/staff/FieldAgent.ts
		actors/staff/Researcher.ts
		actors/staff/Soldier.ts
		actors/staff/Medic.ts
		actors/threats/HostileGuard.ts
		entities/doors/AutomaticSteelDoor.ts
		entities/supplies/PackagedMeal.ts
		entities/furniture/Bed.ts
		entities/furniture/Armchair.ts
		entities/equipment/ResearchDesk.ts
		entities/furniture/Bookshelf.ts
		entities/equipment/ExerciseBike.ts
		materials/
			Steel.ts
			Wood.ts
			Plastic.ts
			Stone.ts
			PlantFood.ts
			AnimalTissue.ts
		sites/tests/SharedActions.json
		sites/tests/RestAndResearch.json
		sites/tests/DailyLife.json
		sites/tests/ThreatAndCasualty.json
		sites/tests/SightAndPassage.json
		index.ts
```

There are no redundant `entity/entities` or `action/actions` levels. Actions belong beneath Pawn because pawns execute them. Materials have their own branch because a material is a definition, not an entity. Spatial mechanics and ownership transfers live with sites.

When implemented, named anomalies belong under `catalog/actors/anomalies`, ordinary authored maps under `catalog/sites`, and quests under `catalog/quests/<quest>/quest.ts`. Stage folders are useful when a stage actually has multiple files/assets. Do not create empty quest, actor, or site stubs just to fill out the proposed tree. Quest content must not own a site's lifetime. Reusable quest mechanics belong in core when needed.

## Entity, Template, Material

- **Entity** is a persistent physical instance with identity, location, material, and amount. A site or transfer owns its actual record.
- **Pawn** is an entity with agency and an action queue. Agency, independent movement, player permission, autonomy, and carryability are distinct. Staff and anomalies are definitions, not separate entity stores.
- **Item** is a loose physical object. It has no mandatory food subtype. A **Door** has door mechanics; it is not an item just because it is made of steel.
- **Facility** is a reusable activity location in the same entity collection, not a separate store. Its activities specify duration and signed need changes. A bed, armchair, and research desk are catalog templates of facilities, not hard-coded targets in autonomy. Facilities can be carried when unused but cannot be used in inventory.
- **EntityTemplate** describes a named model: stable definition ID, display name, description, and initial defaults. Multiple instances share a definition ID, never an instance ID or mutable defaults. The generic contract lives in [EntityTemplate.ts](core/entity/EntityTemplate.ts); concrete models live in the catalog. There is no universal Definition abstraction.
- **Material** describes what an entity is made of. A steel ingot and a steel door can share a material without sharing their entity kind. Instance `amount` is remaining abstract material units, not a weight simulation.

Catalog entries are intentionally small, wiki-like records. For example, [FieldAgent.ts](catalog/actors/staff/FieldAgent.ts) gives its description, capabilities, needs, and diet; [AutomaticSteelDoor.ts](catalog/entities/doors/AutomaticSteelDoor.ts) selects steel and automatic operation. [Door.ts](core/entity/Door.ts) contains the mechanics. Add source/attribution/license metadata with externally sourced content; no new SCP content is authored in this slice.

Named content may eventually need unique behavior beside its catalog entry. Add a narrow core behavior interface when such a feature is implemented; do not put named-definition tests in the coordinator or prebuild an ECS/plugin framework. Display documentation can later be generated from catalog metadata; a wiki generator is not implemented here.

## Actions Stay Together

[Move.ts](core/entity/pawn/actions/Move.ts) owns movement execution: eligibility, requesting a route, checking the next step, performing required door opening, and arrival. Shared spatial queries own terrain/entity obstruction and interaction routing. Take, Drop, Eat, and Wait each own their corresponding checks and effects. Approach movement is reused, not copied into a second execution system.

Each action class implements `canStart` and `tick`. [ActionQueue.ts](core/entity/pawn/actions/ActionQueue.ts) has a small constructor dispatch and generic queue advancement, not a switch containing each action's rules. Adding a new action means its class, serializable action shape, and constructor entry. Only one queued action gets a turn; the next begins on the next tick.

Action handlers are short-lived code objects, not saved class instances. Progress, source, target, and blocker are ordinary JSON queue data. Cancellation removes that intention only: it does not undo consumed material, earned research progress, need changes, drop a carried entity, teleport anything, or change autonomy. Facility occupancy is derived from the active action's work progress, so removing the queue entry releases it without a second reservation ledger or cancellation hook.

[ControlPolicy.ts](core/ControlPolicy.ts) checks player/script/debug authority and edits queues. Immediate starts use the action's own checks. Appended intentions may depend on earlier actions (for example Take then Drop), so their physical eligibility is deferred until execution. A blocked action stays queued and retries against current state; it can be cancelled. Previews return eligibility without mutation or event publication. Debug authority bypasses player permission, not the executor's physical rules.

## Sequential Ticks

The proposal/resolver system has been deleted. [Simulation.ts](core/Simulation.ts) clones the caller's state once, then executes directly against that working state:

1. Increment the global tick and capture each site's starting entity IDs.
2. Tick sites and entities in ascending, case-sensitive ID order.
3. Each entity sees changes made by earlier turns. Removed entities are skipped; newly added IDs wait until the next tick.
4. Advance transit physiology and commit unblocked arrivals after all site turns.
5. Return the finished state and events. The input remains untouched.

This boundary copy is for caller isolation, not simultaneous simulation: actions do not read an old snapshot or emit proposals for a later resolver. Stable ordering makes replay reproducible but deliberately gives earlier IDs priority. First successful movement/consumption wins. Later movers can enter a tile vacated earlier in the same tick. Swaps, fairness rotation, and traffic optimization are not implemented. Pathfinding routes around current blocking entities, including pawns. If no route exists, an active action waits and retries against the next tick's state.

Opening a closed automatic door spends the opener's turn without movement. A later entity sees that door as open immediately. Door closure checks current nearby ground occupants when the door gets its own turn. There is no special end-of-tick door resolver.

Pawn physiology advances once on the pawn's turn, including while carried. A carried pawn cannot act independently. Transit-owned pawns advance needs and bleeding once outside sites, and arrivals receive no extra local turn. Optional health conditions are separate from needs. Incapacitating wound severity or blood loss disables `canAct`; death and recovery are not implemented.

Autonomy off prevents new self-selected work, not queued commitments or physiology. Player permission is rechecked at execution. [Autonomy.ts](core/entity/pawn/Autonomy.ts) asks for a response to an observed concern first, then a needs-based action, then a configured patrol destination. It names no individual need or named actor and never performs a separate version of an action.

## Concerns And Response

A **cause** is a fact the pawn observes, such as a hostile actor or a bleeding person. A **concern** is the reason to respond to that cause. **Urgency** is the concern's priority, not another need to replenish. A **response** is the action selected using the pawn's policy and capabilities. [Concern.ts](core/entity/pawn/concerns/Concern.ts) carries cause ID, category, urgency and action; it is derived from current observation rather than stored as a second world-state ledger.

[Threat.ts](core/entity/pawn/concerns/Threat.ts) and [Care.ts](core/entity/pawn/concerns/Care.ts) own the local reasoning. [Concerns.ts](core/entity/pawn/concerns/Concerns.ts) selects a concern and owns conservative interruption policy. Concerns take precedence over routine needs as a separate priority group; their numeric urgency is not compared with hunger or curiosity. Initial priorities are immediate danger/confrontation 100, allied bleeding care 80, and withdrawal from a more distant threat 60. Equal concern scores follow provider order; threat distance and patient bleeding use stable ID ties.

Optional [Response.ts](core/entity/pawn/Response.ts) data specifies faction, hostile factions, sight range, flee/confront policy and attack/medical capabilities. Catalog staff are not special-cased in the core: Soldier confronts because its data allows attacking, Researcher flees, and Medic treats when immediate danger does not take precedence. Faction hostility is explicit observer policy, not an assumption about every other faction. Medical supply charges and attack capability values are prototypes, not equipment or qualifications systems.

`Response` is a plain data interface, not a class that executes behaviors or a framework for adding needs. Its current bundling of perception, faction policy and capabilities is provisional. New ordinary needs extend need data/action offers, not this interface. If equipment, skills or perception gain their own mechanics, move those responsibilities to their actual owners rather than turning Response into a growing list of unrelated settings.

[Visibility.ts](core/site/Visibility.ts) uses the existing pathfinding library's line expansion within Manhattan sight range. Tile and ground-entity `blocksSight` properties determine transparency independently of movement; diagonal corner checks use the same sight rules. Catalog walls, closed steel doors and bookshelves obscure sight; pawns, low furniture and meals do not. There is no hearing, shared radio knowledge, observation memory or pursuit of last-known positions. A lost target is not tracked through walls by Attack or Treat. No Fear or Sanity bar is added: perceived danger creates a concern directly. Social remains deferred.

### Physical Responses

- **Attack:** approach through shared movement, then spend consecutive adjacent windup ticks before adding an actual wound. Moving or blocked approach resets windup. Loss of sight or target incapacitation ends the attack. The initial attacks are close-range; no projectiles, ammo, armor, death or ranged tactics are implemented. Soldiers deal 30 severity per two productive ticks; the stationary hostile guard deals 8 per three ticks and can actually injure nearby opponents.
- **Flee:** re-evaluate visible hostiles and step toward a cardinal neighbor that increases distance from the nearest of them. It uses normal obstruction/door handling. No currently visible threat ends the action. This is local withdrawal, not guaranteed escape: a corner or route requiring a temporary approach can leave it blocked. Loss of sight means no current observed danger, not proof the area is safe.
- **Treat:** approach a visible allied patient, work four consecutive adjacent ticks, then spend one medical charge to stop the most actively bleeding wound. Moving, blocked approach or nearby danger resets treatment progress. Treatment changes bleeding and records the medic ID, but preserves wound severity and accumulated blood loss. Another medic completing first cannot cause duplicate spending on that wound. A medic can finish further wounds in later actions while supplies remain.

[Health.ts](core/entity/pawn/Health.ts) holds wounds (ID, severity, bleeding rate, optional treating actor) and accumulated blood loss. Bleeding advances regardless of autonomy, queue or transit ownership. A total wound severity or blood loss of 100 incapacitates immediately; stabilization does not automatically restore the ability to act. Values are prototype units, not clinical physiology. Wounds are not a generic low-health bar to fill, and injury is not copied into a synthetic treatment need. No self-treatment, long-term healing or medical appointment system is included.

### Commitments And Interruption

New concerns interrupt only self-chosen facility activities, movement or waiting. Abandoning such an intention preserves earned output and releases facility use through the existing queue-derived ownership. Pending explicit orders are retained. Player/script/debug orders are not automatically overridden; turning autonomy off suppresses new response selection, not health progression or already queued responses. There is no new draft/enlistment state.

Attack and Flee remain active commitments. Self-chosen Treat can be abandoned for immediate danger; explicit Treat instead blocks until safe or cancelled. Care avoids patients within two tiles of a visible threat, and treatment also checks the medic's immediate surroundings. These are bounded safety heuristics, not coordinated squad tactics or complete interruption arbitration. Carrying is never silently undone and physiology/capability guards still apply before execution.

[ThreatAndCasualty.json](catalog/sites/tests/ThreatAndCasualty.json) is the acceptance scenario: soldier, civilian researcher, medic, wounded staff member and a stationary hostile guard. No timed script or controller order forces responses. The test advances up to 40 ticks and checks attacks, increased civilian separation and treated bleeding with finite supply consumption. It also checks unchanged input, insertion-order independence and save/reload continuation. Exact routes and response ticks are intentionally not the contract.

### Need-Driven Selection

[Needs.ts](core/entity/pawn/Needs.ts) owns need progression and generic urgency selection. Need values represent relative deficits on the same 0..100 scale: zero is satisfied; positive values up to 100 compete by urgency, highest first, with case-sensitive need ID breaking ties. Fractional values from need progression are retained. There is no minimum urgency cutoff beyond zero. Absent or satisfied needs do not invoke providers. An unsupported or currently unsatisfiable need does not prevent trying the next one: hunger 95 with no available food can fall through to fatigue 10 when a rest provider is available. A free pawn may choose food even at low positive hunger if no more urgent satisfiable need takes precedence.

A `NeedActionProvider` exposes non-mutating `offer(context, needId)`, returning an ordinary action description and positive `relief`, or null. It does not declare one exclusive need. For the highest-urgency need with an available offer, choose the action offering the greatest relief; equal relief uses registration order. Each provider first chooses its nearest eligible reachable target by Manhattan distance then entity ID. Relief is the reduction on the next productive tick, capped at the current deficit, not the entire session's benefit. Costs to other needs do not count as relief. No cross-need weighted utility, travel-cost optimization, or queue preemption is attempted.

Each action owns its offer logic. Eat matches hunger to material/diet-aware consumption. Facility actions discover the reductions advertised by the facility's activity data, so one action can offer relief for several needs. [NeedActions.ts](core/entity/pawn/actions/NeedActions.ts) only lists those providers. Adding another action does not require a named-need switch in Autonomy or Needs. [FindTarget.ts](core/entity/pawn/actions/FindTarget.ts) shares eligible/reachable target search between eating and facility activities; it replaces the former food-only search TODO without adding Provider/Consumer inheritance.

The generic selector tests cover arbitrary needs and offer strengths. Real activity tests cover hungry-with-no-food choosing Sleep, stress choosing Relax, occupied-bed alternatives, optional curiosity choosing Research, and replay/cancellation. The interface remains intentionally small and provisional; the concrete behaviors are the reason for its shape.

## Sleep, Relax, And Research

[FacilityAction.ts](core/entity/pawn/actions/FacilityAction.ts) shares the mechanics that proved identical across sustained activities: checking a ground facility, approaching its interaction position, acquiring exclusive use on the first work tick, applying effects, and finishing a bounded session. The small concrete classes select the corresponding advertised activity. Research additionally checks for a research record and increments its progress. The generic helper does not contain a switch of action-specific effects or outputs.

Initial catalog tuning, per productive tick (negative reduces a deficit):

| Facility / Action        | Work Ticks | Fatigue | Stress | Curiosity | Output                     |
| ------------------------ | ---------: | ------: | -----: | --------: | -------------------------- |
| Bed / Sleep              |          8 |      -8 |     -2 |      none | none                       |
| Armchair / Relax         |          6 |      -1 |     -6 |      none | none                       |
| Research desk / Research |          6 |      +1 |     +3 |        -4 | +1 local research progress |

These are prototype values, not a time or health model. Every pawn's normal need progression still runs once before action effects. Signed changes are clamped to 0..100 and apply only to needs that pawn has; sleeping does not manufacture stress, and researching does not manufacture curiosity. Staff templates have hunger, fatigue and stress. Curiosity is optional, used by a research-oriented pawn or test; staff without it can still be explicitly ordered to research for its output.

Sessions last the configured number of actual work ticks even if a need reaches zero early. Travel, door opening, and blocked ticks earn no effects or progress. `workTicks` lives in queued action state, while `elapsed` includes the whole intention. New commands reset workTicks to zero; save restore preserves it. Autonomy off does not interrupt active sessions. Rising stress does not preempt research mid-session; it can change the next chosen action. Cancellation retains past benefits/costs/output and abandons the remaining session.

One facility serves one pawn at a time. Travel does not reserve it: first productive turn wins in stable actor order. Active use is derived from the current action with workTicks > 0. Occupied facilities are omitted from new autonomous searches, and already queued competitors wait/retry. Completion or cancellation releases use immediately. A paused/blocked active user retains the commitment until completion or cancellation; richer interruption policy is deferred. Occupied facilities cannot be picked up or dispatched in a transfer. Target removal or carrying prevents further work and exposes a blocker, not a substitute target.

Facilities currently occupy one blocking tile; the pawn works at an adjacent reachable tile. Bed/chair names do not imply lying/sitting animation or occupying the furniture footprint. The browser still runs the archive, so these activities are headless only.

[RestAndResearch.json](catalog/sites/tests/RestAndResearch.json) is the authored trial used by activity tests. It starts with a hungry, tired, stressed operator, no food, and a bed/chair/desk. Research progress is a durable counter on that desk, not a global currency, quest completion, specimen study, technology unlock, or implemented research project system. No social interaction model is added here.

### Reading And Daily Care

The next concrete activities reuse the same session, occupancy and offer mechanics without changing the selector:

| Facility / Action        | Work Ticks | Reduces Per Work Tick                 | Increases Per Work Tick |
| ------------------------ | ---------: | ------------------------------------- | ----------------------- |
| Bookshelf / Read         |          6 | Curiosity 3, Restlessness 4, Stress 1 | none                    |
| Exercise bike / Exercise |          5 | Restlessness 6, Stress 2              | Fatigue 3, Hunger 1     |

**Curiosity** is the desire to learn or investigate. **Restlessness** is the desire for a change of activity, relieved by physical exercise or reading. There is no separate Boredom need: the proposed Boredom/Restlessness overlap was consolidated at the user's request. Curiosity remains distinct rather than becoming a synonym for entertainment.

[Researcher.ts](catalog/actors/staff/Researcher.ts) is an optional staff template with growing Curiosity and Restlessness. Ordinary FieldAgent defaults remain hunger/fatigue/stress only. Hygiene, washing, and washbasins have been removed at the user's request, not retained as optional content. No fitness progression or powered exercise equipment is implied by facility names.

[DailyLife.json](catalog/sites/tests/DailyLife.json) places a researcher among ordinary study/care facilities and six meals. Tests cover a 300-tick autonomous run, research versus reading, exercise leading to sleep, per-action reload continuation, and absent needs. Reading is not research and creates no desk progress.

### Original Spec Priorities

The [product specification](../../README.md#needs-and-psychological-state) initially names satiety and rest, with recreation, comfort and social contact affecting stress rather than separate decaying bars. The more detailed [Personnel Model](../../docs/personnel-model.md#3-transient-needs-and-pressures) lists Food, Energy, Social, Stress and Fear. These documents disagree about a separate Social reserve; implementing social interaction is useful either way, but the representation should be settled before adding that value.

Food/Energy correspond to the replacement's hunger/fatigue deficits (opposite polarity); Stress is implemented in simplified form. Social interaction and fear responses are the next spec-backed gaps. Cards/conversation can provide social contact and stress relief; comfort, poor conditions and isolation can contribute to stress. Fear should follow perceived danger and safety, not rise like hunger. Mood, sanity and composure are derived outcomes in the spec, not additional replenishable needs. Curiosity is a user-endorsed extension. Restlessness is also a later experiment, not a need specified in those original documents; it remains unchanged in the hygiene-removal pass.

The current policy favors specialists when all facilities are available: research gives more immediate Curiosity relief than reading, and exercise gives more Restlessness relief. Reading is a useful fallback when either specialized option is unavailable. Multi-need side benefits do not override the highest-need-first policy. This is a visible tuning limitation, not a reason to add personality randomness or a predictive utility framework yet.

## Traversal And Interaction

Entities declare `blocksMovement`: true prevents sharing their ground tile, false permits it. Catalog staff block by default, loose meals do not, and any other placed item can block without being a pawn. Carried entities never independently obstruct their carrier's tile. The moving actor is excluded from its own obstruction query. All ground entities on a tile are considered; one blocking entity is enough to prevent entry.

Tiles and entities separately declare `blocksSight`. Neither obstruction implies the other:

| Example                      | Blocks Movement | Blocks Sight |
| ---------------------------- | --------------- | ------------ |
| Solid wall or tall bookshelf | yes             | yes          |
| Glass wall or low crate      | yes             | no           |
| Dense mist                   | no              | yes          |
| Open floor or loose meal     | no              | no           |

[Tile.ts](core/site/Tile.ts) defines the two tile properties and the basic `.` (open) and `#` (solid) symbols. An authored site's optional `tiles` dictionary supplies additional symbols or overrides defaults. [SightAndPassage.json](catalog/sites/tests/SightAndPassage.json) uses `g` for transparent impassable glass and `m` for opaque passable mist. Core knows those properties, not those example names. `tileAt` is the shared lookup; `floorAt` means terrain permits movement, not that the terrain is optically clear. Unknown/out-of-bounds tiles permit neither movement nor sight. Site instantiation checks defined symbols and clones the dictionary; save restore preserves it.

Sight checks all ground entities along the line. Carried items do not independently occlude sight. The observer and target entities do not occlude their own sight test, so an opaque object itself can be seen while still hiding entities behind it. Other opaque entities sharing the target or observer tile still block, as does an opaque terrain tile. Mist is binary opacity here, not distance attenuation, diffusion, height or volumetric fog. These are simulation properties, not new rendering assets.

[TileMap.ts](core/site/TileMap.ts) exposes `traversalAt(site, position, actorId)`, returning clear, blocked with a reason, or an automatic door that must be opened. Door state determines its passage: open allows entry, closed automatic requires opening, and other closed doors block. An automatic door never masks another obstruction sharing its tile. The door requirement is not a third occupancy class.

Doors remain an explicit domain exception: an open door does not obstruct movement or sight; a closed door uses its `blocksSight` property and the existing opening policy. Thus a closed glass door can transmit sight while blocking entry, and a closed opaque automatic door can be part of a planned route without being immediately traversable. Opening a door does not override opaque terrain or another blocker on its tile. The catalog must place doors on movement-permitting terrain.

[Pathfinding.ts](core/site/Pathfinding.ts) and Move use that same query. A\* can plan through a door that can be opened, while actual stepping must open it first. Move rechecks before entry; no separate pawn-only occupancy rule exists. Movement orders can target currently occupied floor, since it may clear before execution; accepting an intention does not guarantee a route. Transfer arrivals require clear traversal and cannot remotely open doors. Routing allows departure from an already shared origin (for example after putting down cargo), but does not authorize entry into another obstructed tile.

`interactionRoute` finds a shortest route to the target tile or a cardinally adjacent usable tile, with a fixed candidate order for ties. Take and Eat use it through `Move.approach`; food discovery uses it to test reachability. A blocking crate can therefore be approached and picked up without standing inside it. Routes and interaction positions are recomputed from current state rather than reserved in advance. The initial model has one-tile entities and cardinal interaction reach, not footprints or arbitrary interaction sockets.

Crossing-only occupancy (`canTraverse` but not `canStop`) is deliberately deferred: discrete movement would otherwise need rules for temporary overlaps, interrupted crossings, and cancellation. Start with blocking/nonblocking rather than inventing those rules implicitly.

## Diets Without Food Subclasses

[Material.ts](core/material/Material.ts) defines descriptive tags and diet rules. Tags are catalog strings, not a core enum. Each diet rule matches one tag and specifies nourishment per unit for that consumer. If several rules match, the highest nourishment applies once; values do not stack.

Examples: a metalivore accepts `metal`, a plastic consumer accepts `plastic`, and an ordinary plant-food diet accepts `edible-plant`. Wood is tagged `organic`, `plant`, and `wood`, not `edible-plant`. Classification does not imply digestibility. No special branch in Eat knows steel, plastic, meat, or meals.

[Eat.ts](core/entity/pawn/actions/Eat.ts) owns both candidate filtering and consumption. Autonomous food selection considers acceptable, reachable items by distance then ID. Dynamic pawn obstruction can still make an action wait. Explicit orders keep their specified target and never silently substitute another. An eat action approaches, rechecks, consumes at most one unit, reduces hunger according to the diet, and removes an exhausted item. Fractional remainders are supported. Pawns with no hunger need do not search for or consume food.

Facility activities now advertise signed need effects, while Eat derives its offer from the particular consumer's diet. A material becomes food relative to the consumer, not through a universal food advertisement. Shared target search checks physical reachability and action eligibility; execution always rechecks current state. Future social/comfort activities can extend this only when their real mechanics require it.

For now, **only loose items are consumable**. Material matching alone does not authorize eating installed doors or living pawns; structural damage and predation need their own consequences. There is one material per entity, no mixtures, digestion chemistry, calories, or weight model. Extend only when actual content needs more.

## Sites, Transfers, And Saves

[SharedActions.json](catalog/sites/tests/SharedActions.json) is an authored site: rectangular terrain rows, an optional tile-property dictionary, and placements naming catalog templates, local IDs, locations, and optional instance overrides. [EntityPlacement.ts](core/site/EntityPlacement.ts) owns placement data and instance construction beside site loading, separate from the reusable entity-template contract. Overrides replace supplied top-level fields; they are not a recursive patch language and cannot change entity kind. `instantiateSite` clones defaults, allocates fresh site/entity IDs, and remaps carried references, queued targets, and initial action IDs. Site instantiation checks geometry/references; this is trusted developer content, not a hardened mod loader.

```ts
import { entities, materials } from "./catalog";
import template from "./catalog/sites/tests/SharedActions.json";
import { createSimulation, advanceSimulation } from "./core/Simulation";
import { instantiateSite, type SiteTemplate } from "./core/site/Site";

const created = instantiateSite(
  createSimulation(),
  template as SiteTemplate,
  entities,
);
const next = advanceSimulation(created.state, materials);
```

Transfers accept prepared ground entities at a loading tile, require empty travelling pawn queues, include carried dependencies, and move actual records into transit ownership. Blocked arrivals retain their payload and reason. Active transfer endpoints cannot be disposed; otherwise an empty site can be deleted. Transfer helpers are headless domain operations, not player-authorized UI endpoints yet. No arrival creates a second identity or ticks its needs twice.

[Snapshot.ts](core/Snapshot.ts) is JSON stringify/parse, root/version checks, and try/catch only. Restoring preserves IDs and state exactly; it is distinct from instantiation. Templates/handlers are supplied by code, not serialized or revived. Version 8 adds independent sight obstruction and authored tile properties and discards earlier experimental shapes; there are no migrations or deep save validators.

## Verification And Scope

Run `npm run test:simulation` from the web project. Tests cover sequential contention and following, detached inputs, door behavior, material-driven eating and quantities, autonomous versus explicit targets, control/autonomy/cancellation, carried-pawn identity, authored instances, save replay, multi-site/transit ownership, and forbidden dependency directions.

`npm run check` also validates the archived application's tests/build. That does not mean the replacement is connected to the browser. Not ported: full Site 828, SCP behaviors, quests, personnel dossiers, qualifications, jobs, construction, power, full clinical care or combat systems, richer transport, or UI binding. The response encounter above implements only its stated bounded physical behaviors. Selectively reuse useful legacy calculations; do not preserve old implementations merely to satisfy old tests.
