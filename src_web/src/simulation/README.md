# Simulation

This is the replacement headless simulation. The previous engine remains in [../simulation_legacy](../simulation_legacy) for reference. Existing browser/application bindings still explicitly run that archive; this directory has no legacy imports or compatibility facade.

The replacement is playable through the [command-line console](#command-line-console). Its quests and integration tests share the same scenario session and pass/fail evaluator.

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
			Consumption.ts
			Study.ts
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
					Study.ts
					Read.ts
					Exercise.ts
					Attack.ts
					Flee.ts
					Treat.ts
					FacilityAction.ts
					FindTarget.ts
		material/
			Material.ts
		quest/
			Quest.ts
		site/
			Site.ts
			EntityPlacement.ts
			TileMap.ts
			Tile.ts
			Pathfinding.ts
			Visibility.ts
			Transfer.ts
			Deployment.ts
	catalog/
		actors/staff/FieldAgent.ts
		actors/staff/Researcher.ts
		actors/staff/Soldier.ts
		actors/staff/Medic.ts
		actors/threats/HostileGuard.ts
		actors/anomalies/SCP1370.ts
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
		quests/
			response/{quest.ts,setup.ts}
			daily/{quest.ts,setup.ts}
			colony/{quest.ts,setup.ts}
			consumption/{quest.ts,setup.ts}
			scp1867/{quest.ts,setup.ts,collection.ts,README.md}
			scp1370/{quest.ts,setup.ts,display.ts,README.md}
		sites/tests/SharedActions.json
		sites/tests/RestAndResearch.json
		sites/tests/DailyLife.json
		sites/tests/ThreatAndCasualty.json
		sites/tests/SightAndPassage.json
		index.ts
```

There are no redundant `entity/entities` or `action/actions` levels. Actions belong beneath Pawn because pawns execute them. Materials have their own branch because a material is a definition, not an entity. Spatial mechanics and ownership transfers live with sites.

When implemented, named anomalies belong under `catalog/actors/anomalies` and ordinary authored maps under `catalog/sites`. Quests live under `catalog/quests/<quest>/quest.ts` with shared gameplay initialization in `setup.ts`. Human-readable pass/fail transcripts live alongside each quest in its explicitly test-only `tests/` folder. They are not imported by gameplay or registered as variants. The automated replayer and additional state-level tests remain under the web project's `test/` tree. Stage folders are useful when a stage actually has multiple files/assets. Do not create empty quest, actor, or site stubs just to fill out the proposed tree. Quest content must not own a site's lifetime.

## Entity, Template, Material

- **Entity** is a persistent physical instance with identity, location, material, and amount. A site or transfer owns its actual record.
- **Pawn** is an entity with agency and an action queue. Agency, independent movement, player permission, autonomy, and carryability are distinct. Staff and anomalies are definitions, not separate entity stores.
- **Item** is a loose physical object. It has no mandatory food subtype. A **Door** has door mechanics; it is not an item just because it is made of steel.
- **Facility** is a reusable activity location in the same entity collection, not a separate store. Its activities specify duration and signed need changes. A bed, armchair, and research desk are catalog templates of facilities, not hard-coded targets in autonomy. Facilities can be carried when unused but cannot be used in inventory.
- **EntityTemplate** describes a named model: stable definition ID, display name, description, and initial defaults. Multiple instances share a definition ID, never an instance ID or mutable defaults. The generic contract lives in [EntityTemplate.ts](core/entity/EntityTemplate.ts); concrete models live in the catalog. There is no universal Definition abstraction.
- **Material** describes what an entity is made of. A steel ingot and a steel door can share a material without sharing their entity kind. Instance `amount` is remaining abstract material units, not a weight simulation.

Catalog entries are intentionally small, wiki-like records. For example, [FieldAgent.ts](catalog/actors/staff/FieldAgent.ts) gives its description, capabilities, needs, and diet; [AutomaticSteelDoor.ts](catalog/entities/doors/AutomaticSteelDoor.ts) selects steel and automatic operation. [Door.ts](core/entity/Door.ts) contains the mechanics. SCP-derived entries include attribution and explicit adaptation notes, also exposed by CLI inspection. The first source-backed quests are SCP-1867 collection corroboration and SCP-1370 gallery recovery.

Named content may eventually need unique behavior beside its catalog entry. Add a narrow core behavior interface when such a feature is implemented; do not put named-definition tests in the coordinator or prebuild an ECS/plugin framework. Display documentation can later be generated from catalog metadata; a wiki generator is not implemented here.

## Actions Stay Together

[Move.ts](core/entity/pawn/actions/Move.ts) owns movement execution: eligibility, requesting a route, checking the next step, performing required door opening, and arrival. Shared spatial queries own terrain/entity obstruction and interaction routing. Take, Drop, Eat, and Wait each own their corresponding checks and effects. Approach movement is reused, not copied into a second execution system.

Each action class implements `canStart` and `tick`. [ActionQueue.ts](core/entity/pawn/actions/ActionQueue.ts) has a small constructor dispatch and generic queue advancement, not a switch containing each action's rules. Adding a new action means its class, serializable action shape, and constructor entry. Only one queued action gets a turn; the next begins on the next tick.

Action handlers are short-lived code objects, not saved class instances. Progress, source, target, and blocker are ordinary JSON queue data. Cancellation removes that intention only: it does not undo consumed material, earned research progress, need changes, drop a carried entity, teleport anything, or change autonomy. Facility occupancy is derived from the active action's work progress, so removing the queue entry releases it without a second reservation ledger or cancellation hook.

[ControlPolicy.ts](core/ControlPolicy.ts) checks player/script/debug authority and edits queues. Immediate starts use the action's own checks. Appended intentions may depend on earlier actions (for example Take then Drop), so their physical eligibility is deferred until execution. Previews return eligibility without mutation or event publication. Debug authority bypasses player permission, not the executor's physical rules.

### Action Outcomes

- `completed`: the intention finishes and the next queued action may start next tick.
- `blocked`: current conditions prevent progress. Explicit orders wait for correction or cancellation; self-chosen actions retry for at most eight consecutive blocked ticks.
- `failed`: the target no longer exists. The queue removes this intention and emits an identified failure; it does not silently substitute another target. Later autonomous selection or pending orders can proceed next tick.
- `interrupted`: incapacity, being carried, an urgent concern, or the autonomous blocked-tick limit ends a commitment. Past resource use and effects are retained. Facility use releases without dropping or teleporting anything.

Player permission revocation pauses an explicit order rather than deleting it. Repeated autonomous blocking may still lead to rediscovery of the same option when it appears eligible; there is no general blacklist or traffic deadlock solver. Permanent missing targets are distinguished structurally, not by parsing error strings. Other action-specific invalid states currently remain blocked and use the retry policy. Explicit cancellation removes the named intention through the command result; it is not a simulated completion event.

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

Sessions have a configured maximum number of actual work ticks. Self-chosen restorative activities finish early when all their applicable benefits are satisfied; explicit sessions and productive Research retain their configured duration. Travel, door opening, and blocked ticks earn no effects or progress. `workTicks` lives in queued action state, while `elapsed` includes the whole intention. New commands reset workTicks to zero; save restore preserves it. Autonomy off does not itself interrupt active sessions. Rising stress does not preempt research mid-session; it can change the next chosen action. Cancellation retains past benefits/costs/output and abandons the remaining session.

One facility serves one pawn at a time. Travel does not reserve it: first productive turn wins in stable actor order. Active use is derived from a capable ground pawn's current action with workTicks > 0. Occupied facilities are omitted from new autonomous searches, and already queued competitors wait/retry. Completion, failure, interruption or cancellation releases use. An incapacitated or carried pawn no longer reserves furniture indefinitely. Its physical body remains where it is and may still block that tile. Occupied facilities cannot be picked up or dispatched in a transfer.

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

[Material.ts](core/material/Material.ts) separates nutritional density from consumer compatibility. A material's optional `nutrition` is nourishment available per material unit (default 1 in these abstract units). An entity's `nutrition` overrides that density, so meals using the same material can differ. [PackagedMeal.ts](catalog/entities/supplies/PackagedMeal.ts) explicitly provides nutrition 30. Each diet rule matches a catalog tag and supplies a conversion `efficiency`; 1 means full conversion and 0.5 means half. The highest matching efficiency applies once, never summed. An incompatible material provides no nourishment even if its object-level nutrition is high. Zero nutrition explicitly makes an otherwise compatible object non-nourishing.

Examples: a metalivore accepts `metal`, a plastic consumer accepts `plastic`, and an ordinary plant-food diet accepts `edible-plant`. Wood is tagged `organic`, `plant`, and `wood`, not `edible-plant`. Classification does not imply digestibility. No special branch in Eat knows steel, plastic, meat, or meals.

[Eat.ts](core/entity/pawn/actions/Eat.ts) owns both candidate filtering and consumption. Autonomous selection considers compatible, eligible, reachable objects by distance then ID. Explicit orders retain their target. Every productive tick consumes the minimum of the pawn's `eatingRate`, remaining material, and the amount needed to satisfy current hunger. Hunger reduction is consumed amount times nutritional density times dietary efficiency. Staff eat 0.1 material units per tick, so one full meal portion takes ten productive ticks when sufficient hunger remains. Offers use that same per-tick rate, rather than advertising a whole meal's benefit immediately.

Eating remains queued until the pawn is satisfied or the object is exhausted. Travel and blocked time do not consume anything. Cancelling abandons only the intention: the same food ID, location and remaining amount persist. The pawn can leave and return, reload a save, carry/drop leftovers, or another pawn can finish them. Reissuing Eat resumes from the object's actual remaining amount; no duplicate action-owned food progress is stored. Fully satisfied pawns consume nothing. Tiny floating-point remainders are treated as zero. Pawns lacking hunger or a positive eating rate cannot consume food. Plain quantities represent divisible portions, not physical plates or packaging.

Facility activities now advertise signed need effects, while Eat derives its offer from the particular consumer's diet. A material becomes food relative to the consumer, not through a universal food advertisement. Shared target search checks physical reachability and action eligibility; execution always rechecks current state. Future social/comfort activities can extend this only when their real mechanics require it.

Material-compatible consumers can also eat doors and unoccupied facilities. [Consumption.ts](core/entity/Consumption.ts) removes actual material and proportionally reduces optional `integrity`: removing a quarter of remaining material also removes a quarter of remaining integrity. Structural catalog objects start at 100 integrity. Independent `damageIntegrity` reduces condition without removing material; bent or broken objects are not assumed to have lost mass. No repair mechanic or implicit regeneration exists, so repairing cannot presently create food.

An object's integrity reaching zero makes it nonfunctional and nonobstructing but leaves its remaining material as consumable remnants. Amount reaching zero removes the actual entity, so doors stop blocking and queued references fail through the existing missing-target path. This is a simple structural model, not fracture physics, salvage spawning or geometry-based partial holes. Materialless damage does not replenish or erase edible quantity.

Occupied facilities, objects carrying other entities, and objects carried by someone else cannot be eaten. Pawn entities are excluded regardless of diet: predation is not implemented. Tile materials are not entities and cannot be eaten through this action. There is one material per entity, no mixtures, digestion chemistry or weight model. A metalivore or wood-eater is a pawn with matching diet data, not another Eat implementation.

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

[Snapshot.ts](core/Snapshot.ts) is JSON stringify/parse, root/version checks, and try/catch only. Restoring preserves IDs and state exactly; it is distinct from instantiation. Templates/handlers are supplied by code, not serialized or revived. Version 11 adds physical study plans and findings, discarding earlier experimental shapes; there are no migrations or deep save validators. CLI session saves also retain quest counters/status and the most recent 100 events, with a session root version and matching simulation version. These are trusted development saves, not a hardened external input format.

## Command-Line Console

From `src_web` with Node 22 selected:

```sh
npm run sim
npm run sim -- --scenario daily
npm run sim -- --scenario colony
npm run sim -- --scenario consumption
npm run sim -- --scenario scp1867
npm run sim -- --scenario scp1370
npm run sim -- --scenario response --batch --ticks 40
npm run sim -- --scenario colony --batch --ticks 1100
npm run benchmark:simulation -- 40
```

`response`, `daily`, `colony`, `consumption`, `scp1867` and `scp1370` have quest conditions; `sight` is an inspection sandbox. The Consumption setup leaves a diner with autonomy off and a two-portion meal; the player must issue an eating order before the deadline. The SCP quests likewise require player-directed recovery and study, not automatic quest-solving scripts. The CLI adapter uses the same [ScenarioSession](../application/ScenarioSession.ts) as the tests, not the archived browser controller. Vite is only a local TypeScript module loader in middleware mode; no game HTTP server is started.

To try partial consumption: `load consumption`, `order daniel eat meal`, `step 3`, `cancel daniel`, then `inspect meal`. The meal retains 1.7 units. You can move away, save/restore, and order eating again; the quest succeeds when Daniel is fed and at least a quarter portion remains. `run` alone does not solve this scenario because gameplay setup does not include the test answer.

Each map cell contains its terrain character followed by a stable label. Pawns use roguelike `@1`, `@2`, etc.; non-pawn objects use `o1`, `o2`, etc. The legend shows that label beside the readable name and full identity, including carried entities. Labels are session-wide, saved, and never reassigned when an entity disappears. Multi-digit labels widen all map cells uniformly. `++` means stacked ground occupants; the legend lists all of them. Full IDs, local aliases and displayed labels work in commands, including `move @2 3 5` and `inspect @2`. Bare old numeric tokens such as `02` are no longer used. Coordinates are zero-based. This changes the CLI inspection surface, not the still-legacy browser GUI; a future GUI can reuse the same session labels.

### Deploy Before Starting

The SCP-1370 and SCP-1867 quests load into a `setup` phase: their locations, anomalies and evidence exist, but the player team does not. `status` lists available staff templates, authored entry positions, capacity and required quest roles. No simulation or deadline ticks run during setup, and gameplay orders are rejected until `start`.

```text
load scp1370
deploy field-agent alex
start
inspect @2
move @2 3 5
step 3
```

SCP-1370 is the already-authored pawn `@1`; Alex becomes `@2`. For Blackwood's mission, use `deploy researcher ben`, then `start`. Deployed agents start with autonomy off, matching deliberate player-controlled mission preparation.

Syntax is `deploy <staff-type> <name>`: `researcher` is a template, `ben` is one person's name. All player deployments use the next clear position at the map's authored `entry`; no entry argument is needed. The first agent automatically fills the mission's single required role (handler or investigator). The quest follows that person's actual entity ID, including event and failure checks, rather than requiring a pawn literally named after the role. Further agents are support staff up to the authored team limit (two in each initial SCP quest), without replacing the first agent's role. Unsupported templates, occupied entries, duplicate names and excess team size are rejected without mutation. Names use lowercase letters, digits and hyphens; `oN` labels are reserved. Multi-role mission team assignment is not exposed in the CLI yet.

`start` requires every declared role to be assigned to an available pawn. It creates the quest progress and starts its deadline at the current tick. Deployment and a second start are rejected once running; no free reinforcements are implied. Pre-staffed trials (`response`, `daily`, `colony`, `consumption`) and the sight sandbox still start immediately; they do not offer deployment. These trials retain their authored actors because their purpose is testing those particular states.

Session saves are now version 2 and preserve setup/running phase, deployed team, role bindings, label mappings and counters. Version-1 sessions are discarded without migration; simulation snapshots remain at their current core version. A saved setup can be restored and started normally. Batch mode reports a setup-phase session as incomplete (exit 2); prepare/start/save it through normal commands before using batch restore. This is a standalone deployment-from-template model, not a campaign personnel pool or inter-site transport; future roster deployment must transfer existing identities rather than clone them.

```text
help
load scp1867
deploy researcher ben
start
brief
map
status
inspect ben
order ben take journal
step 20
order ben move 3 3
step 20
order ben drop journal
step 1
queue ben
events
autonomy ben off
cancel ben
sites
site site-1
save /tmp/my-simulation.json
restore /tmp/my-simulation.json
inspect bench
order ben study bench marsh-lead
quit
```

`brief` shows mission context and source credits. `inspect` returns authoritative entity data, catalog description/attribution and currently discoverable concerns and a need-action candidate without changing state. Orders use `order <name|@N> <verb> <target>`, `order <name|@N> move <x> <y>`, `order <name|@N> wait <ticks>`, or `order <name|@N> study <station> <planId>`. The shorter `move` and `study` commands remain available. Inspect a station for its study plans and recorded findings. JSON parameters are not required or accepted by `order`; the CLI constructs typed actions internally and resolves names, full IDs and labels. `step` advances exactly the requested ticks even after a quest ends. `run` stops at quest success/failure or its supplied limit. Commands use ordinary player permission and physical execution; there is no hidden force-complete command. New activity progress starts at zero and pending orders retain their usual deferred eligibility checks.

## Source-Backed SCP Quests

The first two candidates come from the [prioritized portfolio](../../docs/scp-expedition-priorities.md). Each is playable through the CLI and uses the same authored setup as its test-only answer keys. Sources and scenario-specific departures from canon are documented beside the quest.

- [SCP-1867: Corroborate the collection](catalog/quests/scp1867/README.md): recover a journal and preserved specimen from a vault to temporary intake, then compare them against an independent survey and laboratory dossier. All four sources must be nearby and intact. Blackwood's own journal is not counted as an independent source. The resulting named, dated finding preserves provenance and identifies an original game-authored follow-up lead. Blackwood himself remains at the outpost off-map.
- [SCP-1370: A place in the gallery](catalog/quests/scp1370/README.md): carefully carry the toppled sapient exhibit into a glass display bay, perform controlled observation, return to reception and leave the door closed. Its identity remains a pawn during carrying. There is no combat or external power requirement; damaging it fails the mission. The bay abstracts an adequately sized enclosure, not a full container simulation.

[Study.ts](core/entity/pawn/actions/Study.ts) is the shared physical executor. A facility's `study.plans` declares a plan ID, title, required source definition IDs, productive duration, and authored finding. The worker approaches through ordinary routing. Distinct matching source instances must remain within one tile of the station, on the ground or carried by that worker, with positive amount/integrity. Missing sources or interrupted approach reset progress. The station is exclusive while productive study is active, using the same queue-derived ownership as other facility work.

Completion writes one finding per plan at that station, with the actor ID, global tick and actual source IDs. Repeating a completed plan does not duplicate the finding or consume evidence. Save/reload preserves partial work and findings. This is named evidence, not spending the earlier Research action's generic progress counter. The initial plans are explicit orders, not new autonomous needs. Source-specific result text belongs in the catalog; core contains no SCP-ID switches.

These quests use one persistent local map with an intake area, not a complete expedition-to-home campaign. The Blackwood lead is not yet an unlocked playable destination. Portable cases, resident aquarium care, independently walking SCP-1370, dialogue and extensive containment systems are deliberately deferred. SCP-294 remains the next candidate once dispensing can conserve input/output identities. No new images or browser bindings are added.

Save requires a new filename and never overwrites an existing file. Restore replaces the session with its saved simulation and quest state. Batch mode accepts `--restore <path>` as an alternative starting session, and returns exit code 0 for success/sandbox, 1 for quest failure, 2 for an active quest whose requested tick limit expired. Input can also be piped to the ordinary console. This is a developer/playtest surface, not a shipped UI or network API.

Movement and other orders **append**, not replace the current intention. Acceptance reports the new action's queue position and any earlier blocked action. The map legend shows the current action ID, its destination/target and pending count. `queue <actor>` lists every intention without advancing time. If an earlier move targets an occupied tile, a later move waits behind it; `cancel <actor> <earlier-action-id>` removes only that blocker, then `step` advances the remaining order. Accepting a move does not imply it is currently executing or that a route is available.

## Quests As Integration Tests

[Quest.ts](core/quest/Quest.ts) observes state and events; it never orders actors, owns sites, or fabricates success. Catalog quests define named objectives, failure conditions and a deadline. Conditions cover matched events, need bounds, entity amount, aggregate material stock, ability to act, separation, elapsed ticks, recorded findings, ground delivery locations, closed doors, and lost/damaged evidence. Entity references are local IDs in the attached site, resolved to its instantiated IDs. Multi-site references, branches, rewards and a scripting language are not implemented yet.

[Response](catalog/quests/response/quest.ts) succeeds when the soldier attacks, researcher withdraws and gains separation, and medic treats the casualty. It fails for soldier/civilian incapacitation or an incomplete deadline. [Daily life](catalog/quests/daily/quest.ts) requires sustained work/care and retained food. [Colony](catalog/quests/colony/quest.ts) checks a 12-worker, 42x26 site with shared facilities, a medic, a bleeding worker and finite food for at least 1000 ticks. Its resource condition is total food, not even usage of individual piles. [Consumption](catalog/quests/consumption/quest.ts) checks completion of eating, satiety and retained leftovers; it can fail by incapacity or deadline.

Each quest package has `quest.ts` (the challenge) and `setup.ts` (the shared playable site setup). Gameplay and tests both load that setup. Success/failure "answer keys" are tests, not catalog variants. At the user's request they are now easy to find beside the scenario: `catalog/quests/<quest>/tests/*.txt`. SCP-1370, SCP-1867 and Consumption have transcripts containing exactly the commands accepted by the interactive CLI, starting with `load`. Lines beginning with `#` are comments accepted by the CLI too. No hidden state edits, test-only commands or automatic quest completion are needed to play these solutions.

For example, open [SCP-1370's passing transcript](catalog/quests/scp1370/tests/pass.txt), enter its commands one at a time, and inspect the simulation between them. Or run it unchanged from `src_web`:

```sh
npm run sim < src/simulation/catalog/quests/scp1370/tests/pass.txt
npm run sim < src/simulation/catalog/quests/scp1370/tests/fail-unsecured.txt
```

Also available: [SCP-1867 pass](catalog/quests/scp1867/tests/pass.txt), [missing corroboration failure](catalog/quests/scp1867/tests/fail-missing-corroboration.txt), [Consumption pass](catalog/quests/consumption/tests/pass.txt), [interrupted meal solution](catalog/quests/consumption/tests/pass-resume.txt), and [missed deadline](catalog/quests/consumption/tests/fail-deadline.txt). The step counts leave readable time for travel and work; they demonstrate a solution, not the only permissible route or exact completion timing. Interactive/piped mode prints the quest outcome; unlike `--batch`, it does not set a failure exit code for a failed quest.

[quest-transcripts.test.ts](../../test/quest-transcripts.test.ts) executes these same files through the real CLI parser and checks the expected status, failure reason and important physical outcomes. The test-only replayer reports the transcript line on command failure, rejects rejected commands, checks nonmutation, and verifies continuation from a saved session after each command. Existing SCP success tests use these files rather than duplicate opaque order sequences. Focused injected-damage, incompatible-source, and persistence tests remain TypeScript tests under `test/simulation/quests/`; they complement the playable solutions rather than pretending to be commands a player can enter.

Colocation is for discoverability only: no production module imports `tests/` or reads these files. Genuine in-game variants would be separate authored content. Test-only configuration should remain minimal, and must never alter objective counters, waive prerequisites or force completion.

The consumption tests demonstrate two successful solutions (uninterrupted and cancel/leave/reload/resume) and two named failure outcomes (incompatible food until the deadline, and an incapacitated diner). They check intermediate material conservation and that success cannot occur before eating. This is the acceptance-test backbone, not the entire test suite: focused nutrition, rate, occupancy, structural damage and reference-safety tests remain alongside it.

The evaluator runs after each simulation tick. Failure takes precedence over simultaneous success; success can occur on the deadline tick before timeout. Event counts persist; state conditions describe the current world. Re-evaluating the same tick is idempotent, and final success/failure is durable even if the world continues changing. The application passes only that tick's new events, not the recent-events inspection buffer. Saving and restoring preserves these counters and the final result.

Tests run the same quests as the CLI and assert their results. The endurance test also removes an active research target and blocks one passage after startup, then checks care/recovery/replay without forcing a substitute action or route. Focused tests remain for inexpensive invariants and failure boundaries; not every local rule needs to be expressed as a quest.

## Performance Checkpoint

`npm run benchmark:simulation -- 40` measures the same populated colony after five warm-up ticks. In the initial local sample, average tick time fell from about 25.5 ms to 6.0 ms (p95 41.9 ms to 9.7 ms) by indexing ground occupants once per route query. The expanded medical scenario measured about 6.5 ms average and 9.5 ms p95. These are measurements on one machine, not CI performance guarantees. The index is transient and uses current state; no saved cache or invalidation framework was added. Whole-state boundary cloning and repeated route construction remain candidates for future measured work.

## Verification And Scope

Run `npm run test:simulation` from the web project. Tests cover sequential contention and following, detached inputs, door behavior, material-driven eating and quantities, autonomous versus explicit targets, control/autonomy/cancellation, carried-pawn identity, authored instances, save replay, multi-site/transit ownership, and forbidden dependency directions.

`npm run check` also validates the archived application's tests/build. That does not mean the replacement is connected to the browser. Not ported: full Site 828, SCP behaviors, story quests, personnel dossiers, qualifications, jobs, construction, power, full clinical care or combat systems, richer transport, or browser binding. The new CLI and observational quest harness are the playable replacement surface. Movement can still deadlock in tight traffic and local fleeing is not a complete escape planner; recovery limits are not a substitute for those future mechanics. Selectively reuse useful legacy calculations; do not preserve old implementations merely to satisfy old tests.
