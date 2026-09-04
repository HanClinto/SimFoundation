# Proposal 4: Layered Hybrid (Recommended)

Status: review draft

Primary inspirations: RimWorld, The Sims, RuneScape, Project Zomboid, Delta Green, Castle of the Winds, modern data-oriented simulation architecture

## Design Thesis

A pawn is represented in layers with distinct rates of change:

1. Identity and background
2. Immutable traits
3. Broad aptitudes
4. Use-based skills and certifications
5. Physical needs and health conditions
6. Stress, fear, memories, and effects
7. Equipment and anomalous affixes
8. Derived outputs and capabilities

The game exposes only the layer relevant to the current decision. The corporate ID summary stays compact; dossier tabs provide equipment, progression, and influences. This proposal preserves cozy skill grind, supports expeditions and combat, and borrows paranormal pressure concepts without adopting an inevitable downward spiral.

## Complete Rules Taxonomy

### Identity

- Stable ID
- Legal and preferred name
- Background
- Current assignment
- Security clearance 0 through 5
- Certifications
- Work priorities
- Schedule
- Permitted zones
- Relationships and organizational history (optional after MVP)

### Immutable traits

Each pawn receives one trait from two or three categories, maximum three total.

Work style:

- Methodical: slower start, fewer errors, higher quality
- Industrious: accepts work sooner, lower idle tolerance
- Workaholic: ignores recreation schedule, gains Stress from prolonged work more slowly, resists stopping
- Goof-Off: seeks restorative/social activity sooner, lower sustained-work tolerance

Threat response:

- Stoic: higher panic threshold, internal Stress remains
- Scaredy-Cat: Fear rises quickly, flees earlier
- Reckless: lower Fear, underestimates job risk
- Vigilant: detects threats earlier, Stress rises during long quiet watches

Social:

- Compassionate: effective counseling, suffers more from witnessed harm
- Abrasive: social friction, resists social pressure
- Sociable: gains strong recovery from company, suffers isolation
- Solitary: works comfortably alone, social recreation less effective

Anomalous:

- Psychically Attuned: detects and uses subtle effects, takes more exposure
- Psychically Dense: reduced psychic effects, misses subtle observations
- Superstitious: gains Fear from uncertain anomaly states, benefits from familiar rituals
- Skeptical: resists rumors, takes larger Sanity pressure from undeniable impossibility

Medical/moral:

- Low Pain Tolerance
- High Pain Tolerance
- Robust
- Sickly
- Altruistic
- Greedy
- Obsessive
- Homicidal

Traits are rules packages with inspectable triggers. They do not supply a generic modifier list alone.

### Broad aptitudes

Rated 1 through 10 and normally fixed:

- Physical: force, endurance, carrying, injury resistance
- Coordination: precision, movement, delicate manipulation, weapon handling
- Cognition: analysis, memory, complex learning
- Composure: functioning under fear/stress, recovery after shocks
- Sensitivity: perception of and susceptibility to anomalous phenomena

Sensitivity is bipolar rather than “higher is always better.” Some protocols require high Sensitivity; psychic hazards punish it.

Aptitudes influence learning rate and edge cases. They are not primary work stats and stay off the default ID summary.

### Progressive skills

Eight core use-based skills, level 0 through 20 plus XP:

- Research
- Engineering
- Medicine
- Security
- Logistics
- Administration
- Social
- Anomaly Handling

Optional tactical skills added only with combat:

- Firearms
- Close Combat
- Fieldcraft

Each skill has:

- Level
- XP toward next level
- Learning aptitude derived from one or two aptitudes and traits
- Recent-practice history for anti-grind diminishing returns
- Certifications that gate hazardous work

### Physical state

Core needs:

- Satiety
- Rest

Health conditions:

- Injury records by body region
- Pain
- Blood loss
- Infection
- Toxic/radiological exposure
- Medication state
- Anomalous physical conditions

Recreation, meals, sleep, conversation, therapy, and SCP-999 play are activities. They change needs, stress, memories, and effects.

### Psychological facts

- Stress: sustained load 0 through 100
- Fear: immediate threat response 0 through 100
- Memories: persistent event interpretations
- Effects: timed, spatial, equipment, medical, anomalous
- Exposure scars (optional): Violence, Helplessness, Unnatural tags without full stress tracks

### Unified effects

Every effect has:

- Stable instance ID
- Definition ID
- Source reference
- Scope: self, nearby, room, facility
- Start tick
- Optional end tick
- Stack policy: replace, refresh, add, highest
- Conditions
- Modifiers
- Behavior hooks

Complete modifier targets for the initial design:

- Need rates: satietyDrain, restDrain
- Recovery rates: stressRecovery, fearRecovery, painRecovery
- Pressure rates: stressGain, fearGain, anomalousExposure
- Work: workSpeed, workQuality, errorChance
- Learning: xpGain, certificationGain
- Movement: moveSpeed, carryCapacity
- Combat: accuracy, defense, damage, suppressionResistance
- Psychology: panicThreshold, breakThreshold, memoryPressure
- Detection: hazardDetection, anomalyDetection
- Access: clearanceOverride, protocolPermission

### Memories

Memory categories:

- Comfort: SCP-999 Interaction, Good Meal, Comfortable Quarters
- Achievement: Skill Mastery, Successful Experiment, Rescue Completed
- Social: Praised, Insulted, Friend Helped, Friend Lost
- Threat: Attacked, Containment Breach, Fire
- Trauma: Witnessed Death, Failed Rescue, Severe Injury
- Unnatural: Impossible Geometry, Missing Time, SCP-9620 Addressed Me
- Moral: Followed Harmful Order, Refused Harmful Order

Each memory stores mood pressure, sanity pressure, stress pulses, decay, and relationship references.

### Equipment and inventory

Core paper-doll slots:

- Head
- Eyes
- Neck
- Shirt
- Feet
- Left hand
- Right hand
- Left wrist
- Right wrist

Explicitly deferred slots:

- Face
- Legs
- Back
- Shoulders
- Arms
- Belt
- Left ring
- Right ring

Items consist of:

- Immutable definition
- Instance state: durability, charge, contamination
- Base effects
- Zero or more anomalous affixes
- Visual layer reference
- Container placement

Inventory uses fixed portrait-oriented cells. Items do not occupy multiple cells.

### Derived outputs

Never stored unless future hysteresis requires it:

- Mood
- Sanity
- Work capability by job
- Learning rate by skill
- Panic risk
- Mental-break risk and eligible patterns
- Move speed
- Carry capacity
- Pain impact
- Compliance
- Detection capability

## Code Model

```json
{
  "id": "person-mara-voss",
  "identity": {
    "legalName": "Mara Voss",
    "preferredName": "Dr. Voss",
    "backgroundId": "foundation-research-fellow",
    "assignmentId": "research",
    "clearance": 3,
    "certificationIds": ["lab-general", "anomaly-contact-2"],
    "scheduleId": "day-research",
    "permittedZoneIds": ["common", "research-b1", "containment-observation"]
  },
  "traits": [
    { "id": "methodical", "category": "work-style" },
    { "id": "psychically-dense", "category": "anomalous" }
  ],
  "aptitudes": {
    "physical": 4,
    "coordination": 6,
    "cognition": 8,
    "composure": 7,
    "sensitivity": 2
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
  "physical": {
    "needs": { "satiety": 82, "rest": 76 },
    "conditions": [],
    "pain": 0,
    "bloodLoss": 0,
    "exposures": { "toxic": 0, "radiological": 0 }
  },
  "psychology": {
    "stress": 18,
    "fear": 6,
    "memories": [],
    "effectIds": [],
    "exposureScars": []
  },
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

Unified effect instance:

```json
{
  "id": "effect-calm-991",
  "definitionId": "calm-from-scp-999",
  "source": { "type": "entity", "entityId": "scp-999" },
  "scope": "self",
  "startedTick": 44120,
  "endsTick": 47720,
  "stackPolicy": "refresh",
  "conditions": [],
  "modifiers": [
    { "target": "stressRecovery", "operation": "add", "value": 0.08 },
    { "target": "fearRecovery", "operation": "multiply", "value": 1.5 },
    { "target": "panicThreshold", "operation": "add", "value": 12 }
  ],
  "behaviorHooks": []
}
```

Item instance with affix:

```json
{
  "id": "item-clipboard-08",
  "definitionId": "research-clipboard",
  "placement": {
    "type": "equipped",
    "personId": "person-mara-voss",
    "slot": "rightHand"
  },
  "state": { "durability": 92, "charge": null, "contamination": 0 },
  "baseEffects": [
    { "target": "workQuality:research", "operation": "add", "value": 0.05 }
  ],
  "affixes": [
    {
      "id": "affix-whispering-index",
      "effects": [
        { "target": "xpGain:research", "operation": "multiply", "value": 1.12 },
        {
          "target": "stressGain",
          "operation": "add",
          "value": 0.02,
          "condition": "near:scp-9620"
        }
      ]
    }
  ],
  "visualLayerId": "equipment.clipboard.basic"
}
```

Derived inspection:

```json
{
  "personId": "person-mara-voss",
  "mood": {
    "score": 78,
    "band": "stable",
    "contributors": [
      {
        "sourceType": "need",
        "sourceId": "rest",
        "amount": 9,
        "label": "Adequately rested"
      },
      {
        "sourceType": "memory",
        "sourceId": "good-meal-88",
        "amount": 6,
        "label": "Enjoyed breakfast"
      },
      {
        "sourceType": "pressure",
        "sourceId": "stress",
        "amount": -5,
        "label": "Manageable workload"
      }
    ]
  },
  "sanity": {
    "score": 91,
    "band": "strong",
    "contributors": [
      {
        "sourceType": "trait",
        "sourceId": "psychically-dense",
        "amount": 12,
        "label": "Psychically dense"
      },
      {
        "sourceType": "memory",
        "sourceId": "impossible-voice-12",
        "amount": -9,
        "label": "Heard an impossible voice"
      }
    ]
  },
  "capabilities": {
    "research": {
      "score": 1.18,
      "contributors": [
        "Research 8",
        "Cognition 8",
        "Methodical",
        "Research Clipboard",
        "Rest 76%"
      ]
    }
  }
}
```

### Mutation ownership

| Layer           | Ordinary time         | Work                  | Event                             | Equipment                         | Daily transition            |
| --------------- | --------------------- | --------------------- | --------------------------------- | --------------------------------- | --------------------------- |
| Identity        | No                    | Assignment/order only | Clearance discipline              | No                                | Schedule phase              |
| Traits          | No                    | No                    | Rare authored transformation only | No                                | No                          |
| Aptitudes       | No                    | No                    | Rare permanent anomaly/injury     | Temporary projected modifier only | No                          |
| Skills          | No                    | XP and certification  | Event XP                          | Learning modifier                 | Practice decay accounting   |
| Needs           | Drain                 | Work-specific drain   | Immediate change                  | Rate modifier                     | Sleep/meal schedule effects |
| Health          | Condition progression | Injury risk           | Injury/medical event              | Protection                        | Healing/infection checks    |
| Stress/Fear     | Recovery/decay        | Work pressure         | Acute pulse                       | Modifier                          | Memory consolidation        |
| Memories        | Decay                 | Achievement           | Create/update                     | No                                | Consolidate/expire          |
| Effects         | Duration              | Apply/remove          | Apply/remove                      | Project while equipped            | Expire/refresh              |
| Derived outputs | Recalculate           | Recalculate           | Recalculate                       | Recalculate                       | Recalculate                 |

## RPG Player's Handbook Version

### Reading the sheet

**Identity** says who the operative is and where the Foundation permits them to work.

**Traits** are enduring behavioral rules. They shape choices and reactions.

**Aptitudes** describe broad natural capacity. They influence learning and difficult edge cases but do not replace training.

**Skills** are learned professions. They rise through meaningful practice from 0 to 20.

**Physical and psychological state** describe today: hunger, fatigue, injury, stress, fear, memories, and active effects.

**Equipment** provides tools, protection, and sometimes anomalous bargains.

**Mood and Sanity** summarize the result. They are not resources manipulated directly; their contributor lists explain them.

### Resolving work

$$
\text{Capability} = \text{Skill} + 0.25(\text{Relevant Aptitude}) + \text{Equipment} + \text{Traits} + \text{Condition}
$$

Skill is dominant. Aptitude matters without making an untrained genius better than a veteran.

### Progression

Meaningful work grants XP. Challenge, mentorship, aptitude, effects, and diminishing repetition modify the gain. Levels never decay initially. Certifications gate dangerous actions separately.

## Shared Scenario Walkthroughs

### SCP-999 soothes Emil

Proximity applies an aura that accelerates Stress/Fear recovery. Direct play applies Calm and creates `Comforted by SCP-999`. Emil's scheduled recreation is represented as the activity causing those changes, not a recreation meter. His Psychically Attuned trait may make the effect stronger and reveal unusual observations.

### Psychotic episode

Mara accumulates Stress, low Rest, an Unnatural memory, and `observed-by-scp-9620`. Derived Sanity falls below her break threshold. A deterministic break selector chooses among eligible patterns based on traits, memories, and context: flee, hide, dissociate, obsess, become catatonic, sabotage, or attack. The episode is an effect/event, not a new permanent trait.

### Cozy grind

Caleb repairs machinery. Engineering gains XP. His Coordination and Cognition influence learning slightly. Repeating easy fuse jobs reaches a diminishing-return floor; difficult generator work and mentorship remain valuable. Level-up is a Green event. Certification unlocks high-voltage work.

### Witnessed death

Lena receives Fear, Stress, a `Witnessed Death` memory, and possibly a Violence scar. Stoic raises the immediate panic threshold but does not erase psychological impact. Social support, therapy, SCP-999, and time can reduce pressure while preserving a lasting story record.

### Base equipment bonus

Every Research Clipboard adds Research quality. Lab Glasses add anomaly observation and protect eyes. Duty Boots add movement on debris. These are definition effects.

### Anomalous affix

`Whispering Index` can appear on a rifle, helmet, shoes, or clipboard. It increases Research XP while adding Stress near SCP-9620. Because affixes are independent from base definitions, odd discoveries are possible without changing slots or item classes.

### Injury and treatment

A generator arc burns Caleb's left hand. A named condition penalizes two-handed equipment and delicate Engineering. Health summary falls, but Satiety/Rest do not pretend to heal the burn. Medicine treats it; a glove may protect or worsen it.

### Expedition

Team selection considers skills, aptitudes, certifications, current condition, equipment, and psychological pressure. Logistics controls supply efficiency, Security handles threats, Medicine handles casualties, and Anomaly Handling controls capture protocol. Tactical skills can be added only when combat needs them.

## What This Does Well

- Strong cozy grind and long-term attachment.
- Separates talent, training, temporary state, and equipment cleanly.
- Supports facility work, expeditions, combat, and anomaly content.
- Keeps the default UI compact while allowing deep inspection.
- Unified effects prevent bespoke modifier systems.
- Derived outputs remain explainable and testable.
- Allows strange affix combinations without mutating character fundamentals.

## What Is Awkward

- More concepts than the skill-first model.
- Five aptitudes may be invisible complexity if their effects are too small.
- Unified effects require disciplined definitions and debugging tools.
- Contributor ordering and stacking rules need rigorous tests.
- Eight skills may still broaden when combat arrives.
- The model can become spreadsheet-heavy if every subsystem exposes every layer.

## Recommended Core and Deferrals

Core for the vertical slice:

- Identity, clearance, certifications
- Two or three immutable traits
- Five aptitudes
- Eight skills with XP/levels
- Satiety, Rest, Stress, Fear
- Health conditions and Pain
- Memories and unified effects
- Nine equipment slots and fixed inventory
- Derived Mood, Sanity, and job capability

Defer until demanded:

- Relationships and Bonds
- Violence/Helplessness/Unnatural scars
- Firearms, Close Combat, Fieldcraft
- Permanent aptitude mutation
- Detailed body-part simulation beyond functional injury tags
- Dynamic personality change
