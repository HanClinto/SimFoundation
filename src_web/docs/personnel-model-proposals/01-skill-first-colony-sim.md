# Proposal 1: Skill-First Colony Simulation

Status: review draft

Primary inspirations: RimWorld, The Sims, Oxygen Not Included

## Design Thesis

A pawn is defined by authored traits, trainable work skills, physical needs, health conditions, memories, and effects. There are no general RPG attributes such as Strength or Intelligence. If the game needs to know whether someone can repair a generator, it consults Engineering skill, current condition, qualifications, tools, and local circumstances directly.

This is the most legible colony-simulation proposal. It prioritizes autonomous job assignment and explainable outcomes over traditional character-building depth.

## Complete Rules Taxonomy

### Identity

- Stable ID
- Legal name
- Preferred name
- Background: one authored career/history package
- Assignment: current work role, not a class
- Security clearance: 0 through 5
- Certifications: explicit permissions for hazardous work
- Work priorities: disabled or priority 1 through 4 by work category
- Schedule: work, recreation, sleep, or unrestricted by hour

### Permanent traits

Each pawn has two or three traits. This proposal uses these complete launch categories:

- Work style: Methodical, Industrious, Workaholic, Goof-Off
- Threat response: Stoic, Scaredy-Cat, Reckless, Vigilant
- Social temperament: Compassionate, Abrasive, Sociable, Solitary
- Anomalous disposition: Psychically Attuned, Psychically Dense, Superstitious, Skeptical
- Medical disposition: Low Pain Tolerance, High Pain Tolerance, Sickly, Robust
- Moral risk: Altruistic, Greedy, Obsessive, Homicidal

A trait is a named rules package. It changes work selection, reaction thresholds, learning, relationships, or allowed mental breaks. It is not an arbitrary bag of invisible `+5` modifiers.

### Progressive skills

Eight launch skills, each level 0 through 20 with use-based XP:

- Research: experiments, analysis, documentation
- Engineering: construction, power, machinery, repair
- Medicine: diagnosis, stabilization, surgery, therapy support
- Security: patrol, restraint, ranged and melee readiness
- Logistics: hauling, storage, expedition supply, procurement
- Administration: budgets, schedules, approvals, grant work
- Social: negotiation, counseling, leadership, de-escalation
- Anomaly Handling: containment protocol, exposure recognition, anomalous interaction

Certifications remain separate from skill. Research 12 does not authorize a pawn to enter a hazardous chamber without the required clearance and protocol certification.

### Transient state

- Satiety: 0 through 100; meals restore it
- Rest: 0 through 100; sleep restores it
- Stress: 0 through 100; workload, discomfort, moral injury, and memories increase it
- Fear: 0 through 100; immediate perceived threats increase it; safety reduces it

Recreation is an activity, not a meter. A restorative activity changes stress and may create a positive memory.

### Health

Health is a set of conditions rather than a single resource:

- Body-part injury: bruise, laceration, fracture, burn, amputation
- Systemic condition: blood loss, infection, intoxication, radiation exposure
- Neurological condition: concussion, seizure, paralysis
- Anomalous condition: possession, temporal displacement, compulsive behavior

The UI may derive an overall Health summary, but treatment and work penalties come from conditions.

### Memories

Memories are event records with emotional pressure and decay:

- Positive: Comfortable Meal, Praised by Director, Comforted by SCP-999, Successful Rescue
- Negative: Witnessed Death, Friend Injured, Containment Failure, Slept in Unsafe Room
- Ambiguous: Touched the Impossible, Heard SCP-9620 Speak, Missing Time

### Effects

Effects have one of five sources:

- Timed: Well Fed, Sedated, Inspired
- Spatial: Near SCP-999, Near Campfire, Inside Contaminated Room
- Equipment: Wearing Protective Vest, Carrying Mnestic Injector
- Medical: Painkillers, Mnestic Course, Antipsychotic Treatment
- Anomalous: Compelled, Psychically Shielded, Observed by SCP-9620

### Derived outputs

- Mood
- Sanity
- Work speed by work category
- Learning rate by skill
- Move speed
- Pain
- Break risk
- Compliance

## Code Model

The authoritative JSON shape is intentionally direct:

```json
{
  "id": "person-mara-voss",
  "identity": {
    "legalName": "Mara Voss",
    "preferredName": "Dr. Voss",
    "backgroundId": "foundation-junior-researcher",
    "assignment": "research",
    "clearance": 3,
    "certificationIds": ["lab-general", "anomaly-contact-2"]
  },
  "traits": [
    { "id": "methodical", "category": "work-style" },
    { "id": "psychically-dense", "category": "anomalous-disposition" }
  ],
  "skills": {
    "research": { "level": 8, "xp": 3120 },
    "engineering": { "level": 1, "xp": 90 },
    "medicine": { "level": 3, "xp": 580 },
    "security": { "level": 1, "xp": 120 },
    "logistics": { "level": 2, "xp": 260 },
    "administration": { "level": 4, "xp": 910 },
    "social": { "level": 3, "xp": 630 },
    "anomalyHandling": { "level": 5, "xp": 1480 }
  },
  "transient": {
    "satiety": 82,
    "rest": 76,
    "stress": 18,
    "fear": 6
  },
  "healthConditions": [],
  "memories": [],
  "effects": [],
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
  "inventory": ["item-notebook-31", "item-thermos-09", null, null, null, null],
  "workPriorities": {
    "research": 1,
    "engineering": 0,
    "medicine": 3,
    "security": 0,
    "logistics": 4,
    "administration": 2,
    "social": 3,
    "anomalyHandling": 2
  }
}
```

Derived output is returned separately and never saved as competing state:

```json
{
  "personId": "person-mara-voss",
  "mood": {
    "score": 78,
    "band": "stable",
    "contributors": [
      { "source": "adequately-rested", "amount": 9 },
      { "source": "recently-fed", "amount": 7 },
      { "source": "sustained-stress", "amount": -5 }
    ]
  },
  "sanity": {
    "score": 91,
    "band": "strong",
    "contributors": [
      { "source": "psychically-dense", "amount": 12 },
      { "source": "witnessed-impossibility", "amount": -9 }
    ]
  },
  "capabilities": {
    "research": 1.18,
    "engineering": 0.42,
    "security": 0.51
  }
}
```

### Mutation ownership

| Source            | Changes                                                       |
| ----------------- | ------------------------------------------------------------- |
| Simulation minute | Satiety, rest, fear decay, timed-effect duration              |
| Completed work    | Skill XP, stress, tool durability, memories                   |
| Daily transition  | Schedule phase, sleep recovery, memory decay, payroll records |
| Event             | Fear, stress, injury, memory, effect, relationship history    |
| Equipment change  | Equipped item IDs only; derived selectors apply item effects  |
| Trait             | Never changes in ordinary play                                |
| Training          | Skill XP and certification progress                           |

## RPG Player's Handbook Version

Your character sheet has four prominent sections.

**Who You Are:** background, assignment, clearance, certifications, and traits. Traits describe dependable behavior. A Stoic pawn keeps working while afraid; a Workaholic voluntarily works past schedule but accumulates stress faster.

**What You Know:** eight skills rated 0 to 20. When a pawn completes meaningful work, that skill gains XP. Difficult work teaches more. Trivial repetition quickly stops teaching.

**How You Are Doing:** Satiety, Rest, Stress, and Fear change during play. Recreation is something a pawn does to lower Stress. Injuries appear separately because a broken arm is not cured by filling a wellness bar.

**What Affects You:** memories, effects, equipment, and local auras alter actions and derived Mood and Sanity.

A work check uses one skill:

$$
\text{Capability} = \text{Skill Factor} \times \text{Condition} \times \text{Equipment} \times \text{Context}
$$

The player does not roll dice manually. The simulation exposes those factors when explaining job assignment or failure.

## Shared Scenario Walkthroughs

### SCP-999 soothes Emil

SCP-999 enters Emil's room. A spatial `near-scp-999` effect applies `stressRecoveryPerMinute: 0.08`. After direct interaction, Emil receives `comforted-by-scp-999`, a six-hour positive memory. His Stress falls; Mood rises. Sanity changes only if stress had been consuming his coping capacity.

### Psychotic episode

Mara has high Stress, low Rest, and the memory `heard-scp-9620-speak`. A deterministic break check crosses its threshold. The simulation adds `psychotic-episode` with behavior `flee-and-hide`, duration 45 minutes, and command compliance disabled. The episode is not a trait and does not permanently redefine her.

### Cozy grind

Caleb repairs increasingly complex equipment. Engineering XP rises. Routine fuse replacement becomes trivial and grants negligible XP; generator synchronization remains challenging. At Engineering 8 he receives a level-up Green event and becomes eligible to train for `high-voltage-2` certification.

### Witnessed death

Lena witnesses a coworker die. She receives immediate Fear, sustained Stress, and a `witnessed-death` memory. Stoic reduces the immediate behavior interruption but does not erase the memory. Counseling uses Social and Medicine to reduce its long-term pressure.

### Equipment bonus and anomalous affix

A clipboard definition grants `researchWorkSpeed: 0.05`. Its affix `whispering-index` grants another `researchDiscoveryChance: 0.08` but adds Stress while near SCP-9620. The equipment item supplies effects; it never edits Mara's saved Research skill.

### Expedition pressure

A salvage mission checks Security for threat response, Logistics for supply efficiency, Medicine for injury stabilization, and Anomaly Handling for safe recovery. No broad attribute is needed.

## What This Does Well

- Every visible number maps directly to work or wellbeing.
- Autonomous job choices are easy to explain.
- Low implementation and balancing overhead.
- Cozy use-based progression is central.
- New content usually composes from skills, traits, memories, and effects.

## What Is Awkward

- There is no clean distinction between talent and training.
- Cross-domain competence requires traits or special-case formulas.
- Tactical combat may stretch Security into an overly broad skill.
- Pawns can feel occupational rather than physically distinctive.
- A novice with Research 8 and another Research 8 are mechanically similar unless traits/effects separate them.

## Flexible Decisions

Core: no general attributes, eight skills, traits, four transient values, health conditions, unified effects, derived Mood/Sanity.

Optional: relationships, skill passions, certifications, and detailed body-part injuries may enter after the first vertical slice.
