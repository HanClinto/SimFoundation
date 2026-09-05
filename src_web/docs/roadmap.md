# SCPSiteManager Roadmap

GitHub tracking issues are the operational source for status. This document records scope tiers and category boundaries so future contributors can understand the intended shape without reconstructing it from issue history.

## Tier Definitions

- **Minimum:** Required for the first playable definition of done.
- **Stretch:** The next coherent extension after the minimum is stable.
- **Blue sky:** A direction to preserve architecturally without committing to implementation.

## 1. Headless Simulation and Application Boundary

Tracking issue: [#2](https://github.com/HanClinto/SimFoundation/issues/2)

First implementation slice: [#11](https://github.com/HanClinto/SimFoundation/issues/11)

### Minimum

- Strict TypeScript project with one-way `adapters -> application -> simulation` dependencies
- Serializable versioned state and deterministic fixed ticks
- Seeded randomness, stable commands, results, events, and replay tests
- Protocol-neutral controller with snapshots, dispatch, ticking, subscriptions, and save replacement
- Versioned local autosave through a browser adapter

### Stretch

- Replay viewer and deterministic incident reproduction
- Save migrations and JSON import/export
- Simulation profiling and performance budgets for a populated 128x128 region

### Blue sky

- Alternate frontends, remote simulation hosting, multiplayer observation, and mod/plugin APIs

## 2. Isometric World, Construction, and Utilities

Tracking issue: [#5](https://github.com/HanClinto/SimFoundation/issues/5)

### Minimum

- Expandable 100x100 or 128x128 persistent map with a compact starting footprint
- Isometric terrain, walls, doors, rooms, furniture, collision, and deterministic pathfinding
- Blueprint-based construction, hauling, storage, cleaning, and repair
- Power generation, distribution, consumption, shortages, and inspectable failures
- At least seven functional room or facility types needed by the vertical slice

### Stretch

- Ventilation, plumbing, temperature, fire, decontamination, and redundant utility networks
- Multi-floor construction and elevators
- Room quality, decoration, comfort, and staff personalization

### Blue sky

- Multiple persistent sites, regional infrastructure, procedural locations, and large-scale logistics

## 3. Personnel, Jobs, and Psychology

Tracking issue: [#3](https://github.com/HanClinto/SimFoundation/issues/3)

First personnel slice: [#12](https://github.com/HanClinto/SimFoundation/issues/12)

Personnel model: [personnel-model.md](personnel-model.md)

### Minimum

- Approximately six starting pawns with backgrounds, traits, skills, qualifications, and clearance
- Deterministic autonomous job discovery, scoring, reservation, execution, and interruption
- Work priorities, pawn overrides, schedules, and permitted zones
- Satiety, rest, restorative activities, stress, fear, health, and injuries
- Derived mood and sanity with inspectable contributors
- Temporary effects, memories, mental breaks, treatment, and emergency drafting

### Stretch

- Relationships, mentoring, advanced medicine, therapy, morale policies, and richer break types
- Recruitment, promotion, training, certification, and personnel reviews
- Social groups, ideological conflict, secrets, and loyalty

### Blue sky

- Generational staff stories, deep dialogue, procedural biographies, and organization-wide politics

## 4. Anomalies, Research, and Incident Response

Tracking issue: [#4](https://github.com/HanClinto/SimFoundation/issues/4)

### Minimum

- SCP-9620 multi-stage experiment with branching discoveries and one recoverable incident
- SCP-999 autonomous wandering, care, interaction, Calm, and morale effects
- Data-defined anomaly states, behaviors, containment requirements, and observations
- Green, Yellow, Orange, and Red event classification
- Configurable speed reduction or auto-pause by response level and event category
- Inspectable experiment protocols, discoveries, uncertainty, and incident history

### Stretch

- Multiple SCP-9620 branches and transformations
- Additional resident anomalies and cross-anomaly interactions
- Ethics choices, review boards, grants, cover stories, and richer containment automation

### Blue sky

- Broad anomaly authoring tools, community content packs, dynamic classification, and emergent anomaly ecology

## 5. Inventory, Equipment, Affixes, and SVG Paper Dolls

Tracking issue: [#6](https://github.com/HanClinto/SimFoundation/issues/6)

Reusable graphics package tracker: [#10](https://github.com/HanClinto/SimFoundation/issues/10)

### Minimum

- Fixed-slot pawn inventory and explicit equipment slots
- Paper-doll equipment UI inspired by classic RPGs
- Equipment statistics and appearance derived from authoritative item state
- Data-defined item instances and at least one anomalously affixed item
- Layered isometric SVG humanoid template with curated skin tint channels
- Replaceable clothing, held-item, and equipment layers with stable anchors and metadata
- SVG contract tests for required groups, IDs, layers, and attachment points
- Generic SVG assets and composition metadata isolated under `packages/open-iso-gfx/`

### Stretch

- Authored affix pool, controlled procedural affix generation, item rarity, and identification
- Anomalous imbuing, cleansing, tradeoffs, synergies, and equipment damage states
- More body, hair, clothing, pose, direction, and animation templates

### Blue sky

- In-game equipment experimentation, user-authored SVG packs, deep crafting, and artifact lineages

## 6. Browser UI, Inspectors, and Accessibility

Tracking issue: [#7](https://github.com/HanClinto/SimFoundation/issues/7)

### Minimum

- Canvas-based isometric world with DOM-based 98.css interface
- Modeless movable inspector windows for pawns, anomalies, rooms, items, machines, and jobs
- Pause and 1x, 2x, and 4x controls with alert-driven speed response
- Map focus, selection, blueprints, priority overlays, alerts, and action feedback
- Keyboard navigation, readable focus states, scalable text, and non-color alert indicators
- Desktop-only modeless window manager with persisted position, size, open state, and z-order

### Stretch

- Saved window layouts, advanced overlays, graphs, filters, and searchable event logs
- Rich notification rules and user-defined alert routing
- Additional desktop viewport and high-DPI adaptations

### Blue sky

- Fully themeable desktop shells, detachable dashboards, and collaborative spectator interfaces

## 7. Expeditions, Temporary Maps, and Tactical Play

Tracking issue: [#8](https://github.com/HanClinto/SimFoundation/issues/8)

### Minimum

- Expedition planning with team, loadout, supplies, destination, and objective
- Temporary map creation using the same simulation schema as the base
- One non-combat salvage or recovery expedition
- Transfer of personnel, injuries, items, discoveries, and time between temporary and persistent maps
- Safe temporary-map cleanup after return

### Stretch

- Pause-based tactical combat, cover, line of sight, abilities, rescue, capture, and retreat
- Additional mission types, procedural complications, transport choices, and anomaly recovery
- Base consequences while key personnel are away

### Blue sky

- Strategic world map, rival organizations, linked mission chains, diplomacy, and simultaneous operations

## 8. Content, Balance, Licensing, and Release

Tracking issue: [#9](https://github.com/HanClinto/SimFoundation/issues/9)

### Minimum

- Complete vertical-slice onboarding and Site 828 starting scenario
- Original runtime SVG artwork and source templates under compatible CC BY-SA terms
- SCP attribution, licensing guide, asset manifest, and third-party notices
- Balance pass supporting routine automation, one major incident, recovery, and continued growth
- Automated tests, browser smoke tests, contributor setup, and a public playable build

### Stretch

- Scenario options, difficulty policies, accessibility presets, music, sound, and expanded narrative events
- Content validation tools and contributor documentation
- Performance and compatibility passes across desktop browsers

### Blue sky

- Scenario editor, Steam or desktop packaging, localization, mod distribution, and multiple related SCP games sharing selected libraries

## Vertical Slice Gate

The first playable milestone is not complete merely because each system exists independently. A clean save must support this end-to-end story:

1. Expand the starting facility and establish stable autonomous work.
2. Care for staff and SCP-999 while preparing an SCP-9620 experiment.
3. Equip an expedition team and recover a useful item from a temporary map.
4. Complete the experiment and encounter a serious but recoverable failure.
5. Use pause, alerts, drafting, equipment, and facility systems to contain the incident.
6. Repair the site, treat affected personnel, save, reload, and continue operating.
