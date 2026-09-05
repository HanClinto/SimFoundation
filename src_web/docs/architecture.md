# SCPSiteManager Architecture

This document defines the initial implementation boundaries for the web game. It is intentionally more stable than the folder layout: modules may move, but dependency direction and state ownership should remain explicit.

## Goals

- Run the complete simulation headlessly in Node without browser globals.
- Reproduce outcomes from the same initial state, seed, commands, and ticks.
- Keep saves serializable and versioned.
- Support the browser, tests, replay tools, and potential future frontends through one command boundary.
- Allow content additions through data and focused systems rather than UI-specific branches.

## Dependency Rule

```text
adapters -> application -> simulation
```

Dependencies only point to the right. The simulation never imports application or adapter code. The application never imports browser modules.

### Simulation

The simulation owns all gameplay facts and outcomes:

- Versioned game state and seeded random state
- Persistent and temporary maps
- Terrain, occupancy, entities, inventories, and equipment
- Time, schedules, needs, stress, fear, sanity, health, and effects
- Job discovery, scoring, reservation, execution, and cancellation
- Movement, pathfinding, construction, utilities, research, and containment
- Expeditions, tactical actions, anomaly behavior, incidents, and alert classification
- Commands, stable result codes, domain events, and bounded history

Simulation modules must not call DOM, Canvas, localStorage, requestAnimationFrame, setTimeout, Date.now, crypto randomness, or network APIs.

### Application

The application controller is the public use-case boundary. It owns process-local concerns such as subscribers and unresolved completion promises, but not gameplay decisions.

Initial API shape:

```ts
interface GameController {
  getSnapshot(): Readonly<GameSnapshot>;
  dispatch(command: GameCommand): CommandResult;
  advance(tickCount?: number): AdvanceResult;
  setRunning(running: boolean): void;
  subscribe(listener: ControllerListener): () => void;
  serialize(): SerializedGame;
  replaceState(save: SerializedGame): ReplaceStateResult;
}
```

Pause and speed deserve separate ownership:

- Whether ticks may advance is application/runtime state.
- The selected wall-clock speed is browser runtime state.
- The current in-world time and alert level are simulation state.
- Commands may be accepted while paused and remain pending until ticks resume.

### Browser Adapter

The browser adapter owns:

- Canvas rendering and visual interpolation
- SVG loading, tinting, composition, and caching
- 98.css windows, focus, dragging, resizing, and accessibility
- Pointer and keyboard input translated into commands
- Wall-clock scheduling and alert-driven speed changes
- Audio and notification presentation
- Versioned local persistence

The initial browser target is desktop only, with a minimum virtual workspace rather than a mobile reflow. A browser-owned window manager controls modeless inspector geometry, z-order, open state, and focus. These preferences are stored separately from authoritative game state so the same save can be presented by another frontend or restored with a different desktop layout.

The browser stores authoritative game state under `scp-site-manager.game-state.v1`, separately from window layout. Published simulation changes autosave, and explicit Save Site/Load Site commands use the same record. Only exact current-version development saves load; malformed or incompatible saves start a fresh session and are not overwritten until the player explicitly saves. Running/paused state remains browser state and is not serialized.

Resident anomaly records are authoritative simulation state. The first implementation stores SCP-999's protocol state, target, interaction boundary, cooldown, and last completed contact. The browser Anomaly Registry only projects those records; target choice and personnel Effects remain deterministic headless behavior.

SCP-999 uses the same map and cardinal routing as personnel. It approaches an available reachable target, starts its four-tick contact only from the same or an adjacent tile, and interrupts without granting Calm when the target moves away or starts work. When no suitable target exists it follows a deterministic common-room roaming pattern. Approach, contact, cooldown, position, and target all survive save/reload; the registry distinguishes approach from actual contact.

The physical-site prototype adds `world.map` and `world.positions` to versioned state. The 128x128 map contains a compact 30x30 starting footprint, authored room bounds, and grass/floor/wall/door tiles. Positions are keyed by personnel and resident-anomaly IDs. Cardinal A\* routes use the `pathfinding` package with stable neighbor ordering; walls are solid, doors passable, and personnel share walkable tiles (soft occupancy). Traffic collision and exclusive workstation reservations are not implemented yet.

Jobs own a serializable `workSite`. Eligibility requires a positive relevant Skill and a reachable destination. Workers move one tile per tick and earn no work progress or XP while travelling. A lost route releases the worker, preserves completed progress, and exposes a blocked reason. The next tick can reconsider work when access returns; carried-material orders remain restricted to their original carrier. Routes are derived from current topology rather than serialized, so reload and obstruction recovery use the same path rules. Room categories currently describe space; furniture, room effectiveness, and power remain subsequent slices. The limited annex construction workflow is described below.

The Camera Feed projects map tiles and actual occupant positions, with browser-owned pan/zoom/selection and existing dossier links. It never advances positions. Map/room dimensions, terrain length, positions, required occupant IDs, unique IDs, and work-site bounds are validated on load. Incompatible development saves deliberately require a fresh site.

### Laboratory Annex Construction

The first construction slice uses one fixed 9x7 laboratory annex rather than a general tile editor. `construction` stores available material kits, a stockpile position, stable blueprint numbering, and a bounded register. Placement validates the complete grass footprint, entrance, occupancy, neighboring reservations, reachability, and stock. Authorizing a blueprint atomically reserves 40 units from the initial 160; cancellation refunds exactly once and is permitted only before dispatch.

Logistics first reaches the stockpile. Collection changes the same work order into delivery and pins `requiredWorkerId` to the actual carrier. Another worker cannot take over that load remotely. Delivery completes at the exterior entrance and creates an engineering order. Assembly requires physical work there and cannot replace an occupied tile with a wall. Completion creates map tiles and a room, then queues a research commissioning job at an interior work site. Construction phase changes occur after work and anomaly movement; newly created orders become eligible on the following tick.

The controller exposes `previewLaboratory`, `placeLaboratory`, and `cancelLaboratory`. Commands return stable codes and detached snapshots. The browser owns preview geometry, commands, and a construction register, not material accounting or completion. Save validation checks material conservation, blueprint sequence, job references, phase relationships, footprints, and carried-load ownership. Development saves do not migrate. Power, furniture, arbitrary blueprints, stack inventories, supply replenishment, and demolition remain outside this slice.

`setResearchLaboratory` selects the main laboratory or a completed, commissioned annex. The saved room ID controls the work site chosen by simulation-owned `authorizeSiteWork` for new calibration and baseline orders. It never changes active jobs; activation and incident recovery retain their own physical sites. Work Orders preserves keyed DOM rows and buttons across ticks so location links and authorizations remain operable during simulation updates.

SCP-9620's experiment is also authoritative state. Calibration, passive baseline observation, activation, and incident recovery are separate serializable jobs; completion records observations and proposes the next stage without authorizing it. Only activation raises the Yellow feedback incident, and recovery leaves the apparatus stabilized while its function remains unresolved.

Facility and map windows are inspectors over simulation-owned map entities. Global playback and lifecycle controls live in dedicated utility windows. Raw deterministic internals such as tick number and seed are exposed only through opt-in developer inspectors.

Browser presentation should follow the interface contract in [lookbook.md](lookbook.md). The look-book may evolve through visual review without weakening the dependency or state-ownership rules in this document.

Browser code reads immutable snapshots and domain events. It never mutates entities or invokes atomic simulation systems directly.

## State Model

Use plain serializable records with stable string IDs. Avoid runtime class instances and object back-references in authoritative state.

```text
GameState
  version, seed, tick, gameTime
  alertState
  persistentMapId
  activeMapIds[]
  mapsById{}
  entitiesById{}
  jobsById{}
  operationsById{}
  factionsById{}
  researchState
  campaignState
  eventHistory[]
```

Maps own dense terrain and spatial indexing. The world registry owns sparse entities. Placement records identify whether an entity is on a map, in a container, equipped by a pawn, assigned to transport, or temporarily unplaced during a validated mutation.

Temporary expedition maps use the same map and entity schemas. A map lifecycle record determines whether a temporary map is active, suspended, or eligible for disposal after all persistent entities leave.

## Commands, Actions, and Events

A command expresses player or AI intent, for example:

- `place_blueprint`
- `set_work_priority`
- `set_schedule`
- `authorize_experiment`
- `draft_pawn`
- `move_drafted_pawn`
- `equip_item`
- `plan_expedition`
- `launch_expedition`

Commands validate at the simulation boundary and return stable result codes. Accepted commands create or modify serializable orders and operations.

Atomic actions are internal verbs that perform one validated mutation, such as moving one step, reserving an item, applying work, equipping an item, taking damage, or changing containment state. UI adapters cannot call them.

Domain events describe facts that already occurred, such as `job_started`, `item_equipped`, `pawn_panicked`, `containment_lost`, or `expedition_returned`. Presentation, audio, incident logs, and tests consume these events. Events are not commands and cannot be rejected retroactively.

## Deterministic Tick Order

The initial tick pipeline should be explicit and covered by tests:

1. Apply accepted command effects scheduled for this boundary.
2. Update time-based statuses and needs.
3. Evaluate anomaly and environmental systems in stable ID order.
4. Discover, score, and reserve jobs for eligible autonomous pawns.
5. Advance pawn intents, movement, and work in stable ID order.
6. Resolve utilities, equipment effects, hazards, and resulting damage.
7. Drain bounded domain reactions in documented order.
8. Derive alert level and append domain events.
9. Remove expired ephemeral records and enforce history bounds.

Systems should not depend on JavaScript object iteration order. Ties use documented stable keys. Random draws use named deterministic streams or a stored seeded generator.

## Job System

Routine autonomy belongs in the simulation. Jobs progress through serializable states such as available, reserved, active, blocked, completed, failed, and cancelled.

Job scoring may consider:

- Player work-category and pawn-specific priorities
- Emergency and alert context
- Qualifications, clearance, equipment, and health
- Reachability and estimated travel cost
- Schedule, needs, stress, fear, and risk tolerance
- Existing reservation and current commitment

Scoring inputs and rejection reasons must be inspectable. A pawn inspector should be able to answer both “why are you doing this?” and “why are you not doing that?” without reimplementing job logic in the UI.

## Psychology

### Clinical Work and Occupational Health

Assessment commands create serializable clinical referrals instead of immediately generating reports. A clinical order identifies its patient and examination type. The job scheduler reserves both a qualified clinician assigned to medical duty and a distinct patient; both must reach the medical bay before progress begins. Patient or clinician unavailability and blocked routes delay work. Completed physical and psychological reports identify the attending clinician. Examinations change recorded knowledge, not authoritative injuries.

`clinicalCare` stores assigned staff IDs and independent physical, mood, psychiatric, and anomalous-review intervals (disabled, four hours, eight hours, or daily). A due review creates the same referral as a manual request and deduplicates pending visits. It uses recorded review dates, not hidden health values. Anomalous scheduling waits for the research capability. Any existing pawn can be assigned, but `ASSESSMENT_REQUIREMENTS` and `clinicalQualificationReasons` define procedure eligibility shared by job execution and the UI: Medical 0 for rapid mood screening, 3 for physical examination, 5 for psychiatric evaluation, and 6 plus research for anomalous surveys. One assessor cannot examine themselves. Formal qualifications and specializations remain future work. Policy changes and referrals can be made while paused; appointment progress requires ticks.

Occupational Health is a modeless facility window for duty coverage, survey policy, queue status, and assessment-record links. Its reusable assignment component accepts a relevant skill, eligibility selector, and assignment callback rather than owning clinical rules. It exposes recorded skill and current job/patient reservations independently; it does not infer future shift availability. Manual requests remain referrals while routine care uses policy-driven discovery. Assessment history is bounded and completed clinical job history is pruned to 50 entries when new referrals are created. Persistence validates survey records and intervals, patient references, distinct clinician/patient reservations, and pending-referral uniqueness. Clinical equipment, exclusive room capacity, consumables, consent/refusal behavior, and treatments remain unimplemented.

Rapid mood screeners and anomalous surveys append bounded `clinicalSurveys` records. A mood screener never creates a psychiatric report or sanity estimate; untrained administration takes longer and produces a wider, lower-confidence range. Psychiatric evaluations retain the deeper psychological record. An anomalous survey without supported evidence records the limits of its findings, not an omniscient all-clear. Medical XP can accrue from screening, but automatic skill-level promotion is not yet implemented.

The current pawn object model is defined in [personnel-model.md](personnel-model.md). This section records the architectural constraints that apply across its simulation and presentation layers.

Store physical needs, stress, fear, memories, effects, activities, and mental resilience as facts. Derive mood and sanity from those facts through pure selectors. Recreation is modeled through restorative activities and memories that change stress, not as an independently decaying meter.

A sanity selector should return both a band and named contributors. Mental breaks are simulation outcomes based on sanity pressure, traits, context, and deterministic randomness. Do not persist a second mutable sanity value that can drift out of agreement with its inputs unless later design proves hysteresis requires explicit state.

## Equipment and Affixes

Item instances reference immutable item definitions and zero or more affix records. Equipment effects register through explicit hooks or system queries rather than arbitrary scripts embedded in save data.

Visual appearance is derived separately from equipment state. Item definitions reference visual layer IDs and attachment metadata; SVG files contain no gameplay values.

## SVG Asset Contract

Reusable SVG sources and their generic composition metadata are owned by [`packages/open-iso-gfx/`](../../packages/open-iso-gfx/). SCPSiteManager may map those generic assets to game entities and add setting-specific artwork in its own content layer, but OpenIsoGfx must never import game code or SCP concepts.

Every composable SVG asset should provide:

- A stable asset ID and semantic version
- Named groups for base geometry, tint channels, shadows, lights, and damage overlays
- Direction and pose metadata
- A shared isometric origin and documented dimensions
- Named attachment anchors for hands, head, body, floor contact, and effects as applicable
- Explicit layer order and compatible equipment slots
- License and attribution metadata

SVG is the sole initial source and runtime art format. Although SVG can embed raster images, no rasterization or sprite-atlas pipeline belongs in the first implementation. The catalog defines joint hierarchies, pivots, attachment anchors, and required semantic group IDs; SVG provides the corresponding grouped vector geometry.

Animation playback belongs to the browser renderer rather than SMIL, CSS, or scripts embedded in SVG files. The renderer selects authored direction/pose groups and may transform joint groups using visual action progress from snapshots. Simulation state remains limited to semantic direction, pose, and action progress and never references SVG internals.

Keep source SVGs separate from any optimized runtime output. Optimization must preserve required IDs. The OpenIsoGfx catalog owns provenance, rig compatibility, and generic attachment metadata; game item definitions own gameplay effects and setting-specific meaning. Tests should verify required groups, joints, and anchors for each template class.

## Testing Strategy

Minimum automated coverage should include:

- Headless imports with no browser globals
- Deterministic replay equivalence
- Save/load round trips and migration failures
- Tick ordering and event ordering
- Job eligibility, scoring, reservations, interruption, and recovery
- Psychology selectors and mental-break thresholds
- Alert classification and configurable runtime responses
- Item transfer, equipment effects, affix hooks, and paper-doll projection
- Temporary map creation, expedition transfer, return, and cleanup
- Browser controller integration without direct state mutation
- SVG template contract validation

Tests should use direct ticking rather than real delays. Browser smoke tests can verify rendering, window behavior, input translation, and persistence around the tested headless core.

## Initial Technology Choice

Prefer TypeScript with strict checking, ES modules, Canvas 2D, DOM-based 98.css windows, and a lightweight build/test toolchain. Avoid a frontend framework until window and inspector complexity demonstrates a concrete need. The simulation should compile to ordinary JavaScript usable by both Node tests and the browser bundle.

Record changes to these boundaries as short architecture decision records under `docs/decisions/` once implementation begins.
