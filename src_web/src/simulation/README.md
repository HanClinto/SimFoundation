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
			pawn/
				Pawn.ts
				Needs.ts
				Autonomy.ts
				actions/
					Action.ts
					ActionQueue.ts
					NeedActions.ts
					Move.ts
					Take.ts
					Drop.ts
					Eat.ts
					Wait.ts
		material/
			Material.ts
		site/
			Site.ts
			EntityPlacement.ts
			TileMap.ts
			Pathfinding.ts
			Transfer.ts
	catalog/
		actors/staff/FieldAgent.ts
		entities/doors/AutomaticSteelDoor.ts
		entities/supplies/PackagedMeal.ts
		materials/
			Steel.ts
			Wood.ts
			Plastic.ts
			Stone.ts
			PlantFood.ts
			AnimalTissue.ts
		sites/tests/SharedActions.json
		index.ts
```

There are no redundant `entity/entities` or `action/actions` levels. Actions belong beneath Pawn because pawns execute them. Materials have their own branch because a material is a definition, not an entity. Spatial mechanics and ownership transfers live with sites.

When implemented, named anomalies belong under `catalog/actors/anomalies`, ordinary authored maps under `catalog/sites`, and quests under `catalog/quests/<quest>/quest.ts`. Stage folders are useful when a stage actually has multiple files/assets. Do not create empty quest, actor, or site stubs just to fill out the proposed tree. Quest content must not own a site's lifetime. Reusable quest mechanics belong in core when needed.

## Entity, Template, Material

- **Entity** is a persistent physical instance with identity, location, material, and amount. A site or transfer owns its actual record.
- **Pawn** is an entity with agency and an action queue. Agency, independent movement, player permission, autonomy, and carryability are distinct. Staff and anomalies are definitions, not separate entity stores.
- **Item** is a loose physical object. It has no mandatory food subtype. A **Door** has door mechanics; it is not an item just because it is made of steel.
- **EntityTemplate** describes a named model: stable definition ID, display name, description, and initial defaults. Multiple instances share a definition ID, never an instance ID or mutable defaults. The generic contract lives in [EntityTemplate.ts](core/entity/EntityTemplate.ts); concrete models live in the catalog. There is no universal Definition abstraction.
- **Material** describes what an entity is made of. A steel ingot and a steel door can share a material without sharing their entity kind. Instance `amount` is remaining abstract material units, not a weight simulation.

Catalog entries are intentionally small, wiki-like records. For example, [FieldAgent.ts](catalog/actors/staff/FieldAgent.ts) gives its description, capabilities, needs, and diet; [AutomaticSteelDoor.ts](catalog/entities/doors/AutomaticSteelDoor.ts) selects steel and automatic operation. [Door.ts](core/entity/Door.ts) contains the mechanics. Add source/attribution/license metadata with externally sourced content; no new SCP content is authored in this slice.

Named content may eventually need unique behavior beside its catalog entry. Add a narrow core behavior interface when such a feature is implemented; do not put named-definition tests in the coordinator or prebuild an ECS/plugin framework. Display documentation can later be generated from catalog metadata; a wiki generator is not implemented here.

## Actions Stay Together

[Move.ts](core/entity/pawn/actions/Move.ts) owns movement execution: eligibility, requesting a route, checking the next step, performing required door opening, and arrival. Shared spatial queries own terrain/entity obstruction and interaction routing. Take, Drop, Eat, and Wait each own their corresponding checks and effects. Approach movement is reused, not copied into a second execution system.

Each action class implements `canStart` and `tick`. [ActionQueue.ts](core/entity/pawn/actions/ActionQueue.ts) has a small constructor dispatch and generic queue advancement, not a switch containing each action's rules. Adding a new action means its class, serializable action shape, and constructor entry. Only one queued action gets a turn; the next begins on the next tick.

Action handlers are short-lived code objects, not saved class instances. Progress, source, target, and blocker are ordinary JSON queue data. Cancellation removes that intention only: it does not undo consumed material, drop a carried entity, teleport anything, or change autonomy. Current actions have no persistent reservations requiring a cancellation hook; introduce one only when a real action owns such resources.

[ControlPolicy.ts](core/ControlPolicy.ts) checks player/script/debug authority and edits queues. Immediate starts use the action's own checks. Appended intentions may depend on earlier actions (for example Take then Drop), so their physical eligibility is deferred until execution. A blocked action stays queued and retries against current state; it can be cancelled. Previews return eligibility without mutation or event publication. Debug authority bypasses player permission, not the executor's physical rules.

## Sequential Ticks

The proposal/resolver system has been deleted. [Simulation.ts](core/Simulation.ts) clones the caller's state once, then executes directly against that working state:

1. Increment the global tick and capture each site's starting entity IDs.
2. Tick sites and entities in ascending, case-sensitive ID order.
3. Each entity sees changes made by earlier turns. Removed entities are skipped; newly added IDs wait until the next tick.
4. Advance transit needs and commit unblocked arrivals after all site turns.
5. Return the finished state and events. The input remains untouched.

This boundary copy is for caller isolation, not simultaneous simulation: actions do not read an old snapshot or emit proposals for a later resolver. Stable ordering makes replay reproducible but deliberately gives earlier IDs priority. First successful movement/consumption wins. Later movers can enter a tile vacated earlier in the same tick. Swaps, fairness rotation, and traffic optimization are not implemented. Pathfinding routes around current blocking entities, including pawns. If no route exists, an active action waits and retries against the next tick's state.

Opening a closed automatic door spends the opener's turn without movement. A later entity sees that door as open immediately. Door closure checks current nearby ground occupants when the door gets its own turn. There is no special end-of-tick door resolver.

Pawn needs advance once on the pawn's turn, including while carried. A carried pawn cannot act independently. Transit-owned pawns advance needs once outside sites, and arrivals receive no extra local turn. `canAct` and `mobile` can represent inactivity/immobility but do not themselves implement injury, death, or recovery.

Autonomy off prevents new self-selected work, not queued commitments or physiology. Player permission is rechecked at execution. [Autonomy.ts](core/entity/pawn/Autonomy.ts) asks the Needs system for a suitable action, otherwise selects a configured patrol destination. It names no individual need or need-satisfying action and never performs a separate version of an action.

### Need-Driven Selection

[Needs.ts](core/entity/pawn/Needs.ts) owns need progression and generic urgency selection. Need values represent deficits on the same 0..100 scale: larger means more urgent. Only present needs with value >= 50 are considered, highest value first, with case-sensitive need ID breaking ties. The shared threshold preserves the initial behavior without adding a configuration system. Absent needs do not invoke providers. An unsupported or currently unsatisfiable need does not prevent trying the next one.

A `NeedActionProvider` declares `needId` and a non-mutating `findAction(context)` that returns an ordinary queued-action description or null. Each action owns its provider: Eat's `needAction` connects hunger to its existing diet-aware, reachable-food search. [NeedActions.ts](core/entity/pawn/actions/NeedActions.ts) only lists registered providers. Providers for the same need are tried in registration order until one finds an action. There is no cross-need travel/benefit score or queue preemption; this policy applies only when an autonomous pawn is free to select new work.

Adding another need-satisfying action requires its implementation and provider registration, not an edit to Autonomy or a named-need switch in Needs. Tests use arbitrary need names and test providers to verify priority, unavailable-provider fallback, thresholds, ties and unchanged input; Eat remains the only production need action. This small action-selection contract does not yet generalize object advertisements or target searches.

## Traversal And Interaction

Entities declare `blocksMovement`: true prevents sharing their ground tile, false permits it. Catalog staff block by default, loose meals do not, and any other placed item can block without being a pawn. Carried entities never independently obstruct their carrier's tile. The moving actor is excluded from its own obstruction query. All ground entities on a tile are considered; one blocking entity is enough to prevent entry.

[TileMap.ts](core/site/TileMap.ts) exposes `traversalAt(site, position, actorId)`, returning clear, blocked with a reason, or an automatic door that must be opened. Door state determines its passage: open allows entry, closed automatic requires opening, and other closed doors block. An automatic door never masks another obstruction sharing its tile. The door requirement is not a third occupancy class.

[Pathfinding.ts](core/site/Pathfinding.ts) and Move use that same query. A\* can plan through a door that can be opened, while actual stepping must open it first. Move rechecks before entry; no separate pawn-only occupancy rule exists. Movement orders can target currently occupied floor, since it may clear before execution; accepting an intention does not guarantee a route. Transfer arrivals require clear traversal and cannot remotely open doors. Routing allows departure from an already shared origin (for example after putting down cargo), but does not authorize entry into another obstructed tile.

`interactionRoute` finds a shortest route to the target tile or a cardinally adjacent usable tile, with a fixed candidate order for ties. Take and Eat use it through `Move.approach`; food discovery uses it to test reachability. A blocking crate can therefore be approached and picked up without standing inside it. Routes and interaction positions are recomputed from current state rather than reserved in advance. The initial model has one-tile entities and cardinal interaction reach, not footprints or arbitrary interaction sockets.

Crossing-only occupancy (`canTraverse` but not `canStop`) is deliberately deferred: discrete movement would otherwise need rules for temporary overlaps, interrupted crossings, and cancellation. Start with blocking/nonblocking rather than inventing those rules implicitly.

## Diets Without Food Subclasses

[Material.ts](core/material/Material.ts) defines descriptive tags and diet rules. Tags are catalog strings, not a core enum. Each diet rule matches one tag and specifies nourishment per unit for that consumer. If several rules match, the highest nourishment applies once; values do not stack.

Examples: a metalivore accepts `metal`, a plastic consumer accepts `plastic`, and an ordinary plant-food diet accepts `edible-plant`. Wood is tagged `organic`, `plant`, and `wood`, not `edible-plant`. Classification does not imply digestibility. No special branch in Eat knows steel, plastic, meat, or meals.

[Eat.ts](core/entity/pawn/actions/Eat.ts) owns both candidate filtering and consumption. Autonomous food selection considers acceptable, reachable items by distance then ID. Dynamic pawn obstruction can still make an action wait. Explicit orders keep their specified target and never silently substitute another. An eat action approaches, rechecks, consumes at most one unit, reduces hunger according to the diet, and removes an exhausted item. Fractional remainders are supported. Pawns with no hunger need do not search for or consume food.

Future rest/comfort/entertainment discovery should expose small actor-specific interaction offers (action, target, expected benefit, availability, and interaction position). Extract that common target search when a second real need action demonstrates the shared contract. The current need-action providers select intentions; they are not a Provider/Consumer class hierarchy or a generic object-offer framework. A material becomes food relative to the consumer's diet, not through a universal food advertisement.

For now, **only loose items are consumable**. Material matching alone does not authorize eating installed doors or living pawns; structural damage and predation need their own consequences. There is one material per entity, no mixtures, digestion chemistry, calories, or weight model. Extend only when actual content needs more.

## Sites, Transfers, And Saves

[SharedActions.json](catalog/sites/tests/SharedActions.json) is an authored site: rectangular `.` floor / `#` wall rows plus placements naming catalog templates, local IDs, locations, and optional instance overrides. [EntityPlacement.ts](core/site/EntityPlacement.ts) owns placement data and instance construction beside site loading, separate from the reusable entity-template contract. Overrides replace supplied top-level fields; they are not a recursive patch language and cannot change entity kind. `instantiateSite` clones defaults, allocates fresh site/entity IDs, and remaps carried references, queued targets, and initial action IDs. Site instantiation checks geometry/references; this is trusted developer content, not a hardened mod loader.

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

[Snapshot.ts](core/Snapshot.ts) is JSON stringify/parse, root/version checks, and try/catch only. Restoring preserves IDs and state exactly; it is distinct from instantiation. Templates/handlers are supplied by code, not serialized or revived. Version 3 adds explicit entity obstruction and discards earlier experimental shapes; there are no migrations or deep save validators.

## Verification And Scope

Run `npm run test:simulation` from the web project. Tests cover sequential contention and following, detached inputs, door behavior, material-driven eating and quantities, autonomous versus explicit targets, control/autonomy/cancellation, carried-pawn identity, authored instances, save replay, multi-site/transit ownership, and forbidden dependency directions.

`npm run check` also validates the archived application's tests/build. That does not mean the replacement is connected to the browser. Not ported: full Site 828, SCP behaviors, quests, personnel dossiers, qualifications, jobs, construction, power, clinical care, combat, richer transport, or UI binding. Selectively reuse useful legacy calculations; do not preserve old implementations merely to satisfy old tests.
