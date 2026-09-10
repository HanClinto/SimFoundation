# Archived browser/product notes

This document preserves the mixed historical product specification at the
2026-09-10 wrapper transition. Its opening checkpoint described the early new
wrapper; most of the document describes the archived prototype or design goals.
Use the [current browser guide](../README.md) and replacement engine/catalog
guides for implemented behavior. Historical save versions, windows, utilities,
research exclusions and prototypes below are not active-browser promises.

SCPSiteManager is a cozy-ish, idle-ish facility management simulator about growing a small provisional SCP Foundation site into a capable research and containment complex. Satisfying routines and increasingly elaborate automation are punctuated by short periods of cascading panic.

The active browser is a fresh 98.css wrapper over the deterministic replacement
campaign, shared with the CLI. Start paused, choose a worker, inspect a target,
and issue physical queued work. Site folders, a spatial map, visible action
tiles, operations/history, playback and separate session/layout storage are
available. Travel/preparation shows actual crew readiness, physical manifests,
assembly, reusable departure and blocked arrivals. The Blackwood recovery,
home corroboration and Kestrel survey loop is playable through the GUI.
Advanced operation controls continue under [#106](https://github.com/HanClinto/SimFoundation/issues/106).

Contextual physical controls include supply portions, cargo handoffs, protective
packing/unpacking, equipment fitting/repair/refill, cooperative escort,
stabilization, blood/postoperative care, wound care and home admission. Select
the worker and target first; **Choose floor destination** selects the floor
beneath objects without issuing work. The inspection target stays distinct from
that destination. Care consumes actual packs and keeps patient/treatment records.

Danger and engineering are connected: equip a responder, capture a living
subject into serviced holding, study it, then spend physical maintenance supplies
on a slower-wearing restraint for awake care. Alternatively, actively record an
actual impact with the field kit; recover and analyze that device to enable
protective equipment. Evidence can survive the observer's death. Crafted items
retain the investigator, input sources and maker; a finding does not heal anyone.

Warnings, escapes, breaches and deaths stop running/finish after a complete tick.
The persistent alarm notice offers **Locate incident** and **Response desk**;
acknowledging it does not repair the situation. The response desk shows current
patients/bodies and the two finite reserve responders. Use Travel to inspect
their real incoming manifest. Subdual, restraints, intake, lockdown, recurring
service, direct watch and guarded relief all use normal shared commands.

The same physical inspector covers the eleven existing SCP adaptations, rather
than eleven separate applications. Browser scenarios exercise Blackwood evidence,
SCP-1370 display recovery, SCP-507's protected log and admission, SCP-2295's
independent organ work and postoperative care, SCP-3008 group evacuation,
SCP-294 source-backed samples, SCP-914's independent machine cycle, SCP-1295
remote supply/service, SCP-2006 personally trained hosts/programmes, and
SCP-173 watch/relief with supervised SCP-131 visits. Apparatus requests use
explicit physical source/input selectors. Their bounded adaptation limits
remain visible in each entity's Source and adaptation record.

The previous browser lives in `src/adapters/browser_legacy`, with its application
bindings in `src/application/legacy`; it is not bundled by the active entry.
Historical prototype features below are not claims about the replacement UI.
See the [replacement engine guide](../src/simulation/README.md) and
[campaign guide](../src/simulation/catalog/campaign/README.md) for current rules.

The first release is a browser game. Its simulation must remain deterministic, serializable, and independent of any browser or presentation technology so that other frontends and related SCP games can reuse appropriate parts later.

## Run the Browser

The initial executable shell requires Node 22 or newer.

```sh
cd src_web
nvm use
npm install
npm run dev
```

Run the complete local validation pipeline with `npm run check`. This formats-checks, type-checks, tests, and creates the production build. GitHub Actions deploys successful builds from `main` to [hanclinto.github.io/SimFoundation](https://hanclinto.github.io/SimFoundation/).

`npm run test:browser` exercises the real interface in an installed Google Chrome
using Playwright. Set `WEB_BASE_URL` to exercise a published build instead of
starting Vite. Browser saves use `simfoundation.web.session.v1`; desktop geometry
uses `simfoundation.web.desktop.v1`. Neither reads legacy saves. Save is explicit;
Export/Import share the CLI's current-version session JSON.

## Archived Prototype Notes (not the active replacement browser)

Portrait shortcuts, selected-target details and the queue now share one selection-and-orders area. Clicking a head selects and highlights that pawn as the command recipient. Clicking another target keeps that actor; another pawn offers explicit Control. Self-selection avoids repeating the portrait/name/activity, and other selections are labelled Target. Camera Follow remains independently pinned.

The portrait-header **X deselects the active pawn** and returns to inspection without stopping their work or clearing their queue. A separately inspected object stays selected. To cancel work, use the **X on the individual action tile** instead. Personal verbs are omitted when no pawn is active; Inspect remains available.

Current action tiles show their execution step, such as Walk to pantry, Carry meal to seat or Open door, beneath the parent verb. Expand Execution details for the current nested path and its source. These steps are not separate queue entries: cancelling or reordering still operates on the parent intention, and its elapsed clock does not reset when a step changes. Door-opening steps come from actual movement, not predictions. No save reset is required beyond the existing schema44 requirement.

**Direct person control (issue #23, M1-M4):** select a person using the map's portrait strip, then click a target for its 98.css context menu. The subject portrait heads the **Subject > Object > Verb** hierarchy; overlapping targets and the floor have icon-labelled branches, without a duplicate breadcrumb. A single target auto-expands; multiple targets wait for selection. Clicking elsewhere dismisses the popup without replacing it. Inspect remains outside the command hierarchy. Ground offers **Go Here** and **Hold Position**, people offer **Stabilize** and explicit **Select Person**, the adversary offers **Attack** and **Engage From Here**, and field cargo offers **Recover to Extraction**. Attack physically approaches a reachable firing position; Engage From Here stays put.

Commands default to **Add to Queue**, with up to eight player intentions per person. The map toolbar's **Orders** menu selects Add to Queue or **Do Now** for that window. The tray also shows the actual automatic action, such as Eat, Sleep, Relax or Work, with its **Need / Schedule / Autonomy / Job** source. Add to Queue waits behind that commitment; Do Now requests safe interruption. Player intentions start before new automatic discovery once the current owner finishes. The horizontal tray shows target icons with verb captions, X controls, **Retry** for failed starts and **Clear Pending**. Drag pending player tiles to reorder; Alt+Left/Right and Alt+Home/End also move them. The current action stays pinned and can be cancelled only at its owner's safe boundary, not dragged. Consumed meals, spent supplies, cargo reservations and job progress are preserved. After manual work drains, schedules and needs are reconsidered; explicit Hold/Attack/engagement retains drafting. Construction previews and double-click inspection are unchanged. Optional future modifiers and new random/finicky preferences are not yet domain choices. **Save schema 44 requires a fresh development site.**

Installed base furniture now offers **Eat** on meal seats, **Sleep** on beds, and **Relax** on break seats through the same contextual queue. The pawn physically reaches the selected furniture; Eat first collects one real meal from a reachable serving store. Eating lasts twelve steps, relaxation thirty seated steps, and sleep ends at the existing 95-rest target. Explicit routines run outside their usual schedule and show a Player badge. They reserve a seat only when starting, wait visibly if it is unavailable, and never switch to different furniture silently. Carried meals must reach the seat before cancellation; consumed food is not refunded. Completion advances the queue or restores prior autonomy. These commands require installed, serviceable base furniture and are unavailable during active encounter participation.

Current tiles use action-specific progress with a generic elapsed-time fallback. Eat, Sleep and Relax show progress and estimated remaining **in-game minutes** during the activity. Travel to a known destination shows actual remaining route tiles, not a straight-line distance or guaranteed arrival time; blocked routes say **No route**. Other current actions show time elapsed, including time blocked, while pending orders stay unmetered. Estimates and counters apply to automatic and player actions and freeze while paused. **Schema44 stores action start times across save/load and requires a fresh development site.**

The Camera Feed displays a 128x128 map, a compact starting facility, six personnel, and the functioning SCP-999 resident simulation. Pan with a pointer drag or arrow keys, zoom with the wheel or toolbar, and select objects or tiles to inspect them. Work requires workers to reach physical sites; blocked access prevents progress. Travel and work continue deterministically after save/load.

The current-action tray shows **Idle / Available** when no activity owns a person; Idle is not a queued task. **Waiting** retains blocked-routine reasons, and manual blocked intentions remain visible. Legacy tactical orders, action recovery, incapacitation and expedition assembly/travel/regrouping also appear without requiring a player queue. Mission transit can be inspected in the field portrait strip without inventing a map position. Cancellation follows the existing owner and safety checks; mission lifecycle controls remain in Expedition Operations. This coverage update keeps schema42 saves compatible.

Pawns show small activity/intent bubbles and outward-mood badges at normal map zoom. Hover a bubble for its meaning, click to select the pawn, or double-click for their record. Sleeping, meals, breaks, work, hauling, travel, social contact, and blocked routines have distinct icons. **Layers > Activity** toggles the bubbles; they also hide with Objects or at distant zoom. Recorded view shows no current bubbles for unseen pawns and does not reveal hidden needs or diagnoses.

Single-click map selection now opens a compact inline strip with the selected name and state. Staff show Rest and Satiety meters in World view only. **Move** starts the existing worker-driven placement preview for an object without requiring its inspector first; **Move stack** selects the whole stack, while the detailed inspector retains quantity and orientation controls. Doors expose their policy in World view, with occupied-doorway checks still enforced. **Inspect** opens the full record. The strip stays fixed-height so selection does not shift the map, and Recorded mode keeps movement and door edits read-only.

**Follow** pins the pawn or object selected when it is enabled, including objects being carried. Later target inspection or active-person selection does not retarget Follow. World view follows the physical position; Recorded view follows only its last observed position. Zoom preserves following, while panning, Home, locating another destination, placement, or switching perspectives releases the camera. The checkbox turns off when the followed item no longer has a map position, such as a case departing in transit.

Fresh sites demonstrate the material palette through installed room finishes: concrete laboratory/corridors/outer walls, ceramic medical surfaces and common-room flooring, steel storage walls and utility surfaces, and composite quarters/security finishes and containment walls. Doors remain steel. These are real material records, not a display overlay; both Floors and Structures views show the mix. Existing saves retain their previous finishes.

Engineering's **Order replacement** needs a selected tile with an installed surface on the selected layer. The inspector displays a reason when the action is unavailable: no selection, no surface, an already-pending replacement, or insufficient materials. **Choose tile** returns to the map from an empty inspector. Selecting a floor tile while inspecting Structures does not create a wall; switch to Floors to replace its finish.

SCP-999 physically approaches available personnel before providing Calm, interrupts contact if a person moves away or begins work, and returns to common-room roaming when no suitable contact is available.

The laboratory-annex prototype is deleted, including its state, executor, commissioning jobs, API, exclusions, renderer, register and dedicated tests. Engineering builds and removes individual surfaces; Objects and Supplies handles furniture. Schema 45 intentionally rejects all earlier saves. Development saves are disposable: no migration, legacy work completion or backward-compatibility layer is maintained. Startup replaces incompatible or invalid saved data with a fresh site and enables autosave when storage is available.

The static Research Archive and anomalous psychometrics branch are deleted, including capability, scheduling, request API, trait evidence/assessment records and disclosure flags. Schema 46 discards prior saves. Personnel inspectors and medical charts show current health, psychology, needs, work preferences, traits and effects directly; care reports do not gate access. SCP-999 has its own resident record rather than a misleading general Anomaly Registry. Research is not implemented as a tech tree; future study should be physical pawn work using a facility and a real anomaly/containment target. See [prototype cleanup](prototype-cleanup.md).

Surveillance requests device placement through the same map interaction. The map owns positioning and cancellation, not object-specific validation or resource rules. Work Orders reports physical locations and provides **Locate** links. The research-laboratory selector and scripted experiment task ladder have been removed.

**Work Orders > Priority** controls the next eligible assignment for an individual job. Automatic uses the system's original priority; Low, Normal, and High override it with 20, 50, and 75. The ledger shows effective priority and uses the scheduler's descending priority and stable ID ordering. Genuine emergencies (automatic priority 90 or above) cannot be demoted and remain ahead of all manual overrides. Completed work is read-only. Changing priority neither authorizes proposed work nor interrupts an active assignment, clinical appointment, or cargo carrier. Worker qualification, schedules, needs, reachability, and reservations still govern eligibility. The override persists while the same job progresses through collection, delivery, and fitting; separate jobs created by a project keep their own priorities. Select Automatic to remove the override without losing the original rule.

Engineering can build and remove individual floor, wall, and door tiles anywhere accessible using physical material inventory. Furniture and electrical equipment use shared physical hauling and installation. External procurement remains future work. Starting room categories are spatial designations, not fully operational systems. The physical-facility slice is tracked under [#15](https://github.com/HanClinto/SimFoundation/issues/15). Development save compatibility is intentionally not maintained between schema versions.

### Power and Lighting

**Power and Lighting** controls physical generators, underfloor cables, and lights. Fresh sites start with one 24-unit generator, six 2-unit lights, and three 3-unit cameras connected by a commissioned cable network: 21 units of demand. One spare generator, six spare lights, and 24 individual cable kits are available. **Place spare** queues pickup, carrying, and engineering installation; packed or carried equipment neither supplies nor consumes power. **Move / install** and **Pack in place** reuse the object workflow.

Installed intact electrical devices connect on the same tile or cardinally adjacent tiles. Cables can pass beneath furniture, storage, and doors without blocking them. A camera connects to one adjacent terminal, selected deterministically by ID, and never bridges two circuits. Disabled generators stop supplying; disabled lights stop consuming; disabled cables disconnect their segment. If demand exceeds supply, every consumer on that circuit loses service. Switch off loads or install additional supply to restore it. There is no simulated fuel, battery, breaker-reset task, or automatic backup logic yet.

**Layers > Lighting** shows powered illumination, blocked by walls and closed doors. Unlit areas retain a readable display baseline, not an invented emergency battery system. Staff sight retains its current range; camera operation requires power but is not additionally limited by illumination in this slice. **Layers > Power** exposes cable routes and service colors. The inspector names the reason for loss of service and reports circuit supply/demand. Recorded view uses remembered equipment and does not calculate live light or circuit state.

Existing corrosion and impact sources damage electrical equipment as steel-like components, including carried equipment but excluding items protected inside vessels. At zero condition the device stops conducting or operating. **Repair** reserves an eight-material service kit, then logistics delivers it and engineering restores the same device. Cancellation releases unused supplies only before pickup or after delivery; active delivery cannot be cancelled. A source left active can damage newly repaired equipment again. Repairs are explicitly ordered, not automatically discovered in this first utilities slice.

The map interleaves objects and pawns by depth, brings a same-tile selected object to the front, and fades nearby foreground walls around the displayed selection. The utilities slice is tracked under [#20](https://github.com/HanClinto/SimFoundation/issues/20).

## Design Pillars

### Expedition Checkpoint

**Expeditions** now provides an incident notice, a two/three-person manifest with equipment summaries and finite tactical loadouts, physical assembly, timed travel, a separate temporary depot map, field combat and cargo recovery, regrouping, and return. Site 828 keeps advancing while its dispatched personnel are away. Returned personnel retain their equipment, injuries and spent supplies; recovered archive/specimen objects transfer exactly once before the temporary map is removed. The specimen's real emission remains active after recovery. See the [expedition guide](expeditions.md) for the complete workflow and current limits, including no living captive transport or staff abandonment. **Schema 38 requires a fresh development save.**

### Tactical Response Checkpoint

The first opt-in 049-2 encounter is implemented. **Tactical Response** and selected staff's **Orders** button expose drafting, positional orders, engagement, and stabilization. The map's **Attack** interaction adds physical approach; inspector Engage remains stationary. Tactical range and action phases are visible on the map. Staff continue using real routes and doors; injuries, ammunition, recovery, and the encounter survive save/load. **Schema 41 requires a fresh development site.** See the [tactical response guide](tactical-response.md) for the two/three-responder workflow, withdrawal route, source attribution, and explicit sandbox limits.

### A living facility

Personnel autonomously select work from the player's priorities, schedules, zones, qualifications, and policies. The player designs spaces and systems rather than manually directing every routine action. Individual staff can be drafted for emergencies and tactical encounters.

The intended rhythm is routine, attachment, opportunity, strain, incident, and recovery, with substantial peaceful stretches earned through good management. Schedules express expectations rather than guaranteed compliance. Preferences, competing needs, deliberate refusals, and incapacity are distinct causes of deviation; emotional, psychotic, and physical breakdowns are not interchangeable personality flaws. The simulation should retain a causal explanation even when the player has only an incomplete report. These are design requirements, not claims about the current prototype's autonomy.

### Anomalous automation

Research begins as hands-on experimentation and develops into visible production and containment chains. Sensors, power, sample transport, decontamination, storage, and security can be automated. Better throughput introduces new failure modes, especially when anomalous equipment becomes part of ordinary infrastructure.

### Recoverable panic

Serious incidents can kill personnel, damage the site, create debt, change anomaly behavior, and leave lasting physical or psychological scars. Most failures should produce a difficult recovery story rather than immediately ending the run.

Routine human variability should normally be tolerated by staffing coverage, maintenance margins, and redundant systems. A single missed check should not usually trigger an unavoidable catastrophe. Failures should develop through consequential, potentially observable stages with opportunities to intervene; exceptional anomalous behavior may still surprise the player. Facility design and staff care should reduce risk without requiring perfect obedience or constant manual correction.

### Inspectable systems

Every meaningful pawn, room, machine, item, job, and anomaly can open in a movable 98.css inspector window. The interface should explain current behavior and contributing factors without requiring the player to consult an external wiki.

## Core Loop

1. Accept funding objectives, research requests, and optional expedition opportunities.
2. Expand rooms, utilities, logistics, security, and staff capabilities.
3. Set work priorities, schedules, access restrictions, and containment policies.
4. Run experiments that generate research, useful byproducts, and new uncertainties.
5. Convert funding and knowledge into safer or more productive automation.
6. Respond to equipment failures, psychological breaks, security events, and changes in anomalous behavior.
7. Repair the site, care for survivors, revise protocols, and continue growing.

Efficiency and safety should remain in tension. Running one more experiment before scheduled maintenance might complete a grant milestone, but it may also overload containment during an exhausted night shift.

## World Structure

The persistent regional site map should support approximately 100x100 or 128x128 isometric tiles. A new game initially occupies a compact area of roughly 30x30 tiles, leaving room for substantial expansion without requiring the full map to be simulated or visible at once.

The persistent map contains the facility, personnel, resident anomalies, stored equipment, construction, utilities, and long-term damage. Expeditions instantiate temporary maps for recovery, salvage, investigation, rescue, and eventually combat. Returning personnel bring their injuries, stress, equipment, discoveries, and captured anomalies back to the persistent site.

Temporary maps must use the same headless simulation rules as the base. They are not separate minigames, although their objective structure and tactical pacing may differ.

## Personnel

### Physical Objects and Supplies

**Objects and Supplies** lists installed furniture, packed spares, and supply stacks. Select an object on the map or in the inspector, choose its orientation (and a quantity for stacks), then **Move / install** to start the shared placement preview. Confirming queues physical pickup, same-carrier transport, and installation. **Pack in place** dismantles furniture into a reusable packed object; it does not delete it or generate materials. Cancellation is available before pickup. One spare bed, meal seat, and break seat are initially stored alongside the existing furniture.

Beds have a two-tile footprint; one tile is the interaction position and the remainder blocks walking. Installed, intact furniture supplies routine-use positions. A relocation waits for its current user to finish and prevents new reservations. Carried or packed furniture cannot restore needs. Destination conflicts and blocked paths leave inspectable work orders; assembly waits for occupants to clear.

Building materials and packaged meals are real counted stacks with ground/carrier locations and exclusive work reservations. Surface work and vessel fabrication reserve, pick up, deliver, and consume those objects. Material availability is derived from unreserved ground stacks, excluding supplies committed to hauling or another job. There is no saved material balance, fixed global 160-unit budget, preferred stockpile coordinate, or manual refund counter. Work considers stock locations near its actual destination; compatible batching remains limited to one location per request. Pantry replenishment transports meal stacks; individual pawns collect a portion and carry it to a seat before eating. Meal counters remain separately validated summaries. Schema 47 discards older saves without migration.

World view shows current objects and carried cargo; Recorded view retains observed object records. Objects remain serializable during transport. Save schema is now **41**, requiring a fresh development session. Vessel fabrication is available; general crafting, procurement, arbitrary nested containers, weight limits, and a universal equipment system remain deferred. Cameras retain their existing specialized device/kit workflow but now require a physical power connection.

### Portable Containment

Alarm Manager reports recorded vessel condition: a sealed case at 25% integrity or below raises Yellow; a recorded breached case raises Orange. These use the normal slowdown/pause profile. Readings remain observations, not remote telemetry from an unseen or dispatched package. Structural and vessel warnings are assessed together so resolving one does not clear the other; unrelated incidents of equal or higher severity are preserved. The alarm list links to vessel inspection and shows observation age.

Before dispatch, the vessel inspector and placement preview compare the chosen transit time against current case integrity and internal wear. A predicted breach is a warning, not a dispatch prohibition. Estimates assume unchanged emission and exclude worker pickup and blocked-deposit delays, both of which can consume additional case life. No save-schema change is needed for these derived warnings.

**Vessels and Transport** fabricates reusable one-object cases from concrete, steel, ceramic, or composite. A case costs four times its material's surface cost (8/16/12/24 units). Choose a clear interior fabrication tile; logistics collects and delivers real supplies, then an engineer fabricates the case. No materials or cases are spawned by completing UI steps.

Stage a packed individual object beside an open vessel using **Objects and Supplies**, then select it as cargo and schedule **Load cargo**. Loading, sealing, opening, and unloading require workers at the actual case. One packed non-stackable object fits; stacks, nested vessels, and mobile residents such as SCP-999 are excluded. An intact case can be opened, unloaded, and reused, retaining wear. Its contents keep their identity and attached sources and are not rendered as another object on the ground. Local movement carries the whole case through ordinary hauling.

An intact sealed case contains emissions without switching off its contents. Internal wear per minute is `dose * (10 - resistance) / 100`, summed across active contained sources; case material selects corrosion or impact resistance. This initial durability is ten times the equivalent wall's exposure durability, intended to allow useful transport time. At corrosion intensity 4, a fresh ceramic case lasts about 2,500 game minutes; a steel case lasts about 500. The inspector estimates remaining life at current emission. Opening releases exposure; reaching zero integrity breaches the case and releases exposure on the map in that tick. There is no gradual leakage. Floors and ceilings remain outside the hazard model.

**Repair empty case** restores a worn or breached case using delivered materials and engineering work. Open and unload it first; cases in use or in transport cannot be repaired. The initial repair cost is half the corresponding new-case cost: 4 concrete, 8 steel, 6 ceramic, or 12 composite material units, regardless of damage severity. The case stays at its current integrity until work completes, then returns to 100% with the same identity/material and an open seal. Repair does not suppress, delete, or repackage the unloaded source. Unused repair stock can be released by cancelling before pickup or after delivery; a carrier must finish physical delivery first. Recorded breach warnings clear once restored condition is observed.

Choose **Helicopter** or **Truck**, set 30-1,440 transit minutes, and **Choose deposit tile** to schedule a sealed package. A worker first hands over the case, then it leaves the local map for the timed service. The reserved deposit tile represents abstract unloading and transfer underground, not a vehicle flying through the bunker. Both service labels currently use the same rules and have no fee, fuel, availability, route, or vehicle simulation. They reposition an existing case, not import free cargo or simulate another base. Transit continues case wear; an occupied arrival tile delays deposition and wear continues. A breached shipment still arrives with its original contents, and escaping exposure resumes after arrival. The timer does not pause for a breach; off-map damage to vehicles or personnel is not modeled.

Cancel fabrication or handling before pickup/dispatch or during on-site assembly. Carried fabrication supplies must finish delivery before cancellation; dispatched transport cannot be cancelled. Fabrication and arrival footprints reserve against competing construction, storage, and object placement. The vessel inspector uses administrative World state; ordinary map observations do not reveal contents through a sealed case. A case's escaping emission, not the mere presence of a source inside it, determines its storage emission filter.

### Storage and Hauling

The **Emission filter** admits any object, non-emitting objects only, or emitting objects only, in addition to accepted types. It applies to automatic stocking, manual moves, and final placement. An emitting-only area with a stocking target can request packed emitters through ordinary hauling; it does not teleport them, pack installed furniture automatically, or provide physical containment. Emission state comes from enabled, positive-intensity sources attached to that object, not nearby environmental exposure or hidden health information.

If an object begins emitting after storage, the inspector reports that it no longer matches the filter. Its old area's stocking target no longer prevents an accepting area from pulling it. If it changes state during transport, the carrier keeps the reserved cargo and placement waits until the object's emission state is accepted again. Existing stock remains physical; there is no forced eviction without a destination policy. Capacity and targets still count total physical units, including mismatched stock. Policies are administrative and use simulation state; they do not claim worker discovery of an unknown anomaly. Existing areas default to accepting either emission state.

**Storage and Hauling** manages rectangular floor designations up to 8x8 tiles. Each area has accepted object types, capacity in item units, a total stocking target, and an enabled policy. Areas cannot overlap or cover installed furniture. Packed furniture counts as one unit; supply quantities count individually. Initial designations cover the dining pantry, material store, and meal reserve.

Set a target above current stock to let staff queue ordinary pickup/carry/placement jobs. Incoming quantities reserve capacity, and hauling protects source-area targets and existing item reservations. Deliveries merge compatible unreserved stacks at the same tile without changing condition. Work moves at most twelve supply units or one packed object per trip; no stock is created. The inspector reports incoming quantities, workers, occupied footprints, unreachable routes, full storage, and unavailable source stock. Enable **Layers > Storage** for area boundaries; area names remain in map selection and the inspector without crowding room labels or pawn bubbles.

**Diners collect meals here** makes unreserved meals in an enabled area available for dining. **Relocate area** moves only its designation, not its contents: workers stock the new footprint under its policy, and diners collect there. The old meal-specific hauling state machine and room-coordinate pantry assumption have been removed. Designation changes/removal are rejected while transfers or reserved stock are committed to the area. Removing a designation leaves its objects on the ground. Targets are total units across accepted types, not separate quotas per type; weights, shelves, containers, automatic excess-stock evacuation, and external procurement remain deferred.

### Daily Routines Prototype

The Day Planner edits each pawn's 24 hourly work, free-time, and sleep blocks, with day-shift, night-shift, and rest-day presets. Staff autonomously seek a meal when hungry, a bed when tired, and a break when stressed. Beds, meal seats, and break seats are physically located and exclusively reserved; travel alone does not restore needs. Ordinary schedule changes let current jobs finish, while critical hunger or exhaustion can release work reservations without erasing progress.

Satisfied staff also seek occasional recreation during free time. Opportunities are staggered across the roster every two game hours; an available break seat supports a 30-minute visit after actual travel. Hunger, tiredness, or the next work/sleep block can interrupt a low-stress break. Staff carrying cargo skip optional recreation, and unavailable furniture can delay a visit until a later opportunity. This reuses ordinary breaks, not a new need, social relationship system, or source of supplies.

The pantry starts with 36 meals and the meal reserve with 72 more. The default dining policy targets 24 meals with capacity 36; general storage hauling replenishes deficits. Day Planner reports meals available in serving areas, other stock (including transport), and issued portions. No food is created by restocking. Shortages and unreachable or occupied service stations are visible in Day Planner. External procurement, cooking, treatment, and richer refusal behavior remain future systems.

### Surveillance Prototype

Surveillance lists installed cameras, their enabled state, and remaining installation kits. **Place camera** opens a single-tile preview in Camera Feed. Orders can be queued without current coverage, including unsurveyed locations; an engineer must reach the site, verify an interior floor, and complete installation before the camera observes anything. Known unsuitable terrain is rejected from recorded survey data; unknown or changed unsuitable terrain leaves an inspectable blocked work order. Awake personnel and active cameras provide local sight through open doors but not walls. Sleeping personnel do not observe.

The **Layers** panel separates World/Recorded perspective, Site/Materials base maps, and Floors/Structures. Condition, Rooms, Objects, Coverage, and Projects are independent overlay checkboxes. Condition outlines and values compose over material colors. Projects only controls project visibility; it never enters placement mode. Double-click a tile or object to inspect it. World-mode Engineering reads physical truth; Recorded-mode Engineering reads the last survey. Personnel assessments remain documentary records in either map perspective.

The map shows bright live coverage, dim remembered terrain, unknown areas beyond the initial survey, and labeled last-sighting markers. Unseen anomalies continue simulating, but their registry and map information remain at the last recorded observation. Camera placement and range are provisional abstractions; power, communications failures, and directional lenses remain future work.

### Doors and Passage

**Layers > Spaces** shows physical connectivity independently of room names. Walls and closed doors divide spaces; opening doors or breaching walls joins them. Engineering reports whether a tile's connected space is enclosed, reaches the map edge, or has an unknown recorded boundary, plus its connected and floored tile counts. Floor tiles in enclosed spaces receive distinct tints, edge-connected spaces use a rust-colored tint, and uncertain recorded spaces use gray. Furniture blocks walking where appropriate but does not divide spaces or stop exposure from reaching barriers beyond it.

Spaces are derived, not saved room objects. Recorded mode uses only recorded topology and does not reveal an unseen breach. The facility is a deep underground bunker: overhead cover is assumed, with no roof construction, roof maintenance, or outdoor weather exposure. Walls and doors determine horizontal connectivity, not whether a space has a roof. Airtightness, ventilation, and room-function effects are not modeled yet.

The intended surface-access point is a large central elevator for incoming cargo and agents departing or returning from missions. This is the facility direction, not an implemented elevator transport system. Existing map-edge connectivity and unfinished terrain remain prototype abstractions, not access to the open sky.

For now, each base has one playable vertical level, and containment gameplay is exclusively horizontal. Floors retain their data and editing tools, but active exposure and automatic maintenance ignore them: no floor-material optimization, floor penetration, or vertical hazard transfer is required. Low-level floor damage remains available for future work and fixtures; a failed floor currently exposes unfinished ground on the same map. Ceilings are implicit. Multi-level bases, falls, vertical pathfinding, and a shared floor/ceiling slab are deferred. The central elevator is the planned connection to off-map arrivals and departures, not a requirement to simulate additional base levels.

Engineering exposes **Automatic**, **Held open**, and **Held closed** door policies. Starting doors are automatic: routes may pass through them, but a pawn at a closed doorway spends one movement step opening it before crossing. Work, clinical appointments, hauling, routines, and SCP-999 all use the same passage rule. Opening staff show an action bubble. Automatic doors close at the start of a tick once no pawn or ground object is on or cardinally adjacent to the doorway.

Held-closed doors block route planning; a delivery can stall with its stock still reserved or carried, then resume when access is restored. Closed doors also block sight and the existing exposure propagation; an opening changes both without separate containment scripting. Material failure leaves a passable breach, and replacement restores the door with its retained policy. Closure commands refuse a doorway occupied by a pawn or object. Policies are administrative settings; Recorded physical state still reflects the last observation.

Held settings are immediate godlike commands, not remote-control hardware or worker jobs. There are no access badges, powered locks, door speeds, queues, or hard pawn collision in this checkpoint. Automatic doors do not distinguish personnel from SCP-999 and are not secure barriers against it.

### Surface Repair

Engineering's **Build and remove** selector offers floor, wall, and door construction plus removal of either layer. Choose a material in Surface work, then **Choose work tile** to preview and confirm one tile. Floors can be laid on soil; new structures require an intact floor. Existing layers must be removed first when changing their kind, or use **Order replacement** to preserve the kind and change its material. Workers collect physical supplies, carry them to an adjacent work face, and fit the new surface. New doors are automatic.

Removal requires an engineer at an adjacent work face and gives no salvage refund. Remove structures before their floor; removing a wall leaves the floor intact. People, furniture, stock, cameras, storage designations, and conflicting pending construction protect their footprints. Final fitting rechecks the target and waits for late obstructions without consuming supplies. A blocked route keeps the order inspectable in Work Orders; reopening access allows work to resume.

**Cancel surface work** stops an active order on the selected tile/layer. Before pickup or during fitting, unused materials are released on the ground and any assigned worker is freed. During transport, **Cancel after delivery** keeps the carrier and supplies reserved until the delivery is physically set down, then releases the stock and skips fitting. A blocked route still needs to be reopened. Cancelled orders stop reserving their target tiles and cannot refund twice. Completed work cannot be cancelled, and removal gives no salvage. Automatic maintenance may discover the same damaged surface again while its policy remains enabled.

This is single-tile construction, not an instant brush or a room generator. Room names/designations are unchanged by new walls. No drag painting, demolition salvage, or structural support simulation is included. Cancel the placement preview before confirmation to avoid queuing work at all. Save schema 35 requires a fresh development session.

Every installed floor, wall, and door has its own material and integrity. Soil is the base ground; floors and structures are independent layers. Failed walls cease blocking movement and sight but leave the floor beneath them intact. Failed flooring exposes soil. Starting rooms and surface work use the same shared material catalog: concrete, steel, ceramic, and composite.

Engineering can order replacement of either installed layer using the shared construction stock. Materials are collected at the store, delivered by the same carrier, and fitted by an engineer. Rebuilding waits for occupied structure footprints to clear. Optional facility maintenance queues wall/door work for currently observed condition at 55% or below, preserving the existing material; it ignores floors. Failed structures receive emergency priority; appointments, urgent needs, and cargo deliveries remain protected from preemption. Known doors can be opened or closed in Engineering; closing cannot trap an occupant.

### Exposure Sandbox

Active escaping sources now show animated corrosion motes or impact sparks in World view. **Layers > Effects** controls these cosmetic particles independently of the precise Exposure footprint overlay. Effects stay within reachable source tiles, disappear for disabled or contained sources, and follow moving emitters. Pausing freezes their cosmetic clock; reduced-motion settings use a static pattern. Recorded mode does not reveal live effects. Particle animation never advances simulation state, creates damage, or enters saves.

**Exposure Sources** provides explicit godlike sandbox controls: create or relocate a source through the shared map preview, choose corrosion or impact, set intensity per game minute and radius, and enable/disable or remove it. The default site has no sources. These are editable environmental emitters, not acquired anomalies, research unlocks, sensor readings, or worker-operated suppression equipment. Source controls and live affected-barrier readings are administrative even when the map is in Recorded perspective.

**Layers > Exposure** shows the live propagation footprint in World perspective only. Propagation is cardinal inside the source's Manhattan-radius boundary; it includes the first blocking walls/closed doors but cannot pass through them. An open door or failed barrier changes the reachable region. Each tick damages reached structures according to corrosion/impact resistance; floors, furniture, and personnel do not take exposure damage in this checkpoint. Disabled sources contribute no reach or damage. Multiple active sources can overlap; disabling/removing one leaves existing damage intact. Source settings are capped at 32 sources, radius 16, and intensity 1000.

For a small containment exercise, place a source beside a wall, inspect its material/condition, watch the breach and expanded reach, then stop emission and let normal maintenance restore the barrier with physical supplies. Door policies, worker travel, observation, finite stock, and emergency priorities all apply without a special scenario script. Persistent residue, health effects, diffusion, and automatic suppression remain future systems. The AN-001 scenario, bespoke enclosure, and dedicated window remain retired.

**Attachment** can bind a source to an individual furniture or packed-object identity. Choose the object and **Bind source**, then **Open object** to issue an ordinary move through Objects and Supplies. Exposure follows its ground position or carrier throughout transport, including while opening doors. Packing, installation, and cancelling a move preserve the attachment and do not suppress emission. Active emitting cargo has a World-mode action cue, and the object record lists its sources. Recorded map markers use the host's observations, not its unseen live position.

Set Attachment back to **Fixed map position** and apply to detach at the object's current location. Supply stacks are excluded until split/merge behavior for effects is defined; no extra inventory or named anomaly is spawned by binding. Multiple source effects may bind to one object. These remain sandbox-authored properties, with no worker suppression or health effects. Save schema 35 records host identity and requires a fresh development session.

The scripted AN-001 and SCP-9620 workflows, instant **Complete Research** shortcut, fabricated budget figures, and unsupported alarm-hardware claims have been removed. Physical electrical power has since been implemented. The library is a documentary view. Anomalous screening remains unavailable in the default scenario until a real research system exists. Save schema is now 38; earlier development saves require a fresh session.

### Occupational Health Prototype

Open Occupational Health from the Site 828 facility folder to assign medical duty and choose recurring intervals for physical examinations, mood screeners and psychiatric evaluations. Routine reviews are off by default. These are appointments and historical reports, not information-unlock requirements; current personnel state is directly visible for simulation development.

The assignment table includes all personnel and sorts by recorded Medical Skill or current job availability. A procedure selector explains disqualifications using the same requirement definitions as job execution. Assignment is not qualification: untrained staff can administer a slower, lower-confidence mood screener; physical examinations require Medical 3, psychiatric evaluation Medical 5, and anomalous surveys Medical 6. These thresholds are provisional balancing values. Current availability reflects active work and patient reservations, not a prediction of future shifts or hidden capability.

Manual examination and evaluation buttons create referrals, not instant assessments. An assessor and patient travel to the medical bay; reports appear only after work completes. Mood screeners provide broad estimates without sanity scores or psychiatric contributors. Deeper psychiatric assessments retain narrower estimates and supporting contributors. At least two appropriately qualified staff are needed to evaluate the medical staff themselves. Examinations reveal findings but do not treat injuries.

Personnel are general-purpose pawns with backgrounds, qualifications, preferences, and trainable skills. Scientist, engineer, custodian, medic, security officer, and similar labels describe current duties and certifications rather than immutable character classes.

The pawn rules architecture is described in the [Personnel Model](personnel-model.md): identity, Traits, preference Biases, usage-based Skills, Effects, derived Health and equipment. Assessment-fog proposals are deferred. The current priority is visible, tunable simulation behavior rather than concealed information.

Each pawn has:

- Identity, biography, background, and traits
- Skills, qualifications, and security clearance
- Work priorities, schedule, permitted zones, and current job
- Physical attributes, health, injuries, and inventory
- Equipment slots and a layered visual paper doll
- Needs, stress, fear, mood, and derived sanity
- Relationships, memories, and temporary or persistent effects

### Needs and psychological state

Core personal needs change over time and initially include satiety and rest. Health is modeled separately through injuries and conditions. Recreation, comfort, and social contact are activities and environmental experiences that relieve or create stress rather than additional bars that decay in parallel.

Stress is sustained psychological load caused by overwork, isolation, poor conditions, moral injury, and accumulated incidents. Fear is an immediate response to perceived danger. Sanity is a derived measure of how coherently a pawn currently interprets reality and regulates their behavior.

Sanity should not be a simple average of stress and fear. A useful initial model is:

- A pawn has a relatively stable mental resilience capacity.
- Stress reduces the capacity available to absorb shocks.
- Fear, anomalous exposure, sleep loss, and certain memories apply acute pressure.
- Traits, relationships, treatment, restorative activities, and positive anomalous effects provide modifiers.
- Derived sanity bands influence perception, job reliability, and the likelihood or type of a mental break.

This keeps the important concepts legible: a veteran can be terrified but sane, while an apparently calm researcher can gradually become obsessed or detached from reality. The UI should show the major contributors rather than only a mysterious number.

Temporary effects include Calm, Panicked, Inspired, Obsessed, Dissociated, Possessed, Greedy, and similar conditions. SCP-999 can reduce stress, soften frightening memories, and provide a temporary Calm effect without functioning as a universal cure.

## Time and Incident Response

The simulation advances through deterministic fixed ticks. The browser provides Pause, 1x, 2x, 4x, and potentially 8x speed. Pausing must always be available, including during combat and containment incidents.

The site has one current incident response level. Players can configure which event categories automatically reduce speed or pause.

| Level  | Meaning                                 | Default time response | Examples                                                                  |
| ------ | --------------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| Green  | Routine positive or informational event | No change             | Skill increase, completed construction, routine milestone                 |
| Yellow | Attention requested                     | Drop to 1x            | Worn component, low stock, new anomaly discovery, minor illness           |
| Orange | Active operational threat               | Pause                 | Power shortage, security fault, mental break, dangerous experiment result |
| Red    | Immediate site emergency                | Pause                 | Containment breach, lethal threat, fire, SCP state transformation         |

Events should be promoted by consequences and context. A worn backup generator may be Yellow during normal operation and Orange when it is the only source powering containment.

## Jobs and Player Control

Routine play is priority management. The player places blueprints and work orders, configures job priorities, sets schedules and zones, and approves protocols. A deterministic job market inside the simulation assigns eligible work to autonomous pawns based on priority, reachability, qualifications, needs, risk, and current commitments.

Keep three layers distinct: investigations and optional opportunities express goals; schedules, facilities, and policies express operational expectations; autonomous jobs execute the supporting work. Routine hauling, cleaning, maintenance, and preparation should arise from those expectations rather than each requiring approval. Explicit authorization belongs to meaningful commitments such as unusual requests, expensive projects, and consequential experiment protocols. The current special-task Work Orders system and its inspection UI are provisional, not the settled design for all facility work.

Direct control is reserved for drafting. Drafted pawns can receive explicit move, interact, use ability, attack, arrest, rescue, and retreat orders. Drafting suspends ordinary job selection but does not bypass movement, equipment, skill, or action costs.

## Expeditions and Tactical Encounters

Expeditions are planned from the base using a team, loadout, transport capacity, supplies, and mission objective. Initial expeditions may focus on salvage and anomaly recovery without combat. Tactical combat is a stretch objective, not a prerequisite for the first playable release.

When combat is introduced, it should be pause-based real-time over the same deterministic action system, with RimWorld-like drafting and freely available pause. The design should favor readable positioning, cover, equipment choices, anomaly interactions, and withdrawal over twitch execution. Recontainment should often depend on restoring infrastructure, isolating spaces, escorting specialists, or following anomaly-specific procedures rather than damage output alone. MTF responders provide emergency capabilities without replacing the role of facility design.

Possible expedition rewards include:

- Conventional supplies and specialist equipment
- Recruits, contacts, and intelligence
- Anomalous materials and item affixes
- Containment candidates and sidequest discoveries
- Information that unlocks branches of the SCP-9620 investigation

## Anomalies

### Original Containment Study

AN-001 is a deferred scenario, not currently spawned or exposed through a dedicated inspector. See [the authored catalog](anomaly-catalog.md) for its retained design notes. Material selection, condition, and replacement work belong to general Engineering.

### SCP-9620

SCP-9620 is the dangerous, deliberately undefined center of the campaign. Its behavior, nature, and relationship to side anomalies should be discovered through play. Research choices can reveal different aspects or states across runs. Unexpected state transformations are Red incidents and may permanently alter rooms, personnel, equipment, or future research options.

The design should preserve ambiguity. Internal content uses authored possibilities and deterministic conditions, but the UI should not expose a single canonical answer at the beginning.

SCP-9620 supplies the central exploratory investigation. Other anomalies and unusual requests introduce optional investigations whose discoveries may provide useful techniques, equipment, or new interpretations, but need not be mandatory steps or keys to the main mystery. Research should accumulate observations, competing hypotheses, and unresolved contradictions, not merely complete a linear quest checklist.

### SCP-999

SCP-999 is a friendly resident anomaly that wanders through permitted areas, seeks interaction, and improves nearby morale. Contact can reduce stress and apply Calm. Caring for SCP-999 creates low-stakes logistics and offers a visible contrast with SCP-9620.

SCP-999 remains an entity with needs, preferences, access rules, and inspectable behavior rather than a passive room modifier.

The prototype now uses local visible encounters rather than site-wide stress ranking. SCP-999 can greet content personnel and gives priority to outward signs of distress among visible candidates; it loses a target when sight is lost. Contact starts a mild calming effect immediately and strengthens the benefit through sustained contact. Sleeping and eating personnel are excluded. The six-tile perception limit, exact effect strengths, and cooldown are gameplay abstractions, not claimed canonical sensing abilities or physiology. See the [source archive and adaptation notes](references/scp-999/adaptation.md) for supported behavior and remaining gaps such as feeding and nighttime enclosure routines.

## Items, Inventory, and Equipment

Pawns use a fixed-slot inventory without multi-cell item shapes. Equipment has explicit paper-doll slots such as head, body, hands, feet, primary hand, off hand, accessory, and utility. The exact slot list can be reduced during implementation, but equipped items must affect both statistics and appearance.

Items can have authored properties and optional Diablo-style affixes. Anomalous affixes should invite creative tradeoffs rather than provide only larger numbers. Examples include a vest that reduces incoming force but stores it as heat, gloves that accelerate repairs while transferring equipment wear to the user, or a weapon that becomes more accurate near frightened allies.

Affixes must be data-defined, deterministic, inspectable, and composable with ordinary equipment. Imbuing and deliberate anomalous item creation are later progression systems; the first release only needs the model and a small number of authored examples.

## Presentation and Art Pipeline

The web game targets desktop browsers. Mobile and touch-first layouts are explicitly outside the initial support scope because dense modeless inspectors, precise map controls, and the 98.css desktop metaphor require persistent screen space. Narrow desktop windows should avoid corrupt overlap, but the application may preserve a minimum virtual desktop instead of reflowing into a mobile interface.

The teal workspace represents the overall simulation desktop. Facilities, temporary expedition maps, and future sites appear as desktop icons and open as separate modeless inspector windows. The default Site 828 window is the facility inspector, not the application itself. It owns that facility's map and operational details and can be moved, resized, closed, and reopened independently.

Global concerns such as pause, simulation speed, save/load, and later scenario management belong on the desktop or in specialized utility windows. Simulation Control uses a compact media-player-style window. Developer facts such as raw tick count and random seed belong in a separate System Monitor and must not leak into ordinary in-world inspectors.

Windows can remain open while the simulation runs. Selecting or double-clicking objects opens inspectors; alerts and object references can focus the relevant map location. Window position, dimensions, open state, and stacking are browser presentation state and should be restored across reloads without entering the authoritative simulation save.

The detailed visual language, historical touchstones, window hierarchy, and anti-goals are recorded in [docs/lookbook.md](lookbook.md).

Runtime artwork should be original SVG released with the project under compatible CC BY-SA terms. SVGs act as editable templates rather than code-generated final art. Assets should use stable IDs and clearly named groups so contributors can replace generated or provisional geometry with hand-drawn work without changing game data.

Character templates should separate:

- Base body and shadow
- Skin regions with a curated, sensible palette
- Hair and facial features
- Clothing layers by equipment slot
- Held items and carried equipment
- Directional poses and action anchors

The renderer can tint designated regions and compose equipment layers procedurally. Asset metadata should define joint hierarchy, pivots, anchors, semantic group tags, draw order, supported directions and poses, palette channels, and equipment compatibility. Animation is renderer-controlled from authored pose groups and joint transforms rather than scripts or timelines embedded in SVG files. Appearance is presentation state derived from the pawn and equipment snapshot; SVG elements never own gameplay statistics.

Environment and equipment templates should similarly group structural surfaces, tint regions, lights, damage overlays, and interaction anchors. The pipeline should permit SVG replacement or refinement without changing entity IDs or simulation rules.

## Technical Architecture

SCPSiteManager follows the dependency direction proven in VibeFarmer:

```text
browser adapter -> application controller -> headless simulation
```

The headless simulation owns authoritative serializable state, deterministic ticks, maps, entities, pathfinding, pawn AI, the job market, utilities, construction, experiments, incidents, tactical actions, seeded randomness, and domain events.

The application controller is the only public command boundary for frontends. It exposes snapshots, command dispatch, ticking, subscriptions, and serialization without exposing mutable simulation internals.

The browser adapter owns 98.css windows, Canvas rendering, input translation, audio, local persistence, and wall-clock tick scheduling. It may interpolate animation but never decide gameplay outcomes. The simulation imports no DOM, Canvas, storage, timer, or presentation modules.

Detailed module boundaries and data contracts are defined in [docs/architecture.md](architecture.md).

### Deployment cache policy

Vite emits content-hashed JavaScript and CSS filenames, so source assets are immutable across deployments and do not need hand-authored query parameters. Each production build also emits `version.json` containing the first 12 characters of `GITHUB_SHA` or the current local commit.

The browser requests that manifest with `cache: no-store` and a timestamp query. If its version differs from the version compiled into the running application, the browser navigates to the same page with `?v=<version>`. This creates a fresh HTML cache key; the refreshed HTML then points to Vite's new content-hashed assets. Development mode skips the deployment check.

`npm run build` finishes by verifying that the manifest exists, its version is embedded in the compiled application, and `index.html` references hashed JavaScript and CSS. This is the Vite equivalent of VibeFarmer's module-query cache busting without rewriting an already hashed module graph.

## First Playable Definition of Done

The first vertical slice is complete when a player can:

- Start with approximately six personnel in a compact facility on a larger expandable map
- Build and furnish an expanded laboratory and its required utility connections
- Configure autonomous hauling, construction, cleaning, maintenance, research, medical, and security work
- Inspect every pawn, anomaly, room, item, machine, and active job through 98.css windows
- Manage satiety, rest, restorative activities, stress, fear, injury, mood, and derived sanity
- Pause and select simulation speeds, with configurable color-coded alert responses
- Inspect and repair ordinary surfaces through the shared simulation; scripted campaign progression is deferred
- House SCP-999 as an autonomous friendly anomaly with visible social and mood effects
- Equip pawns through a fixed-slot inventory and visual paper doll
- See skin tint, clothing, held items, and selected equipment reflected by layered SVG character templates
- Find or receive at least one inspectable piece of affixed anomalous equipment
- Plan and launch one non-combat expedition to a temporary map, recover a resource or item, and return
- Repair damage and stabilize the facility after the incident
- Save, reload, and continue the same deterministic site state

Combat, anomaly capture, deep affix generation, and multiple expedition types are planned extensions unless they become inexpensive consequences of the initial systems.

## Scope Tiers

Each development category should track three tiers:

- **Minimum:** Required for the first playable definition of done
- **Stretch:** A natural extension after the minimum is stable
- **Blue sky:** A direction worth preserving architecturally but not designing in detail yet

GitHub issues are the operational roadmap. [docs/roadmap.md](roadmap.md) records the category boundaries and links to their tracking issues. Issues should state their tier, dependencies, acceptance criteria, and simulation/frontend ownership. Architecture decisions that affect multiple categories should be recorded in versioned documentation rather than left only in issue discussion.

## Licensing

This project deliberately uses the SCP Foundation setting and must follow the SCP community's attribution and CC BY-SA requirements. New runtime artwork should be original and released under compatible terms. Before a public release, replace or supplement the repository's current MIT license with the appropriate licensing structure and add complete SCP attribution, source links, and third-party notices.

SCP-9620 is intentionally used as an undefined designation for this game's original central anomaly. Its availability should still be rechecked before publication because the wiki can assign previously unused numbers.
