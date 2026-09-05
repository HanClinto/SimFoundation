# Proposal 5: Simplified Hybrid with Assessment Fog

Status: review draft and current candidate

Primary inspirations: The Sims, RimWorld, RuneScape, Project Zomboid, Arkham Horror's balanced stat sliders, Delta Green's operational uncertainty, Castle of the Winds inventory, and management games with imperfect information

## Design Thesis

A pawn should be deep enough to develop into a distinctive veteran without requiring the player to read a full tabletop character sheet during ordinary facility work.

This proposal organizes every authoritative pawn field by how and why it changes:

1. **Immutable:** Identity, Traits, and Biases
2. **Stable:** Foundation Assignment, usage-based Skills, Equipment, and Inventory
3. **Transient:** Food, Energy, Social, Stress, and Fear
4. **Effects:** one composable structure for conditional, equipped, spatial, injury, memory, medication, and anomalous modifiers
5. **Derived:** hidden Health domains and task-specific capabilities calculated from the other layers

**Player knowledge is not another Character layer.** It belongs to a separate faction knowledge registry keyed by person ID. The simulation knows the actual pawn; the Site Director receives an assessment-limited projection. Cameras, monitors, interviews, examinations, and reports update that projection.

The system favors tradeoffs over universally superior recruits. Skills provide the satisfying “number goes up” progression. Preference Biases describe favored problem-solving styles rather than raw power. Traits create categorical behavior. Equipment and Effects compose around those facts.

## Major Differences from Proposal 4

- `legalName` plus optional `nickname` replaces preferred name.
- Immutable identity is separated from stable but mutable Foundation assignment and authorization.
- Medical and moral traits are separate categories.
- A pawn may have zero or one trait in each category; no global trait-count rule is required.
- Five independent aptitudes are replaced with two bipolar preference biases.
- Composure is not a Bias. It is a derived capability influenced by Traits, Health, Stress, Fear, Skills, and Effects.
- Transient state uses Food, Energy, Social, Stress, and Fear.
- Physical, Mental, and Emotional Health are derived values rather than stored resources.
- Neck and wrist equipment slots are consolidated into two general-purpose Special slots.
- All ordinary personnel information is subject to assessment recency, confidence, and sensor coverage.

## Biases and Specialization

Biases describe **which way a pawn prefers to solve problems**, not innate intelligence, strength, courage, or maximum competence. Skills answer what the pawn can do. Biases answer what kinds of work they enjoy, select autonomously, and learn most comfortably.

### Mind ↔ Might

- Mind favors planning, theory, diagnosis, documentation, negotiation, and manipulating information.
- Might favors direct intervention, physical manipulation, practical demonstration, drilling, and changing the tangible environment.

This is not Intelligence versus Strength. A smart wrestler and a strong doctor remain possible. A Might-oriented doctor may enjoy emergency procedures and hands-on treatment; a Mind-oriented security officer may favor surveillance and tactical planning.

### Receptive ↔ Resolute

- Receptive favors observation, experimentation, empathy, improvisation, absorbing unfamiliar information, and changing course as evidence arrives.
- Resolute favors protocol, repetition, concentration, persistence, resisting interference, and completing a predetermined objective.

Receptive does not mean indecisive. Resolute does not mean composed. Composure remains a derived capability calculated from Threat Response, Mental and Emotional Health, Stress, Fear, relevant Skills, and Effects.

### Four quadrants

| Quadrant          | Typical satisfying work                                                   | Example roles and activities                                                            |
| ----------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Mind + Receptive  | Discover, interpret, counsel, explore uncertainty                         | Experimental scientist, investigator, counselor, unknown-anomaly analyst                |
| Mind + Resolute   | Follow complex procedures, perform precise production, administer systems | Laboratory engineer, pharmacist, medicine crafter, protocol scientist, administrator    |
| Might + Receptive | Adapt physically in uncertain environments                                | Medic, scout, field researcher, anomalous-weapons specialist, improvisational responder |
| Might + Resolute  | Apply force, construct, defend, execute established plans                 | MTF operator, construction engineer, security officer, containment anchor               |

These are tendencies rather than classes. Tasks can be solved through alternate approaches, and high Skill remains more important than bias alignment.

### Mechanical consequences

Bias match affects four things:

- Autonomous job preference
- Skill learning rate
- Stress from prolonged mismatched work
- Satisfaction/memory generated by meaningful completion

Bias match has little or no direct effect on task capability. A Research 12 Might/Resolute pawn remains more effective at research than a Research 3 Mind/Receptive pawn.

| Match                           |   XP rate | Stress from sustained work | Autonomous preference | Completion memory |
| ------------------------------- | --------: | -------------------------: | --------------------- | ----------------- |
| Both axes match                 |      +15% |                       -10% | Strong                | Strong positive   |
| One axis matches, one neutral   |     +7.5% |                        -5% | Moderate              | Mild positive     |
| Mixed or both neutral           | No change |                  No change | Neutral               | None from Bias    |
| One axis conflicts, one neutral |     -7.5% |                        +5% | Reduced               | Mild negative     |
| Both axes conflict              |      -15% |                       +10% | Low                   | Strong negative   |

Tasks declare a preferred direction or neutrality on each axis. Pawn intensity determines whether each axis matches, conflicts, or is neutral. Meaningful completion creates a short-lived positive or negative memory Effect at the table's strength; trivial or saturated work creates none. Satisfaction is therefore an event outcome expressed through Effects, not a sixth transient meter.

```json
{
  "taskId": "calibrate-scp-9620-sensor",
  "skill": "research",
  "preferredBiases": {
    "mindMight": "mind",
    "receptiveResolute": "receptive"
  },
  "alternateApproaches": [
    {
      "id": "follow-established-calibration-procedure",
      "preferredBiases": {
        "mindMight": "mind",
        "receptiveResolute": "resolute"
      }
    }
  ]
}
```

A Mind/Receptive researcher prefers exploratory calibration. A Mind/Resolute researcher can choose the established-procedure approach instead. A Might-oriented veteran can still perform either task through Research Skill but learns somewhat more slowly and accumulates more Stress from prolonged assignment.

## Complete Rules Taxonomy

### 1. Immutable

#### Identity

Stable during an ordinary campaign:

- Stable person ID
- Legal name
- Optional nickname
- Pronouns
- Birth year or age band
- Place of origin
- Pre-Foundation background
- Appearance seed and visual profile
- Recruitment history

Legal name is the administrative name. Nickname is optional and is used in informal UI when present. A legal-name change can exist as a rare administrative event, but it is not routine pawn progression.

#### Traits

A pawn may have zero or one trait from each category. No trait means ordinary behavior for that category. Traits ordinarily do not change; rare authored events add permanent Effects rather than silently rewriting personality.

##### Work-style traits

- Methodical: higher quality, slower task start, lower error chance
- Industrious: selects work quickly, dislikes idleness
- Workaholic: works past schedule, accumulates long-shift Stress more slowly, resists stopping
- Goof-Off: seeks breaks early, restores Emotional Health efficiently, lower sustained-work tolerance
- Perfectionist: repeats low-quality work, high quality ceiling, Stress from rushed orders

##### Threat-response traits

- Stoic: delayed panic, Fear remains internally significant
- Scaredy-Cat: rapid Fear gain, early retreat
- Reckless: low perceived danger, accepts unsafe work
- Vigilant: detects threats early, gains Stress during prolonged alerts
- Freeze-Prone: low action reliability during sudden acute Fear

##### Social-temperament traits

- Compassionate: effective comfort, stronger reaction to others' suffering
- Abrasive: relationship friction, resists social manipulation
- Sociable: strong Social recovery from company, suffers isolation
- Solitary: works well alone, weak group recreation benefit
- Charismatic: increases group confidence, attracts attention and responsibility

##### Anomalous-disposition traits

- Psychically Attuned: perceives subtle anomalous effects, greater exposure risk
- Psychically Insulated: reduced psychic influence, misses subtle signals
- Superstitious: rituals reduce Stress; uncertain anomaly states raise Fear
- Skeptical: resists rumor and suggestion; undeniable impossibility damages Mental Health more
- Resonant: anomalous equipment Effects are stronger in both directions

Foundation screening may know, suspect, or fail to detect an Anomalous-disposition Trait. There is no separate Anomalous Profile attribute.

##### Medical-constitution traits

- Robust: slower Physical Health loss from ordinary illness and exertion
- Sickly: greater illness risk, faster benefit from careful preventive treatment
- Low Pain Tolerance: Pain creates larger Stress and work penalties
- High Pain Tolerance: functions through Pain but may conceal injury
- Fast Healer: recovery Effects progress faster

##### Moral-disposition traits

- Altruistic: prioritizes rescue, suffers from harmful orders
- Pragmatic: lower moral-injury pressure from necessary tradeoffs
- Greedy: responds strongly to rewards, theft/corruption break patterns become eligible
- Obsessive: persists toward a focus, resists task switching
- Homicidal: violence threshold is lower; violent break patterns become eligible; trust penalties apply when discovered

Each Trait definition references one always-eligible Effect definition. Conditional trait behavior uses `activeWhen` on that ordinary Effect. There is no separate trait-modifier engine.

Representative mappings cover every trait category:

| Trait               | Effect behavior                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Methodical          | Continuous Work Quality increase and Task Start Speed decrease                                |
| Scaredy-Cat         | Continuous Fear Gain increase and Panic Threshold decrease                                    |
| Sociable            | Conditional Social Recovery increase while interacting; Social Drain increase while isolated  |
| Psychically Attuned | Continuous Anomaly Detection increase and anomalous Effect magnitude increase                 |
| High Pain Tolerance | Conditional Pain Response reduction while a painful injury Effect is active                   |
| Homicidal           | Conditional violent-break eligibility and lower violence inhibition during severe Stress/Fear |

Exact numeric balance belongs to trait definitions and testing, not the Character schema.

#### Biases

Each axis is an integer from `-3` to `+3`. Zero is balanced. Neither direction increases total character power; it changes preferred work, learning affinity, autonomous job selection, and satisfaction.

##### Mind ↔ Might

- `-3` Mind: planning, theory, diagnosis, documentation, negotiation, information systems
- `0` Balanced
- `+3` Might: direct intervention, physical manipulation, practical demonstration, drilling

This is not Intelligence versus Strength. It records which problem-solving mode the pawn enjoys and gravitates toward.

##### Receptive ↔ Resolute

- `-3` Receptive: observation, experimentation, empathy, improvisation, adaptation
- `0` Balanced
- `+3` Resolute: protocol, repetition, concentration, persistence, resistance to interference

This is not awareness versus courage. It records whether a pawn prefers to absorb and adapt or establish and execute a plan.

Anomalous sensitivity is not a third Bias. It is represented by the Anomalous-disposition Trait category, where it can remain partially hidden until Foundation screening or later evidence establishes it.

### 2. Stable

#### Foundation assignment

Mutable, assignable, or earned:

- Employment status: candidate, active, suspended, detained, missing, deceased
- Current role: researcher, engineer, medic, security, facilities, logistics, administrator, D-Class
- Security clearance: 0 through 5
- Certifications
- Work priorities
- Schedule
- Permitted zones
- Current team or department
- Current job and order
- Disciplinary status
- Service history

Relationships are not part of identity or Foundation authorization. They belong to a separate optional **Connections** record:

- Person-to-person relationship score
- Relationship tags: friend, rival, mentor, dependent, romantic, distrustful
- Familiarity
- Recent interaction history

Connections can be deferred without destabilizing the core pawn model.

#### Usage-based skills

Eight core skills, each level 0 through 20 plus XP:

- Research: scientific method, experimentation, documentation
- Engineering: construction, electrical and mechanical systems
- Medicine: diagnosis, treatment, surgery, clinical assessment
- Security: patrol, restraint, tactical readiness, threat response
- Logistics: hauling, storage, procurement, expedition supply
- Administration: budgets, schedules, approvals, grants
- Social: counseling, negotiation, leadership, interviews
- Anomaly Handling: containment protocols, exposure recognition, anomalous interaction

Optional combat-era skills, deferred until needed:

- Firearms
- Close Combat
- Fieldcraft

Every skill stores:

- Level
- XP toward next level
- Recent-practice saturation for diminishing trivial grind
- Certification dependencies
- Assessment record: when the Foundation last verified the skill

Skills improve through meaningful completed activity. Bias alignment modifies learning and satisfaction but cannot replace the skill.

For the draft progression curve, `xp` is progress within the current level and resets after leveling. XP required for the next level is:

$$
XP_{next} = 100 + 50L^2
$$

Early levels arrive quickly; level 8 requires 3,300 XP and level 19 requires 18,150 XP. Level 20 is the launch cap. This curve is provisional balance, but the storage semantics are explicit.

#### Equipment and inventory

Core paper-doll slots:

- Head: hats and helmets
- Eyes: glasses, goggles, optical equipment
- Shirt: clothing, lab coats, armor
- Feet: shoes and boots
- Left hand: tools, weapons, carried devices
- Right hand: tools, weapons, carried devices
- Special 1: amulets, rings, bracelets, monitors, shield belts, or unusual devices
- Special 2: a second general-purpose special item

Deferred slots are Face, Legs, Back, Shoulders, Arms, Belt, and dedicated Ring/Neck/Wrist slots. Special slots create an explicit opportunity cost between utility, protection, monitoring, and anomalous artifacts.

Inventory initially provides six fixed portrait-oriented cells. Items do not occupy multiple cells. Capacity upgrades can add cells later without changing item shape rules.

### 3. Transient: Needs and Pressures

Five numbers from 0 through 100:

- Food: higher means fed; meals restore it
- Energy: higher means rested; sleep and rest restore it
- Social: higher means connected; suitable interaction restores it
- Stress: higher means overloaded; restorative activity lowers it
- Fear: higher means acute perceived danger; safety and support lower it

Food, Energy, and Social are reserves where high is good. Stress and Fear are pressures where high is bad. UI must make polarity explicit through labels and color, not assume every value has the same meaning.

Recreation is an activity category rather than a sixth transient value. Examples:

- Playing cards: Stress recovery plus Social recovery
- Solitary reading: Stress recovery; reduced value for Sociable pawns
- Exercise: Stress recovery plus a Physical-conditioning Effect; Energy cost
- SCP-999 play: strong Stress/Fear recovery plus memory/effect
- Watching approved media: modest Stress recovery

### 4. Effects

Effects are the only modifier mechanism. The model does not define separate runtime classes for a buff, injury, memory, threshold penalty, aura, medication, equipment bonus, or anomalous affix.

Every Effect instance has:

- Stable ID and definition ID
- Source reference
- Start tick
- Optional expiration tick
- Optional activation condition
- Current magnitude or progress
- Modifier list

The interpretation is simple:

- No activation condition means the Effect is continuously eligible.
- An activation condition is re-evaluated at deterministic boundaries.
- No expiration tick means the Effect continues until removed or recovered.
- An expiration tick makes it temporary.
- Definition-owned progression can change magnitude, healing, or recovery.
- Equipment systems add/remove equipped Effects; proximity systems add/remove or activate spatial Effects.

This is one data shape with optional fields, not a hierarchy of Effect subclasses.

#### Effect sources

- Need threshold
- Health condition
- Event or memory
- Medication or treatment
- Equipment definition
- Equipment affix
- Entity aura
- Room or facility system
- Anomalous state

#### Initial modifier target families

- Movement: moveSpeed, pathCost, carryCapacity
- Work: workSpeed, workQuality, errorChance
- Learning: xpGain, certificationGain
- Needs: foodDrain, energyDrain, socialDrain
- Pressure: stressGain, stressRecovery, fearGain, fearRecovery
- Derived Health: physicalHealth, mentalHealth, emotionalHealth, domainMinimum, domainMaximum
- Psychology: panicThreshold, breakThreshold, compliance
- Detection: hazardDetection, anomalyDetection, deceptionDetection
- Combat: accuracy, defense, damage, painResponse
- Access: clearanceOverride, protocolPermission

#### Effect examples

- Tired: conditional while `Energy < 10`; `moveSpeed -0.05`, `errorChance +0.10`
- Sprained Ankle: recovering injury; `moveSpeed -0.05`, Physical health penalty
- Missing Foot: permanent injury; severe movement penalty unless prosthetic effect compensates
- Mnestic Course: timed medication; resistance to memory alteration, possible Energy drain
- Comforted by SCP-999: timed memory; Stress recovery and Emotional health support
- Witnessed Death: memory; periodic Stress and Emotional health pressure, fades or responds to counseling
- Near SCP-999: spatial aura; Fear recovery while in range
- Scholarly: equipment affix; Research XP bonus regardless of item base type

### 5. Derived

#### Health domains

Health has three derived totals from 0 through 100. Each starts at 100 and active Effects apply domain damage, recovery, or caps. Health totals are not independently mutated and cannot drift away from their causes.

Physical Health represents bodily integrity and function. Contributing Effects include Sprained Ankle, Broken Arm, Laceration, Burn, Blood Loss, Infection, Radiation Exposure, Missing Foot, and Chronic Pain.

Mental Health represents cognitive coherence, memory integrity, reality testing, and neurological function. Contributing Effects include Concussion, Memory Gap, Dissociation, Compulsive Thought Pattern, Cognitive Interference, Hallucination, Anomalous Suggestion, and Possession.

Emotional Health represents medium-term affect regulation, connectedness, and recovery capacity. It is not current Mood. Contributing Effects include Grief, Isolation, Burnout, Moral Injury, Emotional Numbness, Hopeful, and Supported.

```text
domain health = clamp(100
                + sum(active effect domain modifiers),
                minimum cap from active effects,
                maximum cap from active effects)
```

The simulation can calculate exact Health, but ordinary UI reveals only assessment estimates. Effects explain causes and specific consequences. Mood and Sanity are also derived:

- Mood: immediate subjective wellbeing from Needs, Emotional Health, Stress, and active Effects
- Sanity: coherent functioning from Mental Health, Fear, Stress, anomalous exposure, and active Effects
- Composure: ability to execute an intended action under current pressure; derived from Mental/Emotional Health, Stress, Fear, Threat Response, relevant training, and active Effects

Sanity answers “is this pawn currently interpreting reality coherently?” Composure answers “can this pawn carry out the intended action under pressure?” A pawn can understand what is happening but freeze, or remain operational while suffering distorted perceptions.

Draft Composure calculation:

```text
composure = clamp(50
            + threat-response trait modifier
            + 0.20 * (mental health - 50)
            + 0.15 * (emotional health - 50)
            + relevant skill support
            - 0.25 * stress
            - 0.40 * fear
            + active effect modifiers,
            0,
            100)
```

Relevant skill support is content-defined and capped at 10 points. Security can support tactical Composure; Anomaly Handling can support containment Composure. This does not change either skill's bias affinity or XP calculation.

#### General capability calculation

Derived job values are calculated on demand rather than stored as an exhaustive pawn stat block.

```text
capability = skill contribution
           + limited preference-match contribution
           + active effect modifiers
           + transient-state penalties
           + derived health penalties
```

Equipment and affixes contribute through active Effects, not a separate calculation path. Examples include Carry Capacity, Move Speed, Research Speed, Work Quality, Accuracy, and Damage. Content defines the relevant skill, bias tags, and modifier targets for each task. The architecture does not need a complete capability list before those jobs exist.

#### Concrete skill and preference mapping

Skills do not have one permanent quadrant. Individual tasks specify how that Skill is being used.

| Skill            | Mind + Receptive            | Mind + Resolute                        | Might + Receptive                | Might + Resolute                      |
| ---------------- | --------------------------- | -------------------------------------- | -------------------------------- | ------------------------------------- |
| Research         | Explore unknown behavior    | Execute validated protocol             | Collect field samples            | Repeat physical test sequence         |
| Engineering      | Diagnose novel failure      | Craft medicine or precision components | Improvise field repair           | Construct walls and heavy systems     |
| Medicine         | Diagnose ambiguous symptoms | Compound medication                    | Emergency treatment              | Perform planned procedure             |
| Security         | Interview and investigate   | Plan operation                         | Scout or wield unusual weapon    | Hold position or conduct assault      |
| Logistics        | Adapt supply plan           | Audit and schedule inventory           | Scavenge and route in the field  | Haul and stage known materials        |
| Administration   | Investigate discrepancy     | Process budgets and approvals          | Coordinate crisis response       | Enforce emergency procedure           |
| Social           | Counsel and listen          | Negotiate formal agreement             | Calm people during active danger | Deliver orders and maintain formation |
| Anomaly Handling | Observe unknown anomaly     | Execute containment checklist          | Conduct adaptive field contact   | Physically secure known containment   |

A Mind/Receptive pawn visibly leans toward investigation and discovery. A Mind/Resolute pawn leans toward laboratory crafting, precision procedure, and administration. A Might/Receptive pawn leans toward medicine, scouting, field research, and special weapons. A Might/Resolute pawn leans toward MTF work, construction, security, and containment response. Skill investment and alternate task approaches prevent those tendencies from becoming hard classes.

## Assessment and Fog of War

### Principle

The simulation owns actual pawn state. The Site Director sees only observations and assessments justified by cameras, sensors, reports, equipment, or direct evaluation.

Ordinary browser snapshots should eventually contain a **player projection**, not raw authoritative personnel state. Debug tools may request the actual state explicitly.

### Observation channels

- Camera: location, visible activity, obvious injury, visible equipment
- Direct supervisor report: activity, behavior, obvious needs, compliance
- Basic physical exam: Physical health estimate and detected injuries
- Diagnostic scan: high-confidence Physical health and hidden conditions
- Psychological evaluation: Mental health estimate, detected cognitive conditions
- Counseling interview: Emotional health, Stress, Fear, Social estimate
- Personnel self-report: inexpensive but concealment and bias affect confidence
- Wearable physical monitor: continuous Physical/Food/Energy telemetry if powered and equipped
- Advanced neural monitor: continuous Mental telemetry; rare, invasive, and anomaly-sensitive
- No camera/sensor: last known location and stale records only

### Assessment rules

Every assessment stores:

- Domain: physical, mental, emotional, needs, skills, equipment, location
- Assessed tick
- Assessor or instrument
- Method
- Confidence 0 through 1
- Estimated range rather than exact value
- Findings discovered
- Findings ruled out
- Expiration or staleness policy
- Disclosure status: known, suspected, concealed, unknown

Physical assessments are easiest and most precise. Mental assessments require trained Medicine, suitable tools, and time. Emotional assessments require Social skill, trust, privacy, and often self-report. A continuous emotional monitor should not be ordinary technology.

Provisional staleness policy:

| Observation method        | Fresh     | Stale behavior                             | Unavailable                         |
| ------------------------- | --------- | ------------------------------------------ | ----------------------------------- |
| Powered camera            | 5 minutes | Location/activity labeled last seen        | After 2 hours without corroboration |
| Wearable physical monitor | 5 minutes | Confidence falls rapidly                   | After 30 minutes without signal     |
| Basic physical exam       | 24 hours  | Estimate widens 2 points per day           | After 14 days                       |
| Diagnostic physical scan  | 72 hours  | Estimate widens 1 point per day            | After 30 days                       |
| Psychological evaluation  | 72 hours  | Estimate widens 5 points per week          | After 30 days                       |
| Counseling interview      | 24 hours  | Emotional estimate widens 5 points per day | After 7 days                        |
| Self-report               | 4 hours   | Label changes to unverified/stale          | After 24 hours                      |
| Supervisor report         | 8 hours   | Activity and behavior become last reported | After 48 hours                      |

New witnessed events can invalidate an assessment early. A recorded injury invalidates “no major injury”; an anomalous exposure invalidates relevant Mental-assessment confidence. These values are starting balance, not schema constraints.

### Player-visible projection

The UI may show:

- `Physical 80-90, assessed 3h ago`
- `Mental: no current assessment`
- `Emotional 45-70, low confidence`
- `Stress: elevated (self-report)`
- `Location: last seen entering Sector B1 at 09:42`

The UI must never silently replace stale estimates with omniscient current values.

### Cameras and facility knowledge

A map tile is visible when covered by a powered, functioning camera or directly observed by an authorized pawn/report. Camera failure creates true operational uncertainty. The Camera Feed should render unknown, stale, or unavailable regions differently.

## Code Model

### Authoritative pawn

```json
{
  "id": "person-mara-voss",
  "immutable": {
    "identity": {
      "legalName": "Mara Voss",
      "nickname": null,
      "pronouns": "she/her",
      "birthYear": 1992,
      "origin": "Reno, Nevada",
      "backgroundId": "foundation-research-fellow",
      "appearanceSeed": 28714,
      "recruitedTick": 0
    },
    "traits": {
      "workStyle": "methodical",
      "threatResponse": null,
      "socialTemperament": null,
      "anomalousDisposition": "psychically-insulated",
      "medicalConstitution": null,
      "moralDisposition": null
    },
    "biases": {
      "mindMight": -2,
      "receptiveResolute": -1
    }
  },
  "stable": {
    "foundationAssignment": {
      "employmentStatus": "active",
      "roleId": "researcher",
      "clearance": 3,
      "certificationIds": ["lab-general", "anomaly-contact-2"],
      "workPriorities": {
        "research": 1,
        "engineering": 0,
        "medicine": 3,
        "security": 0,
        "logistics": 4,
        "administration": 2,
        "social": 3,
        "anomalyHandling": 2
      },
      "scheduleId": "day-research",
      "permittedZoneIds": ["common", "research-b1", "containment-observation"],
      "departmentId": "site-828-research",
      "currentJobId": "job-review-telemetry-11",
      "disciplinaryStatus": "clear",
      "serviceHistory": [
        { "tick": 0, "type": "assigned", "detailId": "site-828" }
      ]
    },
    "skills": {
      "research": { "level": 8, "xp": 3120, "recentPractice": 0.62 },
      "engineering": { "level": 1, "xp": 90, "recentPractice": 0.05 },
      "medicine": { "level": 3, "xp": 580, "recentPractice": 0.12 },
      "security": { "level": 1, "xp": 120, "recentPractice": 0.04 },
      "logistics": { "level": 2, "xp": 260, "recentPractice": 0.08 },
      "administration": { "level": 4, "xp": 910, "recentPractice": 0.31 },
      "social": { "level": 3, "xp": 630, "recentPractice": 0.18 },
      "anomalyHandling": { "level": 5, "xp": 1480, "recentPractice": 0.46 }
    },
    "equipment": {
      "head": null,
      "eyes": null,
      "shirt": "item-lab-coat-12",
      "feet": "item-work-shoes-02",
      "leftHand": null,
      "rightHand": "item-clipboard-08",
      "special1": "item-dosimeter-04",
      "special2": "item-watch-03"
    },
    "inventory": ["item-notebook-31", "item-thermos-09", null, null, null, null]
  },
  "transient": {
    "needs": {
      "food": 82,
      "energy": 76,
      "social": 61,
      "stress": 18,
      "fear": 6
    }
  },
  "effectIds": [
    "effect-trait-methodical",
    "effect-equipped-lab-coat",
    "effect-equipped-dosimeter"
  ]
}
```

### Effect instances

```json
[
  {
    "id": "effect-tired-mara",
    "definitionId": "tired",
    "source": { "type": "need-threshold", "need": "energy" },
    "startedTick": 0,
    "expiresAtTick": null,
    "activeWhen": {
      "operator": "less-than",
      "path": "transient.needs.energy",
      "value": 10
    },
    "magnitude": 1,
    "modifiers": [
      { "target": "moveSpeed", "operation": "add", "value": -0.05 },
      { "target": "errorChance", "operation": "add", "value": 0.1 }
    ]
  },
  {
    "id": "effect-sprained-ankle-mara",
    "definitionId": "sprained-ankle",
    "source": { "type": "injury", "eventId": "event-slip-77" },
    "startedTick": 40100,
    "expiresAtTick": null,
    "activeWhen": null,
    "magnitude": 0.7,
    "progression": {
      "rule": "recover-toward-zero",
      "naturalRatePerDay": 0.08,
      "treatmentRateBonus": 0.15
    },
    "modifiers": [
      { "target": "physicalHealth", "operation": "add-scaled", "value": -15 },
      { "target": "moveSpeed", "operation": "add-scaled", "value": -0.05 }
    ]
  },
  {
    "id": "effect-calm-999-mara",
    "definitionId": "calm-from-scp-999",
    "source": { "type": "entity", "entityId": "scp-999" },
    "startedTick": 44120,
    "expiresAtTick": 47720,
    "activeWhen": null,
    "magnitude": 1,
    "modifiers": [
      { "target": "stressRecovery", "operation": "add", "value": 0.08 },
      { "target": "fearRecovery", "operation": "multiply", "value": 1.5 }
    ]
  },
  {
    "id": "effect-near-scp-999-mara",
    "definitionId": "scp-999-soothing-aura",
    "source": { "type": "entity", "entityId": "scp-999" },
    "startedTick": 0,
    "expiresAtTick": null,
    "activeWhen": {
      "operator": "within-distance",
      "subjectId": "person-mara-voss",
      "targetId": "scp-999",
      "distance": 4
    },
    "magnitude": 1,
    "modifiers": [
      { "target": "fearRecovery", "operation": "add", "value": 0.04 }
    ]
  },
  {
    "id": "effect-equipped-dosimeter",
    "definitionId": "continuous-physical-monitor",
    "source": { "type": "equipment", "itemId": "item-dosimeter-04" },
    "startedTick": 0,
    "expiresAtTick": null,
    "activeWhen": {
      "operator": "equipped",
      "itemId": "item-dosimeter-04"
    },
    "magnitude": 1,
    "modifiers": [
      {
        "target": "assessmentConfidence:physical",
        "operation": "set-minimum",
        "value": 0.9
      }
    ]
  },
  {
    "id": "effect-trait-methodical",
    "definitionId": "trait-methodical",
    "source": { "type": "trait", "traitId": "methodical" },
    "startedTick": 0,
    "expiresAtTick": null,
    "activeWhen": null,
    "magnitude": 1,
    "modifiers": [
      { "target": "workQuality", "operation": "add", "value": 0.05 },
      { "target": "taskStartSpeed", "operation": "add", "value": -0.03 }
    ]
  }
]
```

### Assessment knowledge

```json
{
  "personId": "person-mara-voss",
  "lastKnown": {
    "location": {
      "value": { "mapId": "site-828-b1", "x": 17, "y": 24 },
      "observedTick": 45200,
      "source": { "type": "camera", "entityId": "camera-b1-07" },
      "confidence": 1
    },
    "activity": {
      "value": "reviewing-telemetry",
      "observedTick": 45200,
      "source": { "type": "camera", "entityId": "camera-b1-07" },
      "confidence": 0.9
    }
  },
  "assessments": {
    "physical": {
      "assessmentId": "assessment-physical-88",
      "assessedTick": 43800,
      "assessor": { "type": "person", "personId": "person-priya-shah" },
      "method": "basic-physical-exam",
      "confidence": 0.86,
      "estimate": { "minimum": 92, "maximum": 100 },
      "findings": [],
      "ruledOut": ["infection", "major-injury"]
    },
    "mental": {
      "assessmentId": "assessment-mental-41",
      "assessedTick": 38000,
      "assessor": { "type": "person", "personId": "person-priya-shah" },
      "method": "clinical-interview",
      "confidence": 0.68,
      "estimate": { "minimum": 78, "maximum": 96 },
      "findings": ["mild-sleep-disruption"],
      "ruledOut": []
    },
    "emotional": null,
    "needs": {
      "assessmentId": "monitor-stream-mara",
      "assessedTick": 45200,
      "assessor": { "type": "equipment", "itemId": "item-biometric-band-12" },
      "method": "continuous-physical-monitor",
      "confidence": 0.94,
      "estimate": {
        "food": { "minimum": 78, "maximum": 86 },
        "energy": { "minimum": 71, "maximum": 81 }
      },
      "findings": [],
      "ruledOut": []
    }
  },
  "disclosures": {
    "stress": "self-reported",
    "fear": "unknown",
    "traits": {
      "methodical": "known",
      "psychically-insulated": "suspected"
    }
  }
}
```

### Player-projected dossier

```json
{
  "personId": "person-mara-voss",
  "displayName": "Mara Voss",
  "role": "Researcher",
  "location": {
    "label": "Sector B1, Observation Lab",
    "asOfTick": 45200,
    "confidence": "confirmed"
  },
  "health": {
    "physical": { "range": [92, 100], "asOfTick": 43800, "confidence": "high" },
    "mental": {
      "range": [78, 96],
      "asOfTick": 38000,
      "confidence": "moderate"
    },
    "emotional": { "status": "not-assessed" }
  },
  "needs": {
    "food": { "range": [78, 86], "source": "biometric-monitor" },
    "energy": { "range": [71, 81], "source": "biometric-monitor" },
    "social": { "status": "unknown" },
    "stress": { "label": "manageable", "source": "self-report" },
    "fear": { "status": "unknown" }
  },
  "knownEffects": ["mild-sleep-disruption"],
  "suspectedEffects": [],
  "unknownFieldCount": 3
}
```

### Assessment command

```json
{
  "type": "order-assessment",
  "personId": "person-mara-voss",
  "assessmentType": "psychological-evaluation",
  "assignedClinicianId": "person-priya-shah",
  "requiredRoomType": "consultation-room",
  "expectedDurationMinutes": 90,
  "requestedDomains": ["mental", "emotional", "stress", "fear"]
}
```

## Mutation Ownership

| Layer                        | Changes through                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| Immutable Identity           | Recruitment or rare administrative correction only                        |
| Immutable Traits             | No ordinary changes; permanent consequences remain Effects                |
| Immutable Biases             | Fixed at generation                                                       |
| Stable Foundation Assignment | Player orders, promotion, discipline, training, assignment                |
| Stable Skills                | Meaningful work, mentoring, courses, event rewards                        |
| Stable Equipment/Inventory   | Transfer and equip commands                                               |
| Transient Needs              | Time, activity, environment, rest, food, social contact                   |
| Effects                      | Conditions, events, equipment, proximity, medication, progression, expiry |
| Derived Health/Capabilities  | Recalculated from the other layers; never directly mutated                |
| Separate Player Knowledge    | Camera reports, assessments, monitors, self-report, staleness             |

## RPG Player's Handbook Version

### Who you are

Your legal name, optional nickname, background, and traits describe a stable person. You may have one trait from each category or none; absence means ordinary behavior.

### What the Foundation currently asks of you

Your role, clearance, certifications, schedule, priorities, and allowed zones are assignments. They can change without changing who you are.

### Your two preference biases

Mark each axis from -3 to +3:

- Mind (-) to Might (+)
- Receptive (-) to Resolute (+)

A balanced zero is valid. These are preferred problem-solving approaches, not power totals. Skills remain the primary measure of competence. Anomalous sensitivity is represented by known or hidden Anomalous-disposition Traits rather than a third axis.

### What you have learned

Eight skills rise from 0 to 20 through meaningful use. Repetition works until the task becomes trivial. Mentors, training, and preference alignment alter learning speed.

### How you are doing now

Food, Energy, and Social are reserves. Stress and Fear are pressures. Physical, Mental, and Emotional Health are hidden derived summaries of active Effects. Assessments reveal estimates; they do not reveal an automatically current character-sheet value.

### What is affecting you

All injuries, memories, medications, auras, threshold penalties, equipment bonuses, personality consequences, and anomalous affixes use the same Effect shape. Optional activation and expiration fields determine when each Effect applies.

### What the Director knows

The Director does not automatically see your actual sheet. Assessments produce estimates. Cameras show only covered areas. Monitors show only the domains they can measure. Old information becomes stale.

## Shared Scenario Walkthroughs

### SCP-999 soothes Emil

Emil is playing with SCP-999 in a monitored recreation room. The actual simulation applies a spatial aura and then a timed comfort memory. Stress and Fear decline; Social rises. Emotional health may recover slowly.

The Director sees the interaction because the room camera is powered. If Emil wears a biometric monitor, Food and Energy remain current. Emotional improvement is initially “suspected” until self-report or assessment.

### Psychotic episode

Mara has high Stress, low Energy, Effects that reduce Mental Health, and an unrecognized anomalous-suggestion Effect. Derived break risk crosses a threshold and a psychotic-episode Effect activates.

A camera may reveal disorganized behavior but not the cause. The dossier shows “behavioral anomaly observed” until a psychological evaluation identifies Cognitive Interference or Hallucination. A debug inspector can show the actual triggering effects.

### Cozy grind and advancement

Caleb performs meaningful Engineering work. Engineering XP increases. A Might/Resolute preference makes heavy construction satisfying; a Mind/Resolute preference favors precision crafting and laboratory engineering; Receptive approaches favor diagnosis and improvisational repair. His preference does not make other Engineering work impossible. Repeating trivial fuse replacement saturates recent-practice XP; difficult generator repair and mentorship remain productive.

The Director knows his official skill level only as recently assessed. Routine supervisor reports update broad competence; formal certification confirms hazardous-work eligibility.

### Witnessed death

Lena witnesses a death. Actual Fear and Stress spike. A Witnessed Death memory Effect reduces derived Emotional Health and may fade, respond to counseling, or produce longer-lived Grief or Moral Injury Effects.

The Director sees the event only if camera coverage or survivor reports exist. Lena's Stoic trait may conceal visible reaction. Her dossier can remain “No recent emotional assessment” while she is in serious distress.

### Ordinary equipment bonus

Every Research Clipboard applies a Research quality effect while equipped in a hand. Lab Glasses apply eye protection and observation quality. Boots alter movement on rubble. A physical monitor continuously updates physical needs and health estimates if powered.

### Anomalous affix

The Scholarly affix can appear on any item. It increases Research XP but applies cognitive noise near SCP-9620. On boots it is strange but valid. The item inspector explains base effects separately from affix effects.

### Injury

Jon suffers a Sprained Ankle Effect. It reduces derived Physical Health and Move Speed. Its magnitude recovers naturally; treatment accelerates that progression. If no one sees the accident and Jon hides it, the Director may only observe slower work until an exam reveals the injury.

A Missing Foot condition is permanent unless compensated by a prosthetic equipment effect.

### Facility camera failure

Power loss disables Camera B1-07. The map becomes stale outside occupied direct-observation areas. Mara's location remains “last seen at 09:42.” Continuous wearable telemetry can show that she is alive without revealing where she is.

### Mental-health assessment

The Director orders a psychological evaluation. Priya needs a consultation room, time, Medicine skill, and sufficient trust. The result estimates Mental and Emotional health with confidence bounds and may reveal effects. The assessment itself can create Stress or relationship consequences if coercive.

### Expedition selection

The Director chooses personnel from known records, not omniscient state. Skills and certifications may be verified; current Fear or hidden injury may be stale. Better medical screening and equipment reduce uncertainty before departure.

## What This Does Well

- Clear separation between immutable personhood and stable-but-mutable Foundation administration.
- Two memorable preference tradeoffs without “best-stat” recruits.
- Keeps satisfying skill numbers and cozy use-based advancement.
- Five transient values are easy to understand.
- Derived Physical/Mental/Emotional Health supports injuries, trauma, and recovery without duplicating mutable condition state.
- Unified effects handle conditions, medication, memories, auras, equipment, and affixes.
- Assessment fog turns monitoring, medicine, trust, cameras, and equipment into gameplay.
- Hidden information creates operational uncertainty without relying on random disasters.
- The dossier UI has a natural hierarchy: known summary, equipment, skills, effects, and assessment history.

## What Is Awkward

- Mind↔Might is a stylized preference and must not imply intelligence versus strength or physical ability.
- Receptive↔Resolute must avoid implying indecision versus courage; both are competent approaches.
- Mixed-polarity transient values need careful UI: Food/Energy/Social high is good; Stress/Fear high is bad.
- Derived Health needs carefully chosen formulas so different Effects do not collapse into an uninformative average.
- Unified Effects can become a dumping ground without strict definitions, stacking rules, and debug inspection.
- Fog of war complicates every personnel view because actual state and known state must remain separate.
- Players may find stale personnel data frustrating if assessment tools are too slow or opaque.
- Continuous monitors can trivialize uncertainty if inexpensive and universal.

## Core Versus Optional

### Core

- Immutable Identity and stable Foundation Assignment split
- Six trait categories, zero or one trait per category
- Two bipolar preference biases
- Eight core skills with use-based XP
- Food, Energy, Social, Stress, Fear
- Derived Physical, Mental, Emotional Health
- One Effect instance shape with optional activation, expiration, magnitude, and progression
- Eight equipment slots and fixed inventory
- Player knowledge with camera/assessment timestamps and confidence
- Derived Mood, Sanity, and job capabilities

### Optional after MVP

- Connections and relationship graph
- Combat skills
- Permanent exposure scars
- Deliberate trait transformation
- Advanced neural monitoring
- Concealment/deception during assessments
- Prosthetics and permanent disability adaptation
- Legal-name changes

## Recommended UI

### Personnel roster

Show only known or recently reported fields:

- Display name
- Current role
- Last known activity/location
- Physical/Mental/Emotional assessment summaries
- Assessment age and confidence
- Alert markers for stale or missing information

### Dossier tabs

- ID: legal name, nickname, background, known traits
- Assignment: role, clearance, certifications, schedule, priorities, zones
- Status: known needs, health estimates, current effects, assessment recency
- Equipment: eight portrait slots and fixed inventory
- Skills: levels, XP, certifications, assessment confidence
- Records: assessments, service history, injuries, memories that are known to the Foundation

### Debug view

May reveal actual transient values, hidden effects, exact health, real location, and projection differences. It must visually label omniscient data as debug-only.

## Open Decisions for Review

1. Are Mind↔Might and Receptive↔Resolute clear as preferences rather than capability scores?
2. Should the UI display bias values numerically, as named bands, or both?
3. Should derived Health use a simple additive Effect total, domain-specific caps, or a worst-condition-weighted formula?
4. How stale can assessments become before imperfect information feels unfair?
5. Should personnel be able to conceal symptoms deliberately, and which Traits/Skills affect that?
6. Which physical monitors are available at game start, and what infrastructure powers them?
7. Should official skill/certification records always be known while practical competence assessments become stale?
8. Should rare personality-changing events add permanent Effects only, or may they explicitly replace a Trait with player-visible history?
9. Should dossiers show numeric ranges, qualitative labels, or both?
10. How should conflicting reports from cameras, monitors, clinicians, supervisors, and self-reports be resolved?
