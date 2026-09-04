# SCPSiteManager

SCPSiteManager is a cozy-ish, idle-ish facility management simulator about growing a small provisional SCP Foundation site into a capable research and containment complex. Satisfying routines and increasingly elaborate automation are punctuated by short periods of cascading panic.

The player is the newly promoted Site Director of Site 828 near Jarbridge, Nevada. The site was established around SCP-9620, an intentionally undefined and highly dangerous anomaly. Studying SCP-9620 is the central questline, but discoveries should create branching investigations, optional objectives, and run-specific complications rather than a single linear reveal.

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

## Design Pillars

### A living facility

Personnel autonomously select work from the player's priorities, schedules, zones, qualifications, and policies. The player designs spaces and systems rather than manually directing every routine action. Individual staff can be drafted for emergencies and tactical encounters.

### Anomalous automation

Research begins as hands-on experimentation and develops into visible production and containment chains. Sensors, power, sample transport, decontamination, storage, and security can be automated. Better throughput introduces new failure modes, especially when anomalous equipment becomes part of ordinary infrastructure.

### Recoverable panic

Serious incidents can kill personnel, damage the site, create debt, change anomaly behavior, and leave lasting physical or psychological scars. Most failures should produce a difficult recovery story rather than immediately ending the run.

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

Personnel are general-purpose pawns with backgrounds, qualifications, preferences, and trainable skills. Scientist, engineer, custodian, medic, security officer, and similar labels describe current duties and certifications rather than immutable character classes.

The final pawn rules architecture is under review. Four complete alternatives, shared evaluation scenarios, JSON examples, and a comparison are available in the [Personnel Model Proposal Review Packet](docs/personnel-model-proposals/README.md). The current executable personnel model is a prototype and does not settle that decision.

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

Direct control is reserved for drafting. Drafted pawns can receive explicit move, interact, use ability, attack, arrest, rescue, and retreat orders. Drafting suspends ordinary job selection but does not bypass movement, equipment, skill, or action costs.

## Expeditions and Tactical Encounters

Expeditions are planned from the base using a team, loadout, transport capacity, supplies, and mission objective. Initial expeditions may focus on salvage and anomaly recovery without combat. Tactical combat is a stretch objective, not a prerequisite for the first playable release.

When combat is introduced, it should be pause-based real-time or use discrete tactical turns over the same deterministic action system. The design should favor readable positioning, cover, equipment choices, anomaly interactions, and withdrawal over twitch execution. The player can pause freely to issue orders.

Possible expedition rewards include:

- Conventional supplies and specialist equipment
- Recruits, contacts, and intelligence
- Anomalous materials and item affixes
- Containment candidates and sidequest discoveries
- Information that unlocks branches of the SCP-9620 investigation

## Anomalies

### SCP-9620

SCP-9620 is the dangerous, deliberately undefined center of the campaign. Its behavior, nature, and relationship to side anomalies should be discovered through play. Research choices can reveal different aspects or states across runs. Unexpected state transformations are Red incidents and may permanently alter rooms, personnel, equipment, or future research options.

The design should preserve ambiguity. Internal content uses authored possibilities and deterministic conditions, but the UI should not expose a single canonical answer at the beginning.

### SCP-999

SCP-999 is a friendly resident anomaly that wanders through permitted areas, seeks interaction, and improves nearby morale. Contact can reduce stress and apply Calm. Caring for SCP-999 creates low-stakes logistics and offers a visible contrast with SCP-9620.

SCP-999 remains an entity with needs, preferences, access rules, and inspectable behavior rather than a passive room modifier.

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

## First Playable Definition of Done

The first vertical slice is complete when a player can:

- Start with approximately six personnel in a compact facility on a larger expandable map
- Build and furnish an expanded laboratory and its required utility connections
- Configure autonomous hauling, construction, cleaning, maintenance, research, medical, and security work
- Inspect every pawn, anomaly, room, item, machine, and active job through 98.css windows
- Manage satiety, rest, restorative activities, stress, fear, injury, mood, and derived sanity
- Pause and select simulation speeds, with configurable color-coded alert responses
- Complete a multi-stage SCP-9620 experiment that can trigger one recoverable containment incident
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
