# SCPSiteManager

SCPSiteManager is a cozy-ish, idle-ish facility management simulator about growing a small provisional SCP Foundation site into a capable research and containment complex. Satisfying routines and increasingly elaborate automation are punctuated by short periods of cascading panic.

The current build prioritizes a broad, inspectable simulation foundation: materials, physical work, movement, needs, schedules, records, and maintenance. The default site starts without staged research objectives or automatic exposure scenarios. World perspective exposes physical simulation state; Recorded perspective preserves the sensor-limited view. Campaign investigations, including the previously proposed SCP-9620 storyline, are deferred design ideas rather than active gameplay.

The first release is a browser game. Its simulation must remain deterministic, serializable, and independent of any browser or presentation technology so that other frontends and related SCP games can reuse appropriate parts later.

## Run the Current Shell

The initial executable shell requires Node 22 or newer.

```sh
cd src_web
nvm use
npm install
npm run dev
```

Run the complete local validation pipeline with `npm run check`. This formats-checks, type-checks, tests, and creates the production build. GitHub Actions deploys successful builds from `main` to [hanclinto.github.io/SimFoundation](https://hanclinto.github.io/SimFoundation/).

### Current Physical-Site Checkpoint

The Camera Feed displays a 128x128 map, a compact starting facility, six personnel, and the functioning SCP-999 resident simulation. Pan with a pointer drag or arrow keys, zoom with the wheel or toolbar, and select objects or tiles to inspect them. Work requires workers to reach physical sites; blocked access prevents progress. Travel and work continue deterministically after save/load.

Pawns show small activity/intent bubbles and outward-mood badges at normal map zoom. Hover a bubble for its meaning, click to select the pawn, or double-click for their record. Sleeping, meals, breaks, work, hauling, travel, social contact, and blocked routines have distinct icons. **Layers > Activity** toggles the bubbles; they also hide with Objects or at distant zoom. Recorded view shows no current bubbles for unseen pawns and does not reveal hidden needs or diagnoses.

Fresh sites demonstrate the material palette through installed room finishes: concrete laboratory/corridors/outer walls, ceramic medical surfaces and common-room flooring, steel storage walls and utility surfaces, and composite quarters/security finishes and containment walls. Doors remain steel. These are real material records, not a display overlay; both Floors and Structures views show the mix. Existing saves retain their previous finishes.

Engineering's **Order replacement** needs a selected tile with an installed surface on the selected layer. The inspector displays a reason when the action is unavailable: no selection, no surface, an already-pending replacement, or insufficient materials. **Choose tile** returns to the map from an empty inspector. Selecting a floor tile while inspecting Structures does not create a wall; switch to Floors to replace its finish.

SCP-999 physically approaches available personnel before providing Calm, interrupts contact if a person moves away or begins work, and returns to common-room roaming when no suitable contact is available.

The **Construction** window owns the annex register. **Plan annex** requests a 9x7 map footprint with its entrance marked. A temporary **Confirm / Cancel** bar appears only during placement; confirmation reserves 40 material units from an initial stock of 160. Logistics collects and delivers the kit, engineering assembles the building, and commissioning takes place inside the new room. Construction locates work and permits cancellation before materials leave storage. Click to pin a preview, use arrow keys to reposition, Enter to confirm, or Escape to cancel. Changing map layers does not affect the request.

Surveillance requests device placement through the same map interaction. The map owns positioning and cancellation, not object-specific validation or resource rules. Work Orders reports physical locations and provides **Locate** links. The research-laboratory selector and scripted experiment task ladder have been removed.

Construction currently provides one fixed annex template and uses physical counted material stacks. Furniture placement and stock relocation use the shared Objects and Supplies system; arbitrary wall painting, external procurement, and a power network remain future work. Starting room categories are spatial designations, not fully operational systems. The physical-facility slice is tracked under [#15](https://github.com/HanClinto/SimFoundation/issues/15). Development save compatibility is intentionally not maintained between schema versions.

## Design Pillars

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

Building materials and packaged meals are real counted stacks with ground/carrier locations and exclusive work reservations. Surface replacement and annex construction reserve, pick up, deliver, and consume those objects. Pantry replenishment transports meal stacks; individual pawns collect a portion and carry it to a seat before eating. Moving stock changes subsequent collection destinations. The displayed material and meal counters are validated summaries, not additional copies of the inventory.

World view shows current objects and carried cargo; Recorded view retains observed object records. Objects remain serializable during transport. Save schema is now **28**, requiring a fresh development session. This first object set does not add crafting, procurement, arbitrary containers, weight limits, or a universal equipment system. Cameras retain their existing specialized device/kit workflow.

### Storage and Hauling

**Storage and Hauling** manages rectangular floor designations up to 8x8 tiles. Each area has accepted object types, capacity in item units, a total stocking target, and an enabled policy. Areas cannot overlap or cover installed furniture. Packed furniture counts as one unit; supply quantities count individually. Initial designations cover the dining pantry, material store, and meal reserve.

Set a target above current stock to let staff queue ordinary pickup/carry/placement jobs. Incoming quantities reserve capacity, and hauling protects source-area targets and existing item reservations. Deliveries merge compatible unreserved stacks at the same tile without changing condition. Work moves at most twelve supply units or one packed object per trip; no stock is created. The inspector reports incoming quantities, workers, occupied footprints, unreachable routes, full storage, and unavailable source stock. Enable **Layers > Storage** for area boundaries; area names remain in map selection and the inspector without crowding room labels or pawn bubbles.

**Diners collect meals here** makes unreserved meals in an enabled area available for dining. **Relocate area** moves only its designation, not its contents: workers stock the new footprint under its policy, and diners collect there. The old meal-specific hauling state machine and room-coordinate pantry assumption have been removed. Designation changes/removal are rejected while transfers or reserved stock are committed to the area. Removing a designation leaves its objects on the ground. Targets are total units across accepted types, not separate quotas per type; weights, shelves, containers, automatic excess-stock evacuation, and external procurement remain deferred.

### Daily Routines Prototype

The Day Planner edits each pawn's 24 hourly work, free-time, and sleep blocks, with day-shift, night-shift, and rest-day presets. Staff autonomously seek a meal when hungry, a bed when tired, and a break when stressed. Beds, meal seats, and break seats are physically located and exclusively reserved; travel alone does not restore needs. Ordinary schedule changes let current jobs finish, while critical hunger or exhaustion can release work reservations without erasing progress.

The pantry starts with 36 meals and the meal reserve with 72 more. The default dining policy targets 24 meals with capacity 36; general storage hauling replenishes deficits. Day Planner reports meals available in serving areas, other stock (including transport), and issued portions. No food is created by restocking. Shortages and unreachable or occupied service stations are visible in Day Planner. External procurement, cooking, treatment, and richer refusal behavior remain future systems.

### Surveillance Prototype

Surveillance lists installed cameras, their enabled state, and remaining installation kits. **Place camera** opens a single-tile preview in Camera Feed. Orders can be queued without current coverage, including unsurveyed locations; an engineer must reach the site, verify an interior floor, and complete installation before the camera observes anything. Known unsuitable terrain is rejected from recorded survey data; unknown or changed unsuitable terrain leaves an inspectable blocked work order. Awake personnel and active cameras provide local sight through open doors but not walls. Sleeping personnel do not observe.

The **Layers** panel separates World/Recorded perspective, Site/Materials base maps, and Floors/Structures. Condition, Rooms, Objects, Coverage, and Projects are independent overlay checkboxes. Condition outlines and values compose over material colors. Projects only controls project visibility; it never enters placement mode. Double-click a tile or object to inspect it. World-mode Engineering reads physical truth; Recorded-mode Engineering reads the last survey. Personnel assessments remain documentary records in either map perspective.

The map shows bright live coverage, dim remembered terrain, unknown areas beyond the initial survey, and labeled last-sighting markers. Unseen anomalies continue simulating, but their registry and map information remain at the last recorded observation. Camera placement and range are provisional abstractions; power, communications failures, and directional lenses remain future work.

### Doors and Passage

Engineering exposes **Automatic**, **Held open**, and **Held closed** door policies. Starting doors and new annex doors are automatic: routes may pass through them, but a pawn at a closed doorway spends one movement step opening it before crossing. Work, clinical appointments, hauling, routines, and SCP-999 all use the same passage rule. Opening staff show an action bubble. Automatic doors close at the start of a tick once no pawn or ground object is on or cardinally adjacent to the doorway.

Held-closed doors block route planning; a delivery can stall with its stock still reserved or carried, then resume when access is restored. Closed doors also block sight and the existing exposure propagation; an opening changes both without separate containment scripting. Material failure leaves a passable breach, and replacement restores the door with its retained policy. Closure commands refuse a doorway occupied by a pawn or object. Policies are administrative settings; Recorded physical state still reflects the last observation.

Held settings are immediate godlike commands, not remote-control hardware or worker jobs. There are no access badges, powered locks, door speeds, queues, or hard pawn collision in this checkpoint. Automatic doors do not distinguish personnel from SCP-999 and are not secure barriers against it.

### Surface Repair

Every installed floor, wall, and door has its own material and integrity. Soil is the base ground; floors and structures are independent layers. Failed walls cease blocking movement and sight but leave the floor beneath them intact. Failed flooring exposes soil. Starting rooms and newly built annexes use the same shared material catalog: concrete, steel, ceramic, and composite.

Engineering can order replacement of either installed layer using the shared construction stock. Materials are collected at the store, delivered by the same carrier, and fitted by an engineer. Rebuilding waits for occupied structure footprints to clear. Optional facility maintenance queues work for currently observed condition at 55% or below, preserving the existing material. Failed structures receive emergency priority; appointments, urgent needs, and cargo deliveries remain protected from preemption. Known doors can be opened or closed in Engineering; closing cannot trap an occupant.

The general exposure API remains available to authored scenarios and tests: bounded sources reach cardinally connected surfaces, stop at intact walls or sealed doors, and reach neighboring space after a barrier opens. The default source list is empty. The AN-001 scenario, bespoke enclosure, and dedicated window were removed from active play; its design notes remain archived in the catalog.

The scripted AN-001 and SCP-9620 workflows, instant **Complete Research** shortcut, fabricated budget figures, and claimed alarm hardware/power system have been removed. The library is a documentary view. Anomalous screening remains unavailable in the default scenario until a real research system exists. Save schema is now 28; earlier development saves require a fresh session.

### Occupational Health Prototype

Open Occupational Health from the Site 828 facility folder to assign any staff member to medical duty and choose separate recurring intervals for physical examinations, rapid mood screeners, psychiatric evaluations, and extended anomalous behavior surveys. Routine reviews are off by default. Anomalous surveys require Anomalous Psychometrics research; a configured interval waits for that research rather than exposing hidden traits.

The assignment table includes all personnel and sorts by recorded Medical Skill or current job availability. A procedure selector explains disqualifications using the same requirement definitions as job execution. Assignment is not qualification: untrained staff can administer a slower, lower-confidence mood screener; physical examinations require Medical 3, psychiatric evaluation Medical 5, and anomalous surveys Medical 6. These thresholds are provisional balancing values. Current availability reflects active work and patient reservations, not a prediction of future shifts or hidden capability.

Manual examination and evaluation buttons create referrals, not instant assessments. An assessor and patient travel to the medical bay; reports appear only after work completes. Mood screeners provide broad estimates without sanity scores or psychiatric contributors. Deeper psychiatric assessments retain narrower estimates and supporting contributors. At least two appropriately qualified staff are needed to evaluate the medical staff themselves. Examinations reveal findings but do not treat injuries.

Personnel are general-purpose pawns with backgrounds, qualifications, preferences, and trainable skills. Scientist, engineer, custodian, medic, security officer, and similar labels describe current duties and certifications rather than immutable character classes.

The current pawn rules architecture is defined in the [Personnel Model](docs/personnel-model.md). It specifies identity, Traits, preference Biases, usage-based Skills, Effects, derived Health, equipment, and assessment-limited player knowledge. The executable personnel model remains an incremental prototype of that design.

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

AN-001 is a deferred scenario, not currently spawned or exposed through a dedicated inspector. See [the authored catalog](docs/anomaly-catalog.md) for its retained design notes. Material selection, condition, and replacement work belong to general Engineering.

### SCP-9620

SCP-9620 is the dangerous, deliberately undefined center of the campaign. Its behavior, nature, and relationship to side anomalies should be discovered through play. Research choices can reveal different aspects or states across runs. Unexpected state transformations are Red incidents and may permanently alter rooms, personnel, equipment, or future research options.

The design should preserve ambiguity. Internal content uses authored possibilities and deterministic conditions, but the UI should not expose a single canonical answer at the beginning.

SCP-9620 supplies the central exploratory investigation. Other anomalies and unusual requests introduce optional investigations whose discoveries may provide useful techniques, equipment, or new interpretations, but need not be mandatory steps or keys to the main mystery. Research should accumulate observations, competing hypotheses, and unresolved contradictions, not merely complete a linear quest checklist.

### SCP-999

SCP-999 is a friendly resident anomaly that wanders through permitted areas, seeks interaction, and improves nearby morale. Contact can reduce stress and apply Calm. Caring for SCP-999 creates low-stakes logistics and offers a visible contrast with SCP-9620.

SCP-999 remains an entity with needs, preferences, access rules, and inspectable behavior rather than a passive room modifier.

The prototype now uses local visible encounters rather than site-wide stress ranking. SCP-999 can greet content personnel and gives priority to outward signs of distress among visible candidates; it loses a target when sight is lost. Contact starts a mild calming effect immediately and strengthens the benefit through sustained contact. Sleeping and eating personnel are excluded. The six-tile perception limit, exact effect strengths, and cooldown are gameplay abstractions, not claimed canonical sensing abilities or physiology. See the [source archive and adaptation notes](docs/references/scp-999/adaptation.md) for supported behavior and remaining gaps such as feeding and nighttime enclosure routines.

## Items, Inventory, and Equipment

Pawns use a fixed-slot inventory without multi-cell item shapes. Equipment has explicit paper-doll slots such as head, body, hands, feet, primary hand, off hand, accessory, and utility. The exact slot list can be reduced during implementation, but equipped items must affect both statistics and appearance.

Items can have authored properties and optional Diablo-style affixes. Anomalous affixes should invite creative tradeoffs rather than provide only larger numbers. Examples include a vest that reduces incoming force but stores it as heat, gloves that accelerate repairs while transferring equipment wear to the user, or a weapon that becomes more accurate near frightened allies.

Affixes must be data-defined, deterministic, inspectable, and composable with ordinary equipment. Imbuing and deliberate anomalous item creation are later progression systems; the first release only needs the model and a small number of authored examples.

## Presentation and Art Pipeline

The web game targets desktop browsers. Mobile and touch-first layouts are explicitly outside the initial support scope because dense modeless inspectors, precise map controls, and the 98.css desktop metaphor require persistent screen space. Narrow desktop windows should avoid corrupt overlap, but the application may preserve a minimum virtual desktop instead of reflowing into a mobile interface.

The teal workspace represents the overall simulation desktop. Facilities, temporary expedition maps, and future sites appear as desktop icons and open as separate modeless inspector windows. The default Site 828 window is the facility inspector, not the application itself. It owns that facility's map and operational details and can be moved, resized, closed, and reopened independently.

Global concerns such as pause, simulation speed, save/load, and later scenario management belong on the desktop or in specialized utility windows. Simulation Control uses a compact media-player-style window. Developer facts such as raw tick count and random seed belong in a separate System Monitor and must not leak into ordinary in-world inspectors.

Windows can remain open while the simulation runs. Selecting or double-clicking objects opens inspectors; alerts and object references can focus the relevant map location. Window position, dimensions, open state, and stacking are browser presentation state and should be restored across reloads without entering the authoritative simulation save.

The detailed visual language, historical touchstones, window hierarchy, and anti-goals are recorded in [docs/lookbook.md](docs/lookbook.md).

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

Detailed module boundaries and data contracts are defined in [docs/architecture.md](docs/architecture.md).

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

GitHub issues are the operational roadmap. [docs/roadmap.md](docs/roadmap.md) records the category boundaries and links to their tracking issues. Issues should state their tier, dependencies, acceptance criteria, and simulation/frontend ownership. Architecture decisions that affect multiple categories should be recorded in versioned documentation rather than left only in issue discussion.

## Licensing

This project deliberately uses the SCP Foundation setting and must follow the SCP community's attribution and CC BY-SA requirements. New runtime artwork should be original and released under compatible terms. Before a public release, replace or supplement the repository's current MIT license with the appropriate licensing structure and add complete SCP attribution, source links, and third-party notices.

SCP-9620 is intentionally used as an undefined designation for this game's original central anomaly. Its availability should still be rechecked before publication because the wiki can assign previously unused numbers.
