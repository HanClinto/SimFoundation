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

Store needs, stress, fear, memories, effects, and mental resilience as facts. Derive mood and sanity from those facts through pure selectors.

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
