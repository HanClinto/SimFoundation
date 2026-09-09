# Multi-Site Simulation Refactor

Status: approved direction, implementation started 2026-09-09; tracked in [#24](https://github.com/HanClinto/SimFoundation/issues/24). M0 is complete and the first preparatory M1 checkpoint is implemented; the multi-site runtime is not yet complete. This plan precedes new SCP scenarios and supersedes the temporary-site assumptions and feature ordering in [expedition priorities](scp-expedition-priorities.md), not its content recommendations.

## Implementation Status

The first checkpoint separates `SiteState`, `SimulationClock` and `SiteSimulationState` from the current composed `GameState` type. The global coordinator now increments the clock and supplies it to `advanceSiteSimulation`; the local runner no longer increments time. Combat receives an explicit withdrawal policy instead of inspecting expedition state to infer one.

This is an internal boundary extraction, not a new serialized site collection. Schema 49 and current gameplay remain unchanged. `advanceSiteSimulation` still accepts the composed state because action identity and other call paths retain campaign dependencies. Remove those dependencies during M1/M2 rather than supplying empty expedition records to pretend the isolation is finished. No multiple-site ownership, transfer framework, neutral site factory or disposal UI has landed yet.

### Current Field Inventory

| Existing field or state                                                | Target owner                                                         | Refactor requirement                                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `version`, `seed`, `tick`, `gameMinute`                                | Global simulation; read-only clock/seed context for local work       | No stored per-site clocks or independently advanced copies                                                  |
| `siteName`, `world`                                                    | Site                                                                 | Stable site ID plus map-local positions; no privileged Site 828 coordinates                                 |
| `personnel`                                                            | Owning site or transit payload                                       | Move the actual record with history, skills and personal inventory; derive global lookup                    |
| `combat.responders`                                                    | Person-owned tactical state, stored under current site/transit owner | Preserve supplies, injury, recovery and draft state when ownership changes                                  |
| `combat.adversary`                                                     | Identified threat owned by a site/transit                            | Remove embedded singleton identity assumptions without inventing capture mechanics                          |
| Other `combat` fields                                                  | Site encounter state                                                 | Keep participants, local status and events scoped; withdrawal policy is now an explicit input               |
| `scp999`                                                               | Identified resident owned by a site/transit                          | Remove mandatory singleton creation; keep behavior state with the resident                                  |
| `objects`                                                              | Site or transit payload                                              | Preserve object identity, stack quantity and carried/contained dependency ownership                         |
| `jobs`, `objectOrders`, `vesselWork`, `storage`                        | Site                                                                 | Work and reservations stay local; existing vessel transit converges on global transfers                     |
| `clinicalCare`                                                         | Site                                                                 | Local clinician assignment and policy, not global authority over away patients                              |
| `routines.stations`, `activities`, `blockedReasons` and meal summaries | Site                                                                 | Local execution/ownership; summaries remain derived from that site's physical supplies                      |
| `routines.schedules`                                                   | Personal schedule data within owning site/transit payload            | Transfer personal schedule without carrying furniture references or active routine reservations             |
| `actionQueues`, `actionTimings`                                        | Site execution state                                                 | Cancel/invalidate location-bound work safely at departure; do not replay it at destination                  |
| `observations`, `incident`                                             | Site                                                                 | Per-site sensing and attributed alert transitions; historical observations need not imply current ownership |
| `environment.orders`, fixed sources and policies                       | Site                                                                 | No cross-site work or fixed-source teleportation                                                            |
| Object-attached sources                                                | Host-owned behavior within site/transit                              | Move binding and condition with the complete physical dependency group                                      |
| `expeditions`                                                          | Split into global operations, transfers and adjacent quests          | Remove nested site ownership, reset-on-return and objective-gated cargo eligibility                         |
| Power graphs, light fields, spaces, stock totals, identity lookup      | Derived                                                              | Do not serialize redundant authoritative copies                                                             |
| Running, speed, window selection, follow and perspective               | Application/browser                                                  | Global pause; independent per-site views; no effect on site ownership or ticking                            |

## Goal

One global simulation owns many persistent sites. Each site has a tilemap and local simulation state, and advances the entities it currently owns. Transfers move people and physical contents between sites through explicit transit ownership. Sites can be instantiated and explicitly disposed. No site is inherently the home simulation and no destination belongs to a quest or expedition.

An unstaffed site still advances applicable behavior: hazards, residents, equipment, and ongoing local conditions. A quest may involve any combination of sites. Completing or abandoning it neither destroys a site nor resets its contents. Establishing remote containment and relocating operations must use the same systems as operating Site 828.

This is a change to simulation ownership, not a new strategy-game UI or a general entity-component-system rewrite. Existing specialized entity types and physical rules remain useful.

## Current Couplings To Remove

| Surface                                                                      | Current behavior                                                                              | Target                                                                                                   |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [state.ts](../src/simulation/state.ts)                                       | Global clock, personnel and one site's local systems share GameState                          | Campaign state contains sites, explicit ownership, transfers and cross-site records                      |
| [tick.ts](../src/simulation/tick.ts)                                         | Advance the base, filter/reconcile away personnel, then run a different expedition tick       | One site runner applied to every site on one clock, plus a transit runner                                |
| [expeditions.ts](../src/simulation/expeditions.ts)                           | Field projection fabricates empty subsystems; return deletes its site                         | Sites retain their real systems independently of operations                                              |
| [expedition-site.ts](../src/simulation/expedition-site.ts)                   | Scenario creates a fresh site per dispatch; recovery list controls eligibility and completion | Site setup creates initial conditions; operation and quest definitions reference existing sites/entities |
| [expedition-controller.ts](../src/adapters/browser/expedition-controller.ts) | Broad base controller inherited with selected field overrides                                 | Explicit site-bound command/view adapter, no fallback to another site                                    |
| [game-persistence.ts](../src/adapters/browser/game-persistence.ts)           | Recreated scenario factory defines allowed field inventory                                    | Structural, ownership and referential validation of live state                                           |

Keep assembly, physical approach/handling, resource reservations, deterministic movement, finite supplies, injuries, current-version corruption checks and the existing playable scenarios. Do not preserve temporary-site deletion, reset-on-retry or all-cargo-only success just to keep an old test passing.

## Ownership Contract

Proposed serializable shape, showing responsibilities rather than final TypeScript field names:

```text
SimulationState
  version, seed, tick, gameMinute, global ID allocator
  sitesById
    SiteState
      id, name, world/tilemap
      personnel, residents, threats, physical objects
      jobs, routines, clinical policy, observations, local incidents
      object work, vessel work, storage, environment, local combat
  transfersById
    endpoints, manifest, staging, phase, deadlines, blocked reason
    in-transit personnel, residents, threats, physical objects
  operations
    assigned team, destination, departure/return intentions, reports
  quests
    requirements, progress and durable accomplishments
```

Every site is the same SiteState type, with its own entities, objects, work queues, routines, utilities and other local systems. There is no HomeSite/RemoteSite subtype, reduced remote state, or simulation capability flag based on distance or UI selection. An empty site has empty collections, not missing functionality. Equipment, staffing and physical conditions determine what work can actually happen.

Keep one canonical record for each transferable entity inside its owning site's typed collection, or inside a transfer's transit payload after departure. A staged manifest references the origin's records; it does not duplicate them. Membership in those collections establishes ownership. Do not serialize an independently mutable global copy or ownership roster. A derived campaign-wide lookup can find a person or object by stable ID for dossiers and commands; it is an index, not another owner or ticking system.

Global lookup supports dossiers, transfers and stable identity, but does not tick site-owned people a second time. Historical injuries, skills, equipment and personal preferences travel with the person. Site staffing policies, furniture assignments, physical jobs and station reservations stay local. Each site owns its local work and action queues. Orders reference both site and entity identity; pending actions do not automatically acquire permission to execute at a new site.

The current SCP-999 singleton and single-adversary combat record need explicit resident/threat identity and ownership. Do not create a new SCP-999 for every site. Move entity-specific state with its entity and retain encounter-local membership/events at their site. This does not require generalized multi-enemy tactics or interchangeable anomaly behavior plugins now.

Physical location is distinct from owner: an object can be on a site tile, carried by an owned person, or inside an owned vessel. All members of a carried/contained group must have the same owner. Attached emission behavior travels with its host; fixed sources stay at their site. Installed objects require packing or another supported physical preparation before departure.

Keep campaign-scoped IDs stable after transfer. Qualify purely local identities such as jobs and rooms by site where needed. Different sites may use the same tile coordinates without ambiguity. Never infer current ownership from an ID's birthplace or regenerate IDs on arrival. Freshly instantiated copies receive new IDs.

Headquarters and selected site are not execution privileges. Selected site is browser state; an eventual headquarters designation is only metadata/default routing. Startup content creates Site 828 with its existing people and equipment, while a generic site factory creates no free staff, stock or resident anomalies.

## Clock And Scheduling

One application advance performs one global step. Pause and speed apply to the whole simulation; all sites use the same tick and game minute. Begin with full simulation of every retained site, not viewport-dependent ticking or catch-up approximations.

Proposed deterministic step order:

1. Set the next global clock and fix ownership for the simulation phase.
2. Advance site-owned entities and systems once, in stable site-ID order, using only each site's state and the same clock. Preserve existing local system ordering unless a focused test justifies changing it.
3. Advance transit-owned entities once with transit-specific rules. Needs, existing injury progression and vessel wear continue; no site jobs, local movement or nonexistent off-map exposure targets.
4. Evaluate ready departure/arrival transactions in stable transfer-ID order and atomically commit valid ownership changes. A newly arrived entity starts local ticking on the next step. It cannot receive both a transit and site step in one tick.
5. Finalize ownership-sensitive action/observation state, record committed outcomes, then evaluate quests and publish one campaign snapshot with site-attributed incidents.

Preparing/ordering transport while paused may reserve resources but does not advance time or teleport cargo. Boundary reconciliation must not replay combat, needs or wear. Site systems cannot directly mutate another site; cross-site effects go through the coordinator.

Use deterministic per-site/per-entity random streams or keyed draws where randomness is required. Do not consume one shared mutable stream in a way that adding an unrelated site changes existing behavior. No wall-clock randomness.

Alert routing observes each site's transitions, not just a maximum severity that can hide a new incident elsewhere. Existing pause behavior should still permit resuming an unchanged incident. Unattended means nobody is present, not that hazards are suspended. Measure performance with a small multi-site fixture before considering optimization; do not promise an unlimited site count.

## Transfer Contract

One shared transfer mechanism supports people, raw materials, packed objects, vessels and their contents between arbitrary valid endpoints. Routine freight does not require a quest or expedition. Keep existing supported physical limitations; the foundation must not promise moving immovable entities, installed buildings or arbitrary unsafe patients.

- Planning names origin, destination, manifest and staging/arrival positions. Both endpoints and ownership are checked by the executor as well as its preview.
- Staging uses actual local work/movement and reservations. A person cannot depart while an unrelated job owns carried cargo or an active clinical commitment. Resolve those commitments through their existing cancellation/handoff rules.
- Quantity selection uses existing stack splitting/conservation rules. The shipped portion retains its identity through transit; splitting allocates a new identity once, not at each boundary.
- Preflight resolves the full dependency group: person and equipment, carried objects, vessel contents and attached behavior. Reject duplicate selections, incompatible owners, missing dependencies and unsupported payloads with a reason.
- Departure moves the complete group from origin ownership to transfer ownership atomically. Transit has no site-map position, sight contribution, work eligibility or spendable site inventory.
- Arrival validates endpoints, placements, applicable capacity and cross-references before changing anything. A blocked arrival retains transit ownership and an inspectable reason; nothing is partly deposited or credited twice.
- Cancellation before departure releases only the operation's reservations. After departure, cancellation is not teleportation back home. Provide a deliberate return-to-origin route with a new travel deadline and the same manifest/condition; recheck arrival there too.
- A transfer finishes exactly once. Its durable completion record is distinct from quest success. Attached sources and condition do not disappear when an operation ends.

Converge the existing timed vessel transport and expedition personnel/cargo transfer on this ownership mechanism. Same-site relocation can retain its local workflow, but must not keep a second, conflicting definition of off-map ownership. Do not retain fixed expedition loadout reserves as a separate replenishable inventory: preserve current ammunition/kit quantities when adapting staging and return.

Handling eligibility is independent from quest requirements. The first refactor supports already-modeled people and objects, including safe movement of the existing resident/threat types through explicit supported commands. Hostile restraint/capture, new medical evacuation abilities, fuel, weight balancing and animated vehicles are separate gameplay work. Unsupported dangerous transfers remain rejected, not silently converted to cargo.

## Site Lifecycle

`createSite` takes an explicit authored setup and returns a unique site identity with valid initial conditions. Setup is not a live-state template used to enforce the starting inventory forever. Creation adds the site to normal ticking; it does not implicitly dispatch staff, assign a quest or grant materials beyond the chosen setup.

Retain sites until an explicit disposal command succeeds. For the first implementation, allow ordinary disposal only after the site has no live entities, unconsumed physical stock, active/reserved work, active hazards, transfer endpoints or unresolved operation/quest requirements. Reject deletion with concrete blockers. The remaining static map and inactive configuration can be discarded after an explicit confirmation; map removal is not material salvage.

Completed historical records retain ID/name snapshots and do not require the deleted live site to exist. Open windows and queued stale commands become unavailable instead of selecting headquarters. Permit an empty simulation with no selected site and the ability to create one; do not make Site 828 undeletable. A future destructive sandbox reset, abandonment policy or transfer reroute is a separate explicit operation, not a force flag on normal disposal.

## Quest Boundary

Quests evaluate ordinary simulation facts across sites and durable accomplishments. They neither own sites nor implement transport, hauling, research or construction.

Begin by expressing the two existing recovery missions as requirements over identified items delivered to a specified site. Separate required from optional objectives and publish progress/blockers. A current condition can become false while a quest is active; a historical accomplishment records a completed action. A completed quest stays completed unless its definition explicitly models a recurring obligation. Keep those semantics distinct.

Record compact durable accomplishments rather than requiring an unbounded event log or reconstructing past success from a 20-entry return-history buffer. Processing a replayed completion event cannot grant progression twice. Any quest consequence that mutates the world uses ordinary validated simulation commands at a defined boundary, not arbitrary callbacks that edit site state.

Do not invent research completion flags during this refactor. Add a real evidence/study requirement with the first physical study implementation after the multi-site gate. Leave extension points as typed evaluators and references, not a scripting language, plugin registry or large scenario/opportunity hierarchy.

## Delivery Milestones

Each milestone is an isolated validated change group, with the smallest coherent intermediate code state. An incompatible state change bumps the save version and discards old saves. No migration, parallel legacy save format or permanent base compatibility facade. Some type propagation will necessarily span several modules; do not split it into noncompiling commits merely to make commits smaller.

### M0. Contract And Baseline

**Deliver:** This plan and [decision 008](decisions/008-persistent-multi-site-simulation.md); create a tracking issue before runtime work with milestone status, ownership, exclusions and acceptance criteria. Inventory current state fields into global, entity-owned, site-local, derived and browser-only categories as part of the first type change. Use current scenarios as baseline fixtures.

**Gate:** Agreement on persistent sites, canonical ownership, one clock, transit, conservative disposal and adjacent quests. Existing tests are evidence for behavior, not a promise to preserve temporary-site resets. Status: complete; issue #24 and the field inventory above establish the baseline.

### M1. State Ownership And Current-Version Persistence

**Deliver:** Global simulation container and a uniform site collection, with entities/objects and queues owned by each site and transit payloads owned by transfers. Move startup content into a Site 828 setup; introduce a neutral site factory. Separate resident/threat identity from singleton assumptions. Qualify IDs/references and split save checks into entity, site and cross-owner invariants. Update the root controller and minimum browser snapshot plumbing to consume the new shape without fake nested GameState projections.

**Gate:** One-site behavior still works; two sites with overlapping coordinates and distinct inventories round-trip through current saves. Duplicate IDs/owners, cross-site carrier or job references, malformed dependencies and missing owners are rejected. Creating a second site does not create staff/SCP-999/stock unintentionally. New legitimate objects and changed quantities are allowed. Older saves are discarded.

### M2. One Runner For Every Site

**Deliver:** Shared site tick/context, global coordinator and once-only entity stepping. Remove away-roster filtering and the reduced expedition tick. Site capability follows actual equipment and staffing, not a home/remote flag. Scope action queues, routines, clinical scheduling, repairs, storage, observations and incident reporting correctly.

**Gate:** Work at two staffed sites advances independently on the same clock; unattended hazards/residents still advance. Personnel needs advance once. Save/reload produces identical continuation. Reordering site records or adding an unrelated inert site does not change existing results. Global pause halts all progression, and a new remote incident is surfaced even during another site's incident.

### M3. Explicit Site Commands And Usable Site Views

**Deliver:** Explicit site IDs in local commands and a site-bound browser adapter with no root/base fallback. Generalize map and inspector binding beyond the base/field pair; add a small site directory with create/open/dispose affordances and disposal reasons. Implement conservative lifecycle guards, including no-site UI state. Dossiers resolve entity location, while view/follow/selection state stays per window.

**Gate:** Build/haul/repair/routine/door controls at Site B affect only B; Site A can remain visible in another window. Stale commands cannot target another site after travel, disposal or window switching. World/Recorded behavior and action safety remain intact. Browser checks cover two independent maps, site disposal while a window is open, and headquarters-free operation.

### M4. Shared Transfers And Transit Ownership

**Deliver:** Serializable transfer state, physical staging, dependency-aware manifests, atomic departure/arrival, transit ticking and blocked/cancel/return behavior. Support raw-material batches, people with existing equipment/resources, packed fixtures and loaded vessels with attached sources. Converge current vessel transport and expedition transfer; remove duplicated return mutation paths.

**Gate:** Transfer A -> B and B -> C without a special home endpoint. Build at B with physically delivered materials. A partial stack conserves total quantity; a loaded case and source keep identity and wear through travel. Injury/needs/cooldowns advance once and do not reset. Blocked arrivals, duplicate completion attempts, cancellation and save/reload cannot lose or duplicate records. Active transfer endpoints block disposal. No origin-targeted work follows a transferred worker accidentally.

### M5. Existing Expeditions Over Persistent Sites

**Deliver:** Convert Relay Depot 14 and Service Store 3 into retained site setups. Operations reference sites and transfers; field actions use ordinary site commands. Use an explicit typed initial encounter setup rather than interpreting a bare position as an implicit 049-2. Keep a simple single-active-expedition UI if useful, without encoding site cardinality in it.

**Gate:** Dispatch, recover, return and revisit the same service store: recovered cases stay removed, remaining cases and changed doors stay where left. Depot injuries/cargo retain provenance. Both locations continue their applicable simulation after departure. Operation cancellation/completion never deletes a site. Existing team/loadout limitations can remain workflow policy, not limitations on generic site ownership or freight.

### M6. Adjacent Quest Progress And Outcome Records

**Deliver:** Extract objective eligibility/progress from pickup and transport; move existing mission completion into small cross-site condition/accomplishment evaluators. Required/optional distinctions, stable quest targets, durable one-time completion and reports no longer depend on recreating a scenario inventory or a fresh visit ID. Remove remaining all-cargo and temporary-map assumptions from UI, persistence and docs.

**Gate:** Deliver required cases over multiple visits/transfers; optional salvage remains recoverable independently. A wrong item or wrong destination does not satisfy the quest. Reload and repeated observation do not repeat completion. Local and remote conditions can be combined without copying simulation behavior into a quest. A quest ending does not freeze, reset or delete its sites.

### M7. End-To-End Review Before New Content

**Deliver:** A playable integration setup using existing content: create B, send staff and finite materials from A, build and operate there, send a loaded case to C, return to B later, resolve the existing recovery quest, then evacuate and dispose an eligible site. All three use the same site model. Record remaining unsupported gameplay explicitly and update architecture/expedition documentation to describe implementation, not intent.

**Gate:** Relevant ownership/replay/corruption tests, browser multi-window/lifecycle checks and `npm run check` pass. Inspect the multi-site flow with the user before starting new SCP scenarios. The first content extension is then SCP-1867 recovery plus physical study producing a corroborated lead, now free to involve work at any site.

## Validation Strategy

- Focus each milestone's first check on its changed contract, then run required formatting, typecheck, tests and build gates before publishing. Use real commands and outcome waits, not exact-tick UI walkthroughs.
- Test conservation across all sites plus transit. Include carried/contained dependencies, quantities, condition, resource expenditure, personal history and unique ticking, not only head counts.
- Validate live reference graphs without assuming initial scenario cardinality, fixed supply budgets or permanent Site 828 coordinates. Historical references deliberately differ from live ownership references.
- Publish coherent validated milestones independently; leave unrelated working-tree edits untouched. Browser fixtures use an isolated save/origin and never overwrite the user's ongoing session.
- No performance-driven background suspension in this pass. Measure small representative sites and report limits; optimization requires a separate equivalence argument and tests.

## Exclusions And Review Points

No new SCP scenarios, research system, arbitrary quest scripting, hostile capture, pediatric/organ medicine, death/abandonment mechanics, fuel economy, vehicle animation, procedural world map, multiplayer, save migrations or generic ECS rewrite. Existing supported state must be transferable without pretending those new abilities exist.

Multiple sites are not multiple vertical levels. Each site remains a single playable tilemap; no roofs, base weather, floor penetration, ceilings or vertical pathfinding are introduced. New sensing/knowledge hiding is deferred; simulation ownership must remain inspectable.

Safe ordinary transfers do not solve the existing all-incapacitated expedition problem by themselves. Before adding new dangerous content, separately agree on assisted evacuation/rescue and terminal outcomes. This refactor must expose the blocker and preserve the people, not disguise deletion or free healing as transfer.

Review after M2 for ownership/tick correctness, after M4 for transfer behavior, and after M7 for usability and content readiness. Refine implementation details as tests expose real constraints; do not reopen the approved persistent-site model merely to preserve old expedition shortcuts.
