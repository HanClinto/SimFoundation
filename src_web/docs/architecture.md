# SCPSiteManager Architecture

This document defines the initial implementation boundaries for the web game. It is intentionally more stable than the folder layout: modules may move, but dependency direction and state ownership should remain explicit.

Approved next direction: [persistent multi-site simulation](decisions/008-persistent-multi-site-simulation.md), with a [staged refactor plan](multi-site-refactor.md), tracked in [#24](https://github.com/HanClinto/SimFoundation/issues/24). The headless site collection and scoped application controller now run persistent sites through shared local systems and personal queue execution, without campaign fields in local state. Ownership, work isolation, replay and per-site incidents are tested. Browser bootstrap/save conversion and transfers are still pending; the base/temporary-expedition descriptions below document the current browser implementation rather than the target architecture. See the plan's implementation status for the exact remaining work.

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

Browser catch-up advances one tick at a time so incident responses can stop at the exact transition. A new Yellow state reduces speed to 1x; Orange and Red transitions pause. Handling updates the previous-alert state before publishing the pause, preventing recursive responses. Manually resuming an unchanged incident is permitted, and paused wall time is not accumulated for later simulation bursts. Audible alarms remain unimplemented and are not advertised by the UI.

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

The browser stores authoritative game state under `scp-site-manager.game-state.v1`, separately from window layout. Published simulation changes autosave, and explicit Save Site/Load Site commands use the same record. Only exact current-version development saves load. Startup discards and overwrites malformed or incompatible records with a fresh session when storage is writable. Never implement save migrations or retain obsolete gameplay for backward compatibility during development; bump the schema and start fresh. Running/paused state remains browser state and is not serialized. Schema 45 removes all annex state.

Resident anomaly records are authoritative simulation state. The first implementation stores SCP-999's protocol state, target, interaction boundary, cooldown, and last completed contact. The browser Anomaly Registry only projects those records; target choice and personnel Effects remain deterministic headless behavior.

SCP-999 uses the same map and cardinal routing as personnel. It approaches an available reachable target, starts its four-tick contact only from the same or an adjacent tile, and interrupts without granting Calm when the target moves away or starts work. When no suitable target exists it follows a deterministic common-room roaming pattern. Approach, contact, cooldown, position, and target all survive save/reload; the registry distinguishes approach from actual contact.

The physical-site prototype adds `world.map` and `world.positions` to versioned state. The 128x128 map contains a compact 30x30 starting footprint, authored room bounds, and grass/floor/wall/door tiles. Positions are keyed by personnel and resident-anomaly IDs. Cardinal A\* routes use the `pathfinding` package with stable neighbor ordering; walls and held-closed doors block routes, while automatic doors require a physical opening step. Personnel share walkable tiles (soft occupancy). Routine furniture has exclusive reservations; hard traffic collision is not implemented.

Jobs own a serializable `workSite`. Eligibility requires a positive relevant Skill and a reachable destination. Workers move one tile per tick and earn no work progress or XP while travelling. A lost route releases the worker, preserves completed progress, and exposes a blocked reason. The next tick can reconsider work when access returns; carried-material orders remain restricted to their original carrier. Routes are derived from current topology rather than serialized, so reload and obstruction recovery use the same path rules. Room categories describe space; facility behavior comes from physical objects and implemented work rather than a laboratory designation.

`SiteJob.priorityOverride` is an optional Low/Normal/High user setting (20/50/75); it never overwrites automatic `priority`. `effectiveJobPriority` is shared by scheduler sorting and the Work Orders ledger, with automatic priorities >=90 always taking precedence. `setWorkPriority` rejects completed/emergency jobs and invalid values; null removes the override. Priority edits affect future eligible assignment only and do not touch resource/worker reservations, progress, or authorization. Same-job phase transitions preserve the override through record spreads; separately created project jobs do not inherit it implicitly. The keyed Work Orders controls remain stable across ticks and reordering. Schema 35 validates the override and prevents older clients silently ignoring queue policy.

The Camera Feed projects map tiles and actual occupant positions, with browser-owned pan/zoom/selection and existing dossier links. It never advances positions. Map/room dimensions, terrain length, positions, required occupant IDs, unique IDs, and work-site bounds are validated on load. Incompatible development saves deliberately require a fresh site.

`map-selection.ts` is the fixed-height inline selection surface. It uses raw World state or `observedSnapshot` projections, exposes live needs only in World mode, and routes Inspect/Move to existing owners. Quick object movement reuses the object inspector's placement routine, including confirmation and validation, rather than relocating inventory. Door policy changes use the controller's protected command; Recorded edits are disabled. The panel is updated only on selection/simulation render, not cosmetic animation frames, and it clears its actions during placement.

Camera following is transient browser state in `site-map-view.ts`, not a simulation field. Each normal render resolves the selection through `mapObjects(displayed().game, perspective)` before moving the center, so unseen Recorded movement cannot affect framing. Zoom retains following; manual navigation, explicit focus, placement, or a missing projected selection clears it. A carried object's position is resolved by the existing object projection, with no duplicate transport logic.

### Material Stock And Placement

The annex model, executor, controller commands, project art, placement exclusions, register and validation have been deleted. Schema 47 also deletes the remaining `construction` state and `environment.spentMaterials` counter. Physical material stacks and their reservations are authoritative. `availableMaterials(objects)` derives uninstalled, unreserved ground quantities; carried or reserved supplies are not spendable. Authorizing work reserves stacks, cancellation releases them, and completed work consumes them, without parallel balance debits/refunds.

Surface/vessel work requests supply relative to its actual work destination, not a saved stockpile coordinate. Alternate locations are considered deterministically by Manhattan distance and ID. Existing batching still requires enough compatible material at one location; this is not multi-source consolidation or a shortest-route optimizer. Load validation checks quantities, reservation ownership and active work's required cargo, not a universal 160-unit initial budget. Scenario tests verify conservation for 23 and 240 materials, relocated stock, cancellation, vessel work, hauling exclusion and current-version reload. The starter site's 160 units are authored content only. Meal counters and mission loadouts are separate systems, unchanged by this consolidation.

Engineering, Objects and Surveillance supply `PlacementRequest` objects with a footprint, validation callback, and confirmation callback. `placement.ts` manages a pinned origin and confirm-time validation; `site-map-view.ts` handles pan, zoom, selection, temporary Confirm/Cancel controls, and keyboard cancellation. No retired annex mode or blueprint schema remains.

Work orders retain their own physical destinations. There is no selected research-room override or named-experiment routing. Work Orders preserves keyed DOM rows and buttons across ticks so location links and authorizations remain operable during simulation updates.

The scripted SCP-9620 state machine and seeded experiment jobs have been removed. Initial jobs are empty. Scheduling, movement, cargo identity, and persistence tests supply explicit generic fixtures instead of relying on a scenario. The core tick advances needs, routines, jobs, resident behavior, object/vessel work, surface work, exposure, observations, and maintenance without recognizing named experiment IDs.

Facility and map windows are inspectors over simulation-owned map entities. Global playback and lifecycle controls live in dedicated utility windows. Raw deterministic internals such as tick number and seed are exposed only through opt-in developer inspectors.

Browser presentation should follow the interface contract in [lookbook.md](lookbook.md). The look-book may evolve through visual review without weakening the dependency or state-ownership rules in this document.

Browser code reads immutable snapshots and domain events. It never mutates entities or invokes atomic simulation systems directly.

## State Model

### Execution Steps

`action-steps.ts` projects the current executor phase as `ActionExecutionStep` with parent key, inherited source, kind, label, nested path, target/location and progress detail. It is read-only and does not schedule work. Routine collection/carry/eating, movement, jobs, recovery and tactical preparation/recovery are projected from their owning state. `stepWorld` provides an optional door-opening callback; routine, job, tactical and field-recovery owners stamp actual events on the parent's `ActionTiming.doorStep`. The stamp is valid only on its recorded simulation tick and matching parent/map, so paused readback is stable without creating historical or speculative steps. Field storage merges only its team's timing updates. Optional tick/position metadata is validated under schema44. Parent timing, ordering, cancellation and resource accounting are unchanged.

The map's `.pawn-selection-area` contains its existing portrait control, inline target details and queue. An explicit pawn selection synchronizes active-person and camera selected identities; ordinary target selection does not change the actor. Follow remains independently pinned. Self-target details suppress repeated identity/status content, while another pawn exposes explicit Control. Field map cloning removes the base area's generated contents before constructing its own instance.

### Action Progress (Schema 44)

`action-progress.ts` defines a shared `ActionProgress` projection: kind, label, compact text, detailed explanation, optional completion fraction, and elapsed simulation minutes. Routine duration and route distance override generic elapsed time. Route length comes from the existing A\* planner, including traversable automatic doors but not the additional time needed to open them. Movement, routine collection/seating, job work-site travel and field recovery use their current executor destinations. Unsupported/open-ended actions retain elapsed time without inventing a percentage or ETA.

Root `actionTimings` maps a person to the active map, stable action key and started tick. Controller publication and root tick boundaries reconcile timers across queue changes, automatic handoffs and field transfer. Repeated updates to one identity retain its clock; a changed action or map resets it. Existing routine start ticks supply exact elapsed time where available. Automatic work takes display priority over pending manual intentions; those intentions do not accumulate active time while waiting behind it. Timing records are validated for person/map identity and bounded integer ticks on load. No timer is tied to browser selection or wall-clock time, and no execution resource/progress is duplicated.

### Personal Action Ownership (Schema 42)

`person-actions.ts` identifies the actual current routine or job by a stable owner key and projects source, verb, target and activity detail. Routine producers record Schedule, Need or Autonomy when choosing sleep, meals or discretionary breaks; work/clinical commitments report Job. Player intentions use the existing manual queue. These sources share the current-action tray and a coordinator handoff without duplicating execution progress or reservations. This is an adapter over implemented producers, not a second meal/job executor or a speculative schedule expansion.

Add to Queue behind an automatic action stores its owner key in `current.waitingFor`. The executor continues until that commitment ends; the coordinator starts player work at the next safe boundary before routine/job discovery can claim the pawn again. Cargo-bound job phases preserve their claim across pickup/delivery transitions. Do Now uses existing draft/interruption checks instead: ordinary work retains progress, while cargo and active clinical appointments remain protected. Automatic cancellation is keyed/revalidated and follows the same safe owner; it never refunds consumed meals or spent supplies. After manual work drains, autonomous proposals are reconsidered from current needs/schedule, not resumed from a duplicated stale action.

The tray shows an automatic current tile even with no player queue, source-labelled as Job, Schedule, Need or Autonomy. Player entries waiting behind it are all pending, reorderable and clearable without affecting that current commitment. Automatic actions are not draggable. Recorded mode hides live plans and disables cancellation. Existing producers still choose one actual automatic commitment at a time; random preference changes, refusals and speculative multi-step autonomous plans are not introduced here. Schema42 persists routine source and the manual handoff key.

### Manual Intentions

Schema43 adds `eat`, `sleep`, and `relax` intents naming a furniture object. `orderPersonalRoutine` validates installed/serviceable/unreserved furniture, actor and route, meal availability and safe interruption before creating `RoutineActivity.source = "player"`. The existing routine executor handles travel, meal pickup/carry/consumption, seating and needs changes; player source permits execution under drafted ownership and bypasses only autonomous schedule-based dismissal. No second progress model is stored. The manual queue owns start/completion/retry/cancel; player routines are excluded from automatic-action projection. Queue completion observes routine termination or its blocked reason. Pending validation checks persistent object kind, not current station availability, so damaged-target blocked intentions remain saveable.

Save validation ties the player routine's kind/station to its active queue intention, requires drafted Hold ownership and permits only that routine's reserved meal as carried cargo. Legacy accepted tactical replacements clear a non-carrying player routine; carrying meals reject replacement. A no-op Draft preserves the queue. Starting an encounter with an active player routine is refused, as are personal routines for an active encounter participant. Explicit base-only routines can temporarily draft an autonomous pawn, retaining prior ownership for release after completion. Already-drafted staff remain drafted. Sleep uses the existing rest target95, meals12 eating steps/one real serving, and relaxation30 seated steps.

`personCurrentAction` projects non-queue ownership for the tray: existing routines/jobs, condition, mission phase or recovery, legacy tactical orders, Waiting, then Idle. It is distinct from `automaticAction`, which remains the routine/job handoff contract; Idle and mission status must never become automatic commitments or block queue execution. Queue-owned intentions remain rendered from their existing progress/status. `cancelPersonAction` revalidates a map-scoped owner key and delegates to the routine/job, tactical or field-recovery owner. Non-cancellable mission/condition entries provide reasons. Field transit entries have no position and are only inspectable, not movable. Idle is a pure fallback with no serialization, resources, ticks or cancellation. Schema42 remains unchanged.

`action-queue.ts` owns root-level per-person queues across base and field maps. Each stores one current intention, up to seven pending intentions, stable sequence IDs and whether manual ownership should eventually return to autonomy. Intentions name map, actor, verb and target or destination; progress, cargo, preparation and costs remain with the existing tactical/recovery owners. Root tick processing starts eligible work, observes completion/recovery and advances the next entry. Failed starts wait for explicit Retry/Cancel; blocked running actions retain their executor and reason. Pending intentions acquire no reservations. Queue state and current executor references are validated on load.

The controller exposes queue submission and edit commands separately from legacy immediate tactical commands. Accepted immediate commands discard that person's competing queue; expedition phase/location changes invalidate location-bound intentions. Browser queue rows are keyed by persistent sequence ID so stale cancellation cannot remove a different pending action. The menu's Subject > Object > Verb path is presentation-only; neither the active browser pawn nor optional future modifier branches create separate authoritative actors or execution progress.

### Expeditions (Scenario Definitions: Schema 48)

`expeditions.ts` owns notices, an active manifest, supply reserves, lifecycle deadlines, recovery orders and bounded return history. The active field site holds its own world, objects, observations, combat and environment; global personnel are referenced by ID. Away staff have no base position or base responder state. A base-only roster is used for local simulation, then the global roster is reconciled and field systems advance on the same clock. This excludes away staff from home jobs and observation without deleting their schedules, clinical history, equipment or identity.

`fieldState` is an ephemeral simulation view, not independently serialized state. `storeFieldState` writes back only field-owned slices and changed personnel. Field movement, doors, combat, observation and exposure reuse existing rules. Cargo handling uses reserved physical objects, with a six-step securing phase and actual carrying to extraction. It can be cancelled at the carrier's position. Recall requires stable, recoverable staff; new injury during regrouping returns control to field operations. Successful return transfers manifested cargo and attached emission sources once, restores base positions/supplies, then removes the field map. A blocked arrival retains the operation until its prerequisites recover.

Application commands explicitly scope field actions with the expedition ID. Base draft/order commands reject enlisted staff. Field doors never target the base map, and UI map focus is not a source of authority. `expedition-controller.ts` supplies a browser map projection; root snapshots alone are autosaved. Shared canvas CSS is class-based to support multiple independently sized map windows.

`expedition-site.ts` owns authored scenario definitions: notice text, site name, travel time, extraction, recovery target IDs, optional encounter position and a site factory. The depot and noncombat service store exercise the same executor. Completion is identity-based and shared by return status and reporting. Save validation derives map dimensions, expected objects and source bindings from the selected factory rather than depot constants. No nested full GameState, copy of global personnel, generated material rewards or alternate time source is stored in the field. See [decision 003](decisions/003-expedition-location-ownership.md), [decision 007](decisions/007-authored-expedition-scenarios.md) and the [expedition guide](expeditions.md).

### Tactical Response (Schema 37)

`combat.ts` owns drafted responders, positional orders, preparation/recovery counters, finite response supplies, functional injuries/incapacitation/stabilization, a bounded optional adversary, its sight memory, terminal encounter status and a 40-entry event history. It uses existing routing, door movement and line-of-sight rules. No browser clock, DOM, or randomized rendering state enters combat resolution. See [decision 002](decisions/002-tactical-response.md).

Tactical movement and actions run after door closing and before routines/jobs. Drafted or incapacitated people are excluded from routines, new job assignment, and resident social contact. Drafting retains ordinary job progress and material reservations, but refuses active cargo and clinical commitments. New medical referrals for drafted/incapacitated staff wait for release. Persistent tactical trauma becomes an ordinary injury effect for subsequent clinical assessment without creating a diagnosis automatically.

The adversary's position belongs to the optional encounter record, not the fixed personnel/resident position registry. Its position is included in manual/automatic door obstruction checks. It currently targets only the enrollment roster; generalized hostile interactions with civilians, other anomalies, construction occupancy, or destructible objects remain future work. Renderer/map selection project its location independently, with remembered sightings in Recorded view. Live tactical health, events and response controls are World-only.

`combat-persistence.ts` validates responder IDs, supply bounds, action timers, targets, injury-state consistency, encounter membership, map bounds, observation timestamps, event history, and absence of contradictory job/routine/cargo ownership. Schema 37 requires a fresh development save.

### Electrical Utilities (Schema 36)

`PhysicalObject.kind` includes generator, cable, and light, with optional boolean `utilityEnabled` defaulting to true. Installation, relocation, reservations, and cargo remain owned by the existing object store and object-work system. Installed cable occupies a separate underfloor layer: it does not count toward storage capacity, obstruct doors, or conflict with furniture. Packed cable is ordinary finite inventory. Starting equipment and its commissioned circuit are authored by `power-setup.ts`.

`power.ts` derives cardinal connected components, supply, demand, and per-device status from immutable authoritative state. Cameras attach to one same-tile or adjacent terminal with a stable ID tie-break and add demand without bridging circuits. Components overload as a unit; removing demand or adding supply restores service on the next derivation, without time-based oscillation. `observeSite` consults this graph before admitting a camera as a sensor. Personnel vision is unchanged. `lighting.ts` derives bounded illumination using the existing line-of-sight implementation. Neither graph nor light field is serialized.

Electrical damage is accumulated from the existing exposure reach and applied to object condition. Ground and carried electrical objects are affected; contained and off-map objects are excluded from external exposure. Zero condition removes electrical continuity and service. Repair reuses the existing material-delivery and engineering pipeline with an electrical target and a steel service kit. `repairUtility` rejects non-electrical targets. Reservations prevent moving or switching a device during repair; save validation checks repair targets and material accounting. The historical `vesselWork` field remains the storage owner for this shared repair pipeline; its other actions still require vessels.

The Power inspector is explicitly World-state inspection, with a read-only Recorded projection when opened from that perspective. Recorded mode does not infer current power or illumination from partial knowledge. Camera service status is administrative telemetry, while sightings remain observation-limited. Utility problems are inspectable service states, not new automatic Orange/Red incidents. The renderer consumes graph/light results, original equipment glyphs, and a separate power overlay; it never changes service or applies damage.

See [decision 001](decisions/001-physical-electrical-utilities.md) for the scope and alternatives.

### Facility Observation Memory

`observations` is simulation-owned, serialized knowledge: remembered tiles and their last-seen ticks, current visible tile/entity sets, entity sightings with observer IDs and coarse outward impressions, known room records, the last observed SCP-999 protocol snapshot, and camera installations. Awake personnel report their local surroundings; sleeping staff do not provide sight. This initial model assumes working staff communications. Installed enabled cameras provide local omnidirectional coverage. Walls occlude sight, closed doors occlude sight, diagonal wall corners block sight, and range is bounded. Directional cameras, communications failures, lighting, and unusual sensing are later extensions.

The initial state includes a surveyed 46x46 site area (tiles 40-85), known rooms, and three installed cameras. Surveyed information is remembered information, not live coverage; terrain outside that survey remains unknown until observed. Three additional installation kits support engineering orders without current coverage, including unsurveyed locations. Placement rejects known unsuitable terrain using recorded tiles; engineers verify actual interior flooring on arrival, leaving an unsuitable site as a blocked order. Installing a camera consumes one kit and requires physical work before it contributes sight. Manual camera enable/disable commands recompute visibility immediately without advancing time.

Browser rendering uses `observedSnapshot` for remembered positions and activities, known room records, and last observed SCP-999 state. It does not mutate the authoritative state. The Camera Feed distinguishes live terrain, dim remembered terrain, unknown regions, and labeled last-sighting markers. Personnel impressions use recorded observations; clinical reports and administrative orders remain documentary knowledge. Unseen SCP-999 details stop updating and explicitly indicate unknown current state. Player camera configuration and installation orders are known administrative intent, not evidence of unseen anomaly behavior.

Save validation checks observation array bounds, timestamps, observer/entity references, unique visible sets, camera kits, and installation-job references. This observation layer does not yet model cameras losing power or reports being delayed; those should alter observation sources rather than give the renderer access to hidden truth.

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

### Daily Routines

Optional low-stress recreation reuses the existing `break` activity and station reservation. `recreationDue` spaces the stable sorted roster across a 120-minute period, with a ten-minute opportunity to find a seat. Only free-time staff without carried cargo qualify. No random state or additional save fields are required. The normal 30 seated ticks complete a visit; travel does not count. Break reservations release for hunger/tiredness or a non-free schedule when stress is below 55. Staff can miss an opportunity when seats or routes are unavailable; this is not a guaranteed recreation quota.

`routines` owns hourly schedules, service stations, exclusive per-person station reservations, blocked reasons, pantry/store meal counts, and a finite supply order. Each tick updates needs, discovers clinical work, evaluates routines, then assigns and advances jobs. Routine activities restore needs only at their destination. The default work day is 08:00-18:00; sleep is 22:00-06:00. Critical hunger/exhaustion interrupts work (releasing both participants of a clinical appointment); ordinary off-duty changes allow committed work to finish. New ordinary work does not assign off-duty or active-routine personnel. Pantry hauling is preserved through personal-need interruption so carried stock cannot change owner remotely.

Pantry replenishment is a two-stage logistics job: reach storage and collect, then physically deliver the same counted load. A single pending supply order and its required carrier prevent duplicate delivery. Initial meal conservation is 108 across store, pantry, consumed meals, and any carried load. Save validation checks this equation, 24-hour schedules, station references, and exclusive reservations. Stock cannot replenish indefinitely; external procurement remains unimplemented.

The Day Planner is a browser-owned modeless inspector over schedules and observable activities. It never changes needs directly. The Camera Feed renders original station markers and broad activity labels. Assignment tables consider current routines and off-duty schedules as well as jobs. Needs and stress recovery no longer depend on arbitrary activity-description text.

### Clinical Work and Occupational Health

Assessment commands create serializable clinical referrals instead of immediately generating reports. A clinical order identifies its patient and examination type. The job scheduler reserves both a qualified clinician assigned to medical duty and a distinct patient; both must reach the medical bay before progress begins. Patient or clinician unavailability and blocked routes delay work. Completed physical and psychological reports identify the attending clinician. Examinations change recorded knowledge, not authoritative injuries.

`clinicalCare` stores assigned staff IDs and independent physical, mood, psychiatric, and anomalous-review intervals (disabled, four hours, eight hours, or daily). A due review creates the same referral as a manual request and deduplicates pending visits. It uses recorded review dates, not hidden health values. Anomalous scheduling waits for the research capability. Any existing pawn can be assigned, but `ASSESSMENT_REQUIREMENTS` and `clinicalQualificationReasons` define procedure eligibility shared by job execution and the UI: Medical 0 for rapid mood screening, 3 for physical examination, 5 for psychiatric evaluation, and 6 plus research for anomalous surveys. One assessor cannot examine themselves. Formal qualifications and specializations remain future work. Policy changes and referrals can be made while paused; appointment progress requires ticks.

Occupational Health is a modeless facility window for duty coverage, survey policy, queue status, and assessment-record links. Its reusable assignment component accepts a relevant skill, eligibility selector, and assignment callback rather than owning clinical rules. It exposes recorded skill and current job/patient reservations independently; it does not infer future shift availability. Manual requests remain referrals while routine care uses policy-driven discovery. Assessment history is bounded and completed clinical job history is pruned to 50 entries when new referrals are created. Persistence validates survey records and intervals, patient references, distinct clinician/patient reservations, and pending-referral uniqueness. Clinical equipment, exclusive room capacity, consumables, consent/refusal behavior, and treatments remain unimplemented.

Rapid mood screeners and anomalous surveys append bounded `clinicalSurveys` records. A mood screener never creates a psychiatric report or sanity estimate; untrained administration takes longer and produces a wider, lower-confidence range. Psychiatric evaluations retain the deeper psychological record. An anomalous survey without supported evidence records the limits of its findings, not an omniscient all-clear. Medical XP can accrue from screening, but automatic skill-level promotion is not yet implemented.

The current pawn object model is defined in [personnel-model.md](personnel-model.md). This section records the architectural constraints that apply across its simulation and presentation layers.

Store physical needs, stress, fear, memories, effects, activities, and mental resilience as facts. Derive mood and sanity from those facts through pure selectors. Recreation is modeled through restorative activities and memories that change stress, not as an independently decaying meter.

A sanity selector should return both a band and named contributors. Mental breaks are simulation outcomes based on sanity pressure, traits, context, and deterministic randomness. Do not persist a second mutable sanity value that can drift out of agreement with its inputs unless later design proves hysteresis requires explicit state.

## Equipment and Affixes

### Designated Storage

`StorageArea.emission` optionally selects `any` (default), `none`, or `active`. `storageAccepts` combines type and enabled positive-dose attached-source state for policy validation, automatic candidate selection, manual transfers, and final placement. Source targets protect only matching unreserved stock; an object whose emitter switches on can leave a non-emitting area despite its target. Current mismatches remain stored and count toward capacity/total-unit targets, with a visible policy status. In-flight state changes block placement without releasing cargo or invalidating saves. Persistence validates the filter value, not permanent conformity of stored/incoming objects to a mutable emitter state. Schema 35 prevents older clients from silently ignoring this delivery rule. These are administrative admission rules, not containment structures, automatic packing, exposure immunity, or perception-based anomaly detection.

`storage.ts` owns floor-area policies: rectangular bounds, accepted definitions, capacity, total stock target, enabled state, and meal-serving eligibility. Policies are administrative records visible in both map perspectives. The Storage inspector uses the shared placement contract for creation and relocation; area overlap, installed furniture, reserved inventory, and pending construction are rejected. A committed destination cannot be edited away while a transfer is active. Removing or relocating a designation never moves inventory instantly.

Stock discovery runs after object work and observations. It creates ordinary object transfer orders in batches of up to twelve stack units or one packed object. Existing incoming transfers count against target and capacity; exclusive item reservations protect source counts, and source-area targets retain their stock. General transfer placement validates storage filters/capacity again at delivery. Compatible unreserved stacks merge on put-down, preserving total quantity and condition. Different conditions are not consolidated when reserving supplies. There is no storage-only hauling state machine.

Dining finds physical unreserved meal stacks in enabled meal-serving areas and chooses a reachable collection point by route length. `pantryMeals` is a summary of serving-area availability; `reserveMeals` includes all other non-issued physical meals, including haul cargo. `mealsConsumed` retains its existing issued-portion meaning, with carried personal meals reconciled by object validation. The room-coordinate pantry path, `supplyOrder`, `nextSupplyNumber`, and `advancePantrySupply` are removed. Schema 35 persists/validates area identity, filters, dimensions, limits, overlap, incoming reservations, and serving-meal summaries. The map has an independent Storage overlay and selectable area records.

Capacity and target are total item units across accepted types, not weight, per-type quotas, or per-tile slots. One destination is reserved per transfer; a requested move must use a clear reachable work face. Automatic cleanup of excess/wrong-type stock, shelves, containers, external procurement, and hauling priorities are not included. Hauling obeys the same door policies as other movement.

### Physical Object Layer

Vessel `repair` orders reuse collection, same-carrier delivery, and engineering completion. Admission requires an empty, open, damaged, unreserved case on the ground; completion checks the case is still empty/open and physically reached before consuming materials. `vesselOrderCost` centralizes fabrication (4x surface cost), repair (2x), and zero-cost handling. Both contribute to committed/consumed ledgers; cancellation restores only unused stock once and releases the case. Repair restores the original identity to 100% without changing material or closing the seal. Schema 35 validates repair cargo, case reservation/material, phase, and shared inventory accounting. Repair is deliberate work, not an automatic damage reset or suppression operation.

`facility-incidents.ts` assesses recorded wall/door and vessel conditions in one pass after observation. Sealed cases at <=25 integrity produce Yellow and breached case records produce Orange, without looking at hidden contents or unseen live wear. Equal/higher independent incidents are retained; condition-owned summaries can be recomputed when one problem resolves. Alarm Manager renders recorded case rows with stable buttons and observation age. `vesselTransitForecast` is an administrative constant-emission estimate used by the vessel inspector and placement preview, not an automatic veto or telemetry source. It excludes pickup/deposit delays and explicitly warns when nominal transit exhausts case integrity.

Portable containment adds `vessel` to object definitions and `{ material, sealed }` metadata to that kind only. Contents retain their object records with `location: { kind: "contained", vesselId }`; a one-level resolver follows the case's ground/carrier position. Containers cannot themselves be contained, stacks are excluded, and only one item may reference each vessel. Neither cargo nor vessel is consumed on loading. Physical rendering omits contained cargo; observations do not inspect contents through the case. `containingBarrier` blocks contained sources while the vessel is sealed and has positive condition. `advanceVesselWear` uses summed internal dose and material resistance before external exposure each tick. Breach removes that barrier without deleting contents. Storage/carrying cues use escaping case emission.

`vessel-work.ts` owns fabrication and handling jobs. Fabrication reserves `4 * MATERIALS[material].cost`, collects and delivers that physical stack, then consumes it at the work face when engineering creates the case. Loading/opening/sealing/unloading reserve the case (and staged cargo for loading) until physical work completes. Fabrication and unload/deposit footprints reserve against other spatial work. Cancelled jobs release unused ground materials and workers exactly once; in-transit fabrication cargo cannot be cancelled remotely. `vesselMaterialCommitted` and completed fabrication costs join the existing 160-unit material ledger.

Transport is a scheduling abstraction: a logistics handoff transitions the case to `location: { kind: "transit", orderId }`, with an arrival tick after 30-1,440 minutes. Contained sources still wear sealed cases while no local emission position exists. At arrival, a clear reserved tile receives the existing case with the same contents; a blocked tile delays arrival without freezing wear. Breached cases are deposited, not discarded. Truck/helicopter are currently equivalent labels representing external movement and handwaved underground unloading; no extra levels, physical vehicles, fuel, prices, live-resident transport, or external harm simulation are added. Source disable remains a sandbox operation, not a suppression task. Schema 35 validates material/phase ledgers, vessel creation history, unique nonrecursive contents, cargo reservations, transit ownership and arrival timing.

`objects.ts` defines immutable object records with identity, definition, quantity, condition, orientation, installed state, exclusive reservation, and a tagged ground/carried/consumed location. `reserveStack` splits counts without duplication; pickup and put-down require physical reach and enforce one carried object per pawn. `object-work.ts` uses the same representation for furniture and supply-stack relocation. Transfer phases are pickup, carry, installation (furniture only), and completion. Packing is a transfer that leaves the object uninstalled in place, not a resource refund.

Routine stations are derived from installed usable furniture and retained temporarily for existing users while a move waits. New users cannot reserve a moving object. Beds occupy two tiles with one usable interaction tile; the remaining footprint is projected into `map.objectBlocks` for A\* movement, but does not block sight. Destination footprints are reserved by pending object orders. Construction checks ground objects before covering a footprint. Pickup is gated by user completion and carrier availability; the normal scheduler assigns delivery work with the required carrier rather than directly overwriting worker reservations.

Material and pantry counters remain validated ledger summaries for their existing owners. Reserved material stacks physically move through collection, delivery and consumption. Both surface work and annexes require the right cargo before completion. Pantry batches use the same transfer primitives; a personal meal becomes carried cargo until the pawn reaches a meal seat. Supplies can be relocated and later collection uses an available stack's actual location. A requested batch currently must be satisfiable by stacks at one location; multi-source consolidation is not implemented.

`observations.objects` stores last-observed records; Recorded projections substitute these objects and their usable furniture positions. World inspection reads live objects. Schema 35 validates identity, count conservation, footprint geometry, exclusive carriers, supply ownership, transfer phase relationships, and routine-held meal cargo. Initial furniture and spare objects are finite scenario inventory, not spawned from UI buttons. Vessel fabrication and one-object containment are available; object weights, nested containers, general crafting, external supply procurement, and camera-device unification remain deferred.

### Map Materials and Exposure

`emission-effects.ts` derives deterministic cosmetic samples from `exposureTiles`, capped at 16 per source and 512 total, and caches them by immutable game-state identity. Corrosion/impact have separate bounded particle motions. The browser runtime exposes a speed-scaled cosmetic clock that freezes when paused; map animation redraws only the canvas when effects are present, visible, and not reduced-motion. Reduced motion renders the static pattern. Effects are World-only and absent for contained/disabled sources; they cannot change simulation RNG, damage, or persistence. Runtime running state is subscribed rather than cloning the full snapshot every animation frame, and paused fractional time is discarded.

`ExposureSource.objectId` optionally binds an emitter to a stable non-stackable object. `exposurePosition` resolves ground/carrier coordinates each time; the stored position is only fixed-source state or the last binding snapshot, never a live fallback when an attached host has no position. `exposureTiles` therefore moves with ordinary pickup/carry/install/pack work without another motion system. Binding rejects supplies, missing hosts, and non-unit quantities rather than inventing effect splitting/merging. Host condition/installation do not switch off emission. Recorded map projections use recorded host/carrier positions; the raw sandbox inspector remains administrative. Schema 35 validates host references and prevents older clients treating attached emitters as stationary. Detachment is explicit at the host's current position; removing a source does not remove its host. No new objects, actor health effects, or vertical mechanics are introduced.

Surface cancellation is owned by `cancelSurfaceWork`. Collecting/fitting orders release unused ground cargo in place, merge compatible unreserved stacks, delete their job, release any worker, and adjust available/committed material summaries once. A delivering order sets `cancelRequested`, retains carrier ownership, and completes physical put-down before cancellation; its stock is not available early. Completed/cancelled orders are immutable history. `isActiveSurfaceOrder` governs footprint reservations and maintenance limits across all owners. Schema 35 persists terminal cancellation and deferred requests, rejects cancelled jobs/cargo and impossible request phases, and validates adjusted material ledgers. Automatic maintenance may rediscover a cancelled repair; cancellation does not silently disable facility policy.

`spaces.ts` flood-fills known cardinal topology into physical connected spaces, using walls and closed doors as boundaries. It reports tile/floor counts, map-edge connectivity, and contact with unknown terrain. Unknown boundaries cannot be certified enclosed. Space IDs are local to a derivation, not persistent identities or room designations. The Spaces overlay and Engineering records project World or Recorded topology separately; browser projection caches by immutable tile-array identity. Exposure propagation uses the same physical barrier predicate, not `isWalkable`, so furniture movement blockers cannot act as environmental barriers. No atmosphere, temperature, or room-function effects are inferred from horizontal enclosure. No save-schema change is required.

The facility setting is a deep underground bunker. Overhead cover is inherent, not a separately constructed or maintained roof layer; opening a door or reaching a map edge does not expose a space to outdoor weather. Retain the independent floor and structure layers without adding roof jobs, costs, or damage. The planned arrival/departure boundary is a large central elevator used by cargo and mission personnel. Elevator transport, excavation, and ventilation are not implemented; current map-edge and unfinished-terrain behavior remains prototype geometry rather than a surface entrance.

Scope is one playable vertical level per base. Keep the current two-dimensional positions and routing; do not add level IDs, ceiling records, vertical adjacency, or multi-level scaffolding merely for future compatibility. Floor integrity remains meaningful on this level, with failure exposing unfinished ground rather than a lower map, falling behavior, or vertical hazard transfer. Floor penetration and a shared floor/ceiling slab between future levels remain possible extensions, not committed designs. Revisit their representation only when multi-level gameplay is in scope. The central elevator can serve an off-map arrival/departure boundary without modeling other base levels.

Current containment gameplay deliberately ignores floor material and penetration. `advanceExposure` damages only structure records (walls and open/closed doors), and `discoverSurfaceWork` considers only observed structures for automatic maintenance. Manual floor construction/replacement and low-level damage helpers remain intact, but no hazard forces floor upkeep. Do not infer sky/weather exposure from a breach or map edge.

Surface orders now carry an operation: replacement (the existing default), floor/wall/door installation, or removal. `setSurface` creates/removes one independent layer and updates topology plus door-policy ownership; `replaceSurface` still requires an existing layer. No placeholder surface is installed when an order is queued. New structures require intact flooring, and floors cannot be removed under structures. Physical target occupancy, furniture/stock, cameras, storage, and pending construction are checked at acceptance and again before final fitting. Build/remove tiles reserve against later object, camera, storage, and annex placement.

The initial construction stockpile coordinate is only a preferred collection location, not a permanently walkable tile. Surface delivery routes from its actual carrier; annex placement checks the physical stack selected by supply reservation. Relocating stock and removing its old storage designation therefore permits remodeling the former store tile without invalidating saves or globally blocking construction.

Installations reuse collection, same-carrier delivery, and engineering fitting. Removal goes straight to engineering fitting with zero materials and no salvage. `surfaceOrderCost` centralizes accounting; schema 35 validates operations, phase/layer compatibility, physical cargo, and consumed material totals. Historical completed orders need not still have a surface at their target. Completed annexes retain commissioning history and room designation, but no longer require the original wall/floor layout to survive remodeling. Automatic maintenance remains replacement-only. Engineering uses the existing map PlacementRequest for manual build/remove orders; previews have no state effects.

`world.map.doorPolicies` records automatic, held-open, or held-closed settings by tile index. `canTraverse` permits planning through a closed automatic door while `isWalkable` remains physical truth. Every movement caller uses `stepWorld`: an adjacent pawn opens the door via `replaceSurface` and stays in place for that step. Subsequent passage uses the same cardinal route. `closeAutomaticDoors` runs before routine/work/resident movement, leaving automatic doors open while a pawn or ground-object footprint is on or cardinally adjacent to them. This deliberately avoids per-door timers and special hauling actions. Starting and commissioned doors receive automatic policies.

Policy changes are godlike administrative commands. Held closure refuses occupied pawn/object footprints; the legacy open/close API maps to held policies. Policies survive material failure/repair, while damaged structure topology is still computed by the material layer. Schema 35 validates policy keys, values, door ownership, and held-state consistency. Observed surfaces retain their last state; policies do not fabricate observations. Closed/open topology feeds the existing sight and exposure rules, so movement can change surveillance and exposure reach. Access credentials, power, actor-specific door permissions, collision queues, and operating-speed models are deferred; SCP-999 currently uses the same automatic passage as staff.

`SiteMap.surfaces` owns installed floor and structure records keyed by tile index. Absent records mean bare soil. Each installed layer has kind, material ID, and integrity; zero-integrity records remain as repair targets. `map.tiles` is a derived topology/rendering projection, checked against the layers on save load. All mutations use the shared material helpers or initialize both representations during construction. Destroying a wall does not replace the underlying floor. `closed-door` blocks movement and sight; ordinary `door` is open. The same rules apply to starting rooms and commissioned annexes.

`environment` owns exposure sources, surface orders, and facility maintenance policy. Sources specify position, radius, damage kind, dose, and optional `enabled` (absent means active for compatible saves). Cardinal flood traversal within the Manhattan-radius boundary includes blocking surfaces but does not pass through them. Newly opened space is reached on the next tick. Damage is batched into one map update, using each reached structure's resistance. The default source list is empty; the AN-001 enclosure and runtime scenario have been removed.

`setExposureSource`/`removeExposureSource` are explicit sandbox commands through the controller; preview validates without mutation. IDs avoid collisions, inputs are detached, and validation bounds radius/intensity/count. Existing sources can be disabled even after their tile becomes blocked. `exposure-view.ts` uses PlacementRequest and shows raw physical reach/barrier readings as administrative data. The Exposure overlay draws live reach only in World mode; it is not a recorded sensor map. Source creation does not imply physical production or research, and deletion does not undo damage. Save schema 35 validates enabled state and optional object attachment. The integrated replay covers observed failure, incident escalation, material reservation, actual delivery/fitting, recovery, and invariant floors.

Surface work reserves material from the same stock as annexes, collects at the store, keeps its carrier for delivery, then switches to engineering fitting at an adjacent accessible work face. Each order targets exactly one floor or structure; a blocked footprint delays assembly. Automatic maintenance uses current observations at <=55 integrity, deduplicates targets, and caps simultaneous orders at 16. Failed structures receive priority 95. Emergency preemption preserves work progress, clinical reservations, urgent-needs exclusions, and cargo ownership.

`observations.knownSurfaces` preserves recorded layers beside tile timestamps. Map perspective explicitly selects physical World state or Recorded observations. The main renderer passes raw snapshots to the map and Engineering before projecting other inspectors; changing perspective never modifies simulation knowledge. Site/Materials is a base-map choice. Condition, Rooms, Objects, Coverage, and Projects are independent overlays, with Floors/Structures as the inspected layer. Conditions draw outlines rather than replacing material fills. Manual physical orders may target simulation state, while automatic maintenance remains observation-gated. Schema 35 validates materials, physical objects, topology, orders, source bounds, cargo identity, and shared-stock conservation. Earlier development saves are incompatible.

The AN-001 trial, SCP-9620 progression, dedicated experiment allowances, fabricated budget, and claimed alarm hardware were culled. Library pages cannot grant research capabilities or fabricate evidence. Scenario capabilities still gate clinical behavior. General research progression, structural collapse, fire, power networks, fluids, and persistent contamination remain unimplemented. Working staff routines, clinical appointments, materials, physical construction, surveillance, and resident behavior are retained.

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
