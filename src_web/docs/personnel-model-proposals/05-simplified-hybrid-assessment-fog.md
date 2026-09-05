# Proposal 5: Simplified Hybrid with Assessment Fog

Status: review draft and current candidate

Primary inspirations: The Sims, RimWorld, RuneScape, Project Zomboid, Arkham Horror's balanced stat sliders, Delta Green's operational uncertainty, Castle of the Winds inventory, and management games with imperfect information

## Design Thesis

A pawn should be deep enough to develop into a distinctive veteran without requiring the player to read a full tabletop character sheet during ordinary facility work.

This proposal simplifies the Layered Hybrid into eight authoritative layers:

1. Personal identity: stable biographical facts
2. Foundation record: mutable assignment and authorization
3. Immutable categorical traits
4. Three balanced aptitude biases
5. Eight use-based skills
6. Five transient needs and pressures
7. Three health domains
8. Effects, equipment, and derived capabilities

A ninth layer, **player knowledge**, determines which of those facts the Site Director is currently allowed to see. The simulation knows the actual pawn state; ordinary UI receives an assessment-limited projection. Cameras, monitors, interviews, examinations, and reports update that projection.

The system favors tradeoffs over universally superior recruits. Skills provide the satisfying “number goes up” progression. Aptitude axes describe style and affinity rather than raw power. Traits create categorical behavior. Equipment and effects compose around those facts.

## Major Differences from Proposal 4

- `legalName` plus optional `nickname` replaces preferred name.
- Stable identity is separated from mutable Foundation assignment and authorization.
- Medical and moral traits are separate categories.
- A pawn may have zero or one trait in each category; no global trait-count rule is required.
- Five independent aptitudes are replaced with three bipolar aptitude biases.
- Composure is not paired against Cognition. It is a derived capability influenced by traits, health, Stress, Fear, skills, and effects.
- Transient state uses Food, Energy, Social, Stress, and Fear.
- Health is explicitly divided into Physical, Mental, and Emotional domains.
- All ordinary personnel information is subject to assessment recency, confidence, and sensor coverage.

## Why Cognition and Composure Should Not Be Opposites

A zero-sum Analysis↔Composure axis would imply that analytical people are inherently worse under pressure and calm people inherently think less deeply. That is too reductive for the stories we want. It would also make researcher and security archetypes feel predetermined.

This proposal pairs **Analysis↔Instinct** instead:

- Analysis favors preparation, explicit evidence, methodical diagnosis, and complex learning.
- Instinct favors rapid pattern recognition, improvisation, intuitive threat response, and acting with incomplete information.

Composure remains important but is calculated from:

- Threat-response trait
- Mental and Emotional health
- Current Stress and Fear
- Security or Anomaly Handling training
- Memories and active effects
- Equipment, medication, and nearby support

A methodical scientist can be highly composed. An instinctive security officer can panic. The model does not force a false relationship between intellect and courage.

## Complete Rules Taxonomy

### 1. Personal identity

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

### 2. Foundation record

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

### 3. Immutable categorical traits

A pawn may have zero or one trait from each category. No trait means ordinary behavior for that category. Traits ordinarily do not change; rare authored events may add a separate permanent effect rather than silently rewriting personality.

#### Work style

- Methodical: higher quality, slower task start, lower error chance
- Industrious: selects work quickly, dislikes idleness
- Workaholic: works past schedule, accumulates long-shift Stress more slowly, resists stopping
- Goof-Off: seeks breaks early, restores Emotional health efficiently, lower sustained-work tolerance
- Perfectionist: repeats low-quality work, high quality ceiling, Stress from rushed orders

#### Threat response

- Stoic: delayed panic, Fear remains internally significant
- Scaredy-Cat: rapid Fear gain, early retreat
- Reckless: low perceived danger, accepts unsafe work
- Vigilant: detects threats early, gains Stress during prolonged alerts
- Freeze-Prone: low action reliability during sudden acute Fear

#### Social temperament

- Compassionate: effective comfort, stronger reaction to others' suffering
- Abrasive: relationship friction, resists social manipulation
- Sociable: strong Social recovery from company, suffers isolation
- Solitary: works well alone, weak group recreation benefit
- Charismatic: increases group confidence, attracts attention and responsibility

#### Anomalous disposition

- Psychically Attuned: perceives subtle anomalous effects, greater exposure risk
- Psychically Insulated: reduced psychic influence, misses subtle signals
- Superstitious: rituals reduce Stress; uncertain anomaly states raise Fear
- Skeptical: resists rumor and suggestion; undeniable impossibility damages Mental health more
- Resonant: anomalous equipment effects are stronger in both directions

#### Medical constitution

- Robust: slower Physical health loss from ordinary illness and exertion
- Sickly: greater illness risk, faster benefit from careful preventive treatment
- Low Pain Tolerance: Pain creates larger Stress and work penalties
- High Pain Tolerance: functions through Pain but may conceal injury
- Fast Healer: recovery effects progress faster

#### Moral disposition

- Altruistic: prioritizes rescue, suffers from harmful orders
- Pragmatic: lower moral-injury pressure from necessary tradeoffs
- Greedy: responds strongly to rewards, theft/corruption break patterns become eligible
- Obsessive: persists toward a focus, resists task switching
- Homicidal: violence threshold is lower; violent break patterns become eligible; trust penalties apply when discovered

### 4. Balanced aptitude biases

Each axis is an integer from `-3` to `+3`. Zero is balanced. Neither direction increases total character power; it changes preferred approach, learning affinity, and edge-case performance.

#### Force ↔ Finesse

- `-3` Force: leverage, carrying, impact, endurance, forced entry
- `0` Balanced
- `+3` Finesse: precision, delicate manipulation, aim, quiet movement

This is not literal muscle mass versus coordination. A strong, dexterous person can exist in fiction; the axis records which approach is mechanically exceptional. Skills still dominate actual task competence.

#### Analysis ↔ Instinct

- `-3` Analysis: planning, documentation, diagnosis, technical learning
- `0` Balanced
- `+3` Instinct: improvisation, rapid reaction, pattern recognition with incomplete data

Analysis is useful for controlled research and engineering. Instinct is useful for emergencies, fieldwork, and ambiguous social/anomalous situations.

#### Attunement ↔ Insulation

- `-3` Attunement: anomaly detection, resonance, psychic communication, stronger anomalous effects
- `0` Balanced
- `+3` Insulation: resistance to psychic influence, weaker anomalous perception and benefits

The labels describe endpoints, not morality or competence. Both can be valuable in different protocols.

### 5. Progressive skills

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

Skills improve through meaningful completed activity. Aptitude bias modifies learning or alternate approaches but cannot replace the skill.

### 6. Transient needs and pressures

Five numbers from 0 through 100:

- Food: higher means fed; meals restore it
- Energy: higher means rested; sleep and rest restore it
- Social: higher means connected; suitable interaction restores it
- Stress: higher means overloaded; restorative activity lowers it
- Fear: higher means acute perceived danger; safety and support lower it

Food, Energy, and Social are reserves where high is good. Stress and Fear are pressures where high is bad. UI must make polarity explicit through labels and color, not assume every bar has the same meaning.

Recreation is an activity category. Examples:

- Playing cards: Stress recovery plus Social recovery
- Solitary reading: Stress recovery; reduced value for Sociable pawns
- Exercise: Stress recovery plus Physical conditioning effect; Energy cost
- SCP-999 play: strong Stress/Fear recovery plus memory/effect
- Watching approved media: modest Stress recovery

### 7. Health domains

Actual health has three domain totals from 0 through 100 plus named conditions:

#### Physical health

Represents bodily integrity and function.

Conditions include:

- Sprained Ankle
- Broken Arm
- Laceration
- Burn
- Blood Loss
- Infection
- Radiation Exposure
- Missing Foot
- Chronic Pain

#### Mental health

Represents cognitive coherence, memory integrity, reality testing, and neurological function.

Conditions include:

- Concussion
- Memory Gap
- Dissociation
- Compulsive Thought Pattern
- Cognitive Interference
- Hallucination
- Anomalous Suggestion
- Possession

#### Emotional health

Represents medium-term affect regulation, connectedness, and recovery capacity. It is not current Mood.

Conditions include:

- Grief
- Isolation
- Burnout
- Moral Injury
- Emotional Numbness
- Hopeful
- Supported

Health totals summarize domain function. Conditions explain causes and apply specific effects. Mood and Sanity are derived outputs:

- Mood: immediate subjective wellbeing from needs, Emotional health, Stress, memories, and effects
- Sanity: current coherent functioning from Mental health, Fear, Stress, anomalous exposure, and effects

### 8. Unified effects

Effects are the only modifier mechanism. A condition, injury, memory, aura, medication, equipment bonus, affix, or threshold reaction all uses the same structural contract.

#### Effect lifetime types

- Conditional: active while an expression is true
- Timed: active until an end tick
- Recovering: severity declines through healing/treatment
- Permanent: no natural expiry
- Spatial: active while inside a radius, room, zone, or facility
- Equipped: active while an item is equipped
- Memory: decays or changes through time and treatment

#### Effect source types

- Need threshold
- Health condition
- Event or memory
- Medication or treatment
- Equipment definition
- Equipment affix
- Entity aura
- Room or facility system
- Anomalous state

#### Complete initial modifier targets

- Movement: moveSpeed, pathCost, carryCapacity
- Work: workSpeed, workQuality, errorChance
- Learning: xpGain, certificationGain
- Needs: foodDrain, energyDrain, socialDrain
- Pressure: stressGain, stressRecovery, fearGain, fearRecovery
- Health: physicalDamage, physicalRecovery, mentalDamage, mentalRecovery, emotionalDamage, emotionalRecovery
- Psychology: panicThreshold, breakThreshold, compliance
- Detection: hazardDetection, anomalyDetection, deceptionDetection
- Combat: accuracy, defense, damage, painResponse
- Access: clearanceOverride, protocolPermission

#### Examples

- Tired: conditional while `Energy < 10`; `moveSpeed -0.05`, `errorChance +0.10`
- Sprained Ankle: recovering injury; `moveSpeed -0.05`, Physical health penalty
- Missing Foot: permanent injury; severe movement penalty unless prosthetic effect compensates
- Mnestic Course: timed medication; resistance to memory alteration, possible Energy drain
- Comforted by SCP-999: timed memory; Stress recovery and Emotional health support
- Witnessed Death: memory; periodic Stress and Emotional health pressure, fades or responds to counseling
- Near SCP-999: spatial aura; Fear recovery while in range
- Scholarly: equipment affix; Research XP bonus regardless of item base type

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
  "foundationRecord": {
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
  "traits": {
    "workStyle": "methodical",
    "threatResponse": null,
    "socialTemperament": null,
    "anomalousDisposition": "psychically-insulated",
    "medicalConstitution": null,
    "moralDisposition": null
  },
  "aptitudeBiases": {
    "forceFinesse": 2,
    "analysisInstinct": -3,
    "attunementInsulation": 2
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
  "transient": {
    "food": 82,
    "energy": 76,
    "social": 61,
    "stress": 18,
    "fear": 6
  },
  "health": {
    "physical": 100,
    "mental": 94,
    "emotional": 78,
    "conditionIds": []
  },
  "effectIds": ["effect-equipped-lab-coat", "effect-equipped-dosimeter"],
  "equipment": {
    "head": null,
    "eyes": null,
    "neck": "item-dosimeter-04",
    "shirt": "item-lab-coat-12",
    "feet": "item-work-shoes-02",
    "leftHand": null,
    "rightHand": "item-clipboard-08",
    "leftWrist": null,
    "rightWrist": "item-watch-03"
  },
  "inventory": ["item-notebook-31", "item-thermos-09", null, null, null, null]
}
```

### Effect instances

```json
[
  {
    "id": "effect-tired-mara",
    "definitionId": "tired",
    "source": { "type": "need-threshold", "need": "energy" },
    "lifetime": {
      "type": "conditional",
      "condition": {
        "operator": "less-than",
        "path": "transient.energy",
        "value": 10
      }
    },
    "scope": "self",
    "modifiers": [
      { "target": "moveSpeed", "operation": "add", "value": -0.05 },
      { "target": "errorChance", "operation": "add", "value": 0.1 }
    ]
  },
  {
    "id": "effect-sprained-ankle-mara",
    "definitionId": "sprained-ankle",
    "source": {
      "type": "health-condition",
      "conditionId": "condition-ankle-77"
    },
    "lifetime": {
      "type": "recovering",
      "recovery": {
        "remaining": 0.7,
        "naturalRatePerDay": 0.08,
        "treatmentRateBonus": 0.15
      }
    },
    "scope": "self",
    "modifiers": [{ "target": "moveSpeed", "operation": "add", "value": -0.05 }]
  },
  {
    "id": "effect-calm-999-mara",
    "definitionId": "calm-from-scp-999",
    "source": { "type": "entity", "entityId": "scp-999" },
    "lifetime": { "type": "timed", "startedTick": 44120, "endsTick": 47720 },
    "scope": "self",
    "modifiers": [
      { "target": "stressRecovery", "operation": "add", "value": 0.08 },
      { "target": "fearRecovery", "operation": "multiply", "value": 1.5 }
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

| Layer               | Changes through                                                  |
| ------------------- | ---------------------------------------------------------------- |
| Identity            | Recruitment or rare administrative event only                    |
| Foundation record   | Player orders, promotion, discipline, training, assignment       |
| Traits              | Normally immutable; rare permanent authored effects are separate |
| Aptitude biases     | Fixed at generation; no ordinary advancement                     |
| Skills              | Meaningful work, mentoring, courses, event rewards               |
| Transient needs     | Time, activity, environment, rest, food, social contact          |
| Health domains      | Conditions, treatment, recovery, anomaly effects                 |
| Effects             | Conditions, events, equipment, auras, medication, expiry         |
| Equipment/inventory | Transfer and equip commands                                      |
| Player knowledge    | Camera reports, assessments, monitors, self-report, staleness    |

## RPG Player's Handbook Version

### Who you are

Your legal name, optional nickname, background, and traits describe a stable person. You may have one trait from each category or none; absence means ordinary behavior.

### What the Foundation currently asks of you

Your role, clearance, certifications, schedule, priorities, and allowed zones are assignments. They can change without changing who you are.

### Your three aptitude biases

Mark each axis from -3 to +3:

- Force (-) to Finesse (+)
- Analysis (-) to Instinct (+)
- Attunement (-) to Insulation (+)

A balanced zero is valid. These are approaches, not power totals. Skills remain the primary measure of competence.

### What you have learned

Eight skills rise from 0 to 20 through meaningful use. Repetition works until the task becomes trivial. Mentors, training, and aptitude affinity alter learning speed.

### How you are doing now

Food, Energy, and Social are reserves. Stress and Fear are pressures. Physical, Mental, and Emotional health describe medium-term functioning and named conditions explain why.

### What is affecting you

All injuries, memories, medications, auras, threshold penalties, equipment bonuses, and anomalous affixes are Effects with explicit sources and lifetimes.

### What the Director knows

The Director does not automatically see your actual sheet. Assessments produce estimates. Cameras show only covered areas. Monitors show only the domains they can measure. Old information becomes stale.

## Shared Scenario Walkthroughs

### SCP-999 soothes Emil

Emil is playing with SCP-999 in a monitored recreation room. The actual simulation applies a spatial aura and then a timed comfort memory. Stress and Fear decline; Social rises. Emotional health may recover slowly.

The Director sees the interaction because the room camera is powered. If Emil wears a biometric monitor, Food and Energy remain current. Emotional improvement is initially “suspected” until self-report or assessment.

### Psychotic episode

Mara has high Stress, low Energy, declining Mental health, and an unrecognized anomalous-suggestion effect. Derived break risk crosses a threshold and a psychotic episode effect activates.

A camera may reveal disorganized behavior but not the cause. The dossier shows “behavioral anomaly observed” until a psychological evaluation identifies Cognitive Interference or Hallucination. A debug inspector can show the actual triggering effects.

### Cozy grind and advancement

Caleb performs meaningful Engineering work. Engineering XP increases. Force helps heavy installation; Finesse helps relay calibration. His bias does not make either work impossible. Repeating trivial fuse replacement saturates recent-practice XP; difficult generator repair and mentorship remain productive.

The Director knows his official skill level only as recently assessed. Routine supervisor reports update broad competence; formal certification confirms hazardous-work eligibility.

### Witnessed death

Lena witnesses a death. Actual Fear and Stress spike. Emotional health takes damage. A Witnessed Death memory effect applies and may fade, respond to counseling, or become Grief/Moral Injury.

The Director sees the event only if camera coverage or survivor reports exist. Lena's Stoic trait may conceal visible reaction. Her dossier can remain “No recent emotional assessment” while she is in serious distress.

### Ordinary equipment bonus

Every Research Clipboard applies a Research quality effect while equipped in a hand. Lab Glasses apply eye protection and observation quality. Boots alter movement on rubble. A physical monitor continuously updates physical needs and health estimates if powered.

### Anomalous affix

The Scholarly affix can appear on any item. It increases Research XP but applies cognitive noise near SCP-9620. On boots it is strange but valid. The item inspector explains base effects separately from affix effects.

### Injury

Jon suffers a Sprained Ankle. Physical health decreases and the injury effect reduces move speed. Natural recovery progresses; treatment accelerates it. If no one sees the accident and Jon hides it, the Director may only observe slower work until an exam reveals the injury.

A Missing Foot condition is permanent unless compensated by a prosthetic equipment effect.

### Facility camera failure

Power loss disables Camera B1-07. The map becomes stale outside occupied direct-observation areas. Mara's location remains “last seen at 09:42.” Continuous wearable telemetry can show that she is alive without revealing where she is.

### Mental-health assessment

The Director orders a psychological evaluation. Priya needs a consultation room, time, Medicine skill, and sufficient trust. The result estimates Mental and Emotional health with confidence bounds and may reveal effects. The assessment itself can create Stress or relationship consequences if coercive.

### Expedition selection

The Director chooses personnel from known records, not omniscient state. Skills and certifications may be verified; current Fear or hidden injury may be stale. Better medical screening and equipment reduce uncertainty before departure.

## What This Does Well

- Clear separation between stable personhood and mutable Foundation administration.
- Three memorable aptitude tradeoffs without “best-stat” recruits.
- Keeps satisfying skill numbers and cozy use-based advancement.
- Five transient values are easy to understand.
- Physical/Mental/Emotional health supports injuries, trauma, and recovery without conflating them with needs.
- Unified effects handle conditions, medication, memories, auras, equipment, and affixes.
- Assessment fog turns monitoring, medicine, trust, cameras, and equipment into gameplay.
- Hidden information creates operational uncertainty without relying on random disasters.
- The dossier UI has a natural hierarchy: known summary, equipment, skills, effects, and assessment history.

## What Is Awkward

- Bipolar axes are stylized abstractions; Force and Finesse are not truly mutually exclusive in real people.
- Analysis↔Instinct must avoid implying intelligence versus stupidity.
- Mixed-polarity transient values need careful UI: Food/Energy/Social high is good; Stress/Fear high is bad.
- Three health totals plus conditions can duplicate information unless totals and conditions have explicit ownership.
- Unified Effects can become a dumping ground without strict definitions, stacking rules, and debug inspection.
- Fog of war complicates every personnel view because actual state and known state must remain separate.
- Players may find stale personnel data frustrating if assessment tools are too slow or opaque.
- Continuous monitors can trivialize uncertainty if inexpensive and universal.

## Core Versus Optional

### Core

- Personal identity and Foundation record split
- Six trait categories, zero or one trait per category
- Three bipolar aptitude biases
- Eight core skills with use-based XP
- Food, Energy, Social, Stress, Fear
- Physical, Mental, Emotional health plus named conditions
- Unified effect system
- Nine equipment slots and fixed inventory
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
- Equipment: nine portrait slots and fixed inventory
- Skills: levels, XP, certifications, assessment confidence
- Records: assessments, service history, injuries, memories that are known to the Foundation

### Debug view

May reveal actual transient values, hidden effects, exact health, real location, and projection differences. It must visually label omniscient data as debug-only.

## Open Decisions for Review

1. Are the three bipolar axes fun and legible, or should Force/Finesse and Analysis/Instinct become independent aptitudes?
2. Should Attunement use negative values and Insulation positive, or use named bands without numbers?
3. Are Physical/Mental/Emotional health totals stored resources or derived summaries from conditions?
4. Is Social a transient need or should relationships/effects fully replace it?
5. How stale can assessments become before the game feels unfair?
6. Should personnel be able to conceal symptoms deliberately?
7. Which monitors are available at game start?
8. Should the Director always know official skill/certification data, or can practical competence be outdated?
9. Should rare events alter traits or add permanent effects instead?
10. Should the dossier show numeric ranges, qualitative labels, or both?
