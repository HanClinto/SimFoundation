# Proposal 2: Classic Attributes and Skills

Status: review draft

Primary inspirations: Dungeons & Dragons, SPECIAL-era CRPGs, Castle of the Winds, classic tactical RPGs

## Design Thesis

Every pawn has six broad aptitudes and a set of trainable skills. Attributes describe innate capacity; skills describe learned practice. Actions combine one primary attribute, one skill, current condition, equipment, and effects.

This is the most recognizably RPG-like proposal and gives equipment and anomalous affixes many useful hooks. It is also the easiest proposal to overcomplicate.

## Complete Rules Taxonomy

### Core attributes

Rated 1 through 10. Ordinary adults cluster from 3 through 7.

- Strength: lifting, melee force, forced entry, hauling capacity
- Dexterity: precision, movement, shooting, delicate manipulation
- Constitution: endurance, disease resistance, blood-loss tolerance
- Intelligence: analysis, technical comprehension, memory
- Willpower: fear resistance, concentration, coercion resistance
- Perception: detection, observation, situational awareness

Attributes are generated from background and individual variation. They cannot increase through routine XP. Rare permanent changes require major cybernetic, medical, or anomalous events and are recorded as alterations to baseline.

### Progressive skills

Rated 0 through 100 with use-based improvement:

- Science: theoretical analysis and experiments
- Engineering: construction, electrical, mechanical systems
- Medicine: treatment, surgery, pharmacology, psychology support
- Firearms: ranged weapon operation
- Close Combat: melee, restraint, unarmed defense
- Athletics: running, climbing, carrying, recovery
- Stealth: concealment, quiet movement, surveillance avoidance
- Investigation: search, evidence, interviews, record analysis
- Logistics: hauling, storage, procurement, expedition supply
- Administration: budget, scheduling, reports, grants
- Persuasion: negotiation, counseling, leadership
- Occult: anomaly protocol, symbols, anomalous theory

### Permanent edges and flaws

Separate from attributes:

- Edge examples: Iron-Willed, Ambidextrous, Photographic Memory, Rapid Healer, Natural Leader, Psychic Null
- Flaw examples: Low Pain Tolerance, Scaredy-Cat, Compulsive Researcher, Fragile, Greedy, Homicidal

A pawn normally has one edge and one flaw. Background may add a professional feature.

### Transient resources

- Satiety: 0 through 100
- Rest: 0 through 100
- Stress: 0 through 100
- Fear: 0 through 100
- Hit points: current physical integrity derived from Constitution and injuries
- Resolve: short-term mental effort derived from Willpower and Rest

### Health and trauma

Injuries impose named penalties even when hit points are restored:

- Head: concussion, eye injury
- Torso: bleeding, organ trauma
- Arms: fracture, burn, amputation
- Legs: fracture, sprain, amputation
- Systemic: infection, radiation, poison

Trauma records track violence, helplessness, and unnatural exposure separately.

### Equipment slots

Core slots:

- Head
- Eyes
- Neck
- Shirt
- Feet
- Left hand
- Right hand
- Left wrist
- Right wrist

Excluded initially: face, legs, back, shoulders, arms, belt, rings.

### Derived values

- Carry capacity from Strength
- Hit points from Constitution
- Resolve from Willpower and Rest
- Initiative from Dexterity and Perception
- Move speed from Dexterity, Athletics, and encumbrance
- Mood from needs, memories, effects
- Sanity from Willpower, Stress, Fear, trauma, anomalous exposure
- Skill check target from attribute and skill

## Code Model

```json
{
  "id": "person-lena-ortiz",
  "identity": {
    "name": "Lena Ortiz",
    "backgroundId": "site-security-officer",
    "assignment": "security",
    "clearance": 2,
    "certifications": ["sidearm", "containment-response", "first-aid"]
  },
  "attributes": {
    "strength": { "base": 6, "permanentAdjustments": [] },
    "dexterity": { "base": 7, "permanentAdjustments": [] },
    "constitution": { "base": 6, "permanentAdjustments": [] },
    "intelligence": { "base": 4, "permanentAdjustments": [] },
    "willpower": { "base": 8, "permanentAdjustments": [] },
    "perception": { "base": 7, "permanentAdjustments": [] }
  },
  "skills": {
    "science": { "rank": 18, "xp": 90 },
    "engineering": { "rank": 22, "xp": 150 },
    "medicine": { "rank": 30, "xp": 420 },
    "firearms": { "rank": 72, "xp": 6120 },
    "closeCombat": { "rank": 68, "xp": 5410 },
    "athletics": { "rank": 65, "xp": 4780 },
    "stealth": { "rank": 44, "xp": 1900 },
    "investigation": { "rank": 38, "xp": 1320 },
    "logistics": { "rank": 35, "xp": 980 },
    "administration": { "rank": 20, "xp": 210 },
    "persuasion": { "rank": 32, "xp": 760 },
    "occult": { "rank": 12, "xp": 40 }
  },
  "edges": ["iron-willed"],
  "flaws": ["hypervigilant"],
  "transient": {
    "satiety": 77,
    "rest": 68,
    "stress": 21,
    "fear": 2,
    "hitPoints": 34,
    "resolve": 12
  },
  "injuries": [],
  "trauma": [],
  "effects": [],
  "equipment": {
    "head": "item-security-helmet",
    "eyes": null,
    "neck": "item-radio-mic",
    "shirt": "item-security-vest",
    "feet": "item-duty-boots",
    "leftHand": "item-site-radio",
    "rightHand": "item-baton",
    "leftWrist": null,
    "rightWrist": "item-digital-watch"
  }
}
```

An action definition names its governing values:

```json
{
  "actionId": "repair-generator-relay",
  "primaryAttribute": "dexterity",
  "secondaryAttribute": "intelligence",
  "skill": "engineering",
  "difficulty": 55,
  "requirements": ["certification:high-voltage-1", "tool:electrical-kit"],
  "failureConsequences": ["delay", "component-damage", "electrical-injury"]
}
```

An item and affix remain separate:

```json
{
  "instanceId": "item-rifle-44",
  "definitionId": "foundation-plasma-rifle",
  "baseModifiers": [
    { "target": "firearms", "operation": "add", "value": 8 },
    { "target": "encumbrance", "operation": "add", "value": 4 }
  ],
  "affixes": [
    {
      "id": "affix-scholarly",
      "modifiers": [
        { "target": "science", "operation": "add", "value": 6 },
        { "target": "stressPerHour", "operation": "add", "value": 0.5 }
      ]
    }
  ]
}
```

### Mutation ownership

| Source               | Changes                                           |
| -------------------- | ------------------------------------------------- |
| Character generation | Base attributes, edge, flaw, background skills    |
| Use and training     | Skill XP/rank only                                |
| Ordinary time        | Satiety, Rest, Stress, Fear, Resolve              |
| Injury               | Hit points and named injury records               |
| Major anomaly        | Permanent attribute adjustment with source record |
| Equipment            | Modifier projection while equipped                |
| Daily transition     | Recovery, trauma decay checks, schedules          |

## RPG Player's Handbook Version

Your six Attributes tell you what kind of person you are physically and mentally. Your Skills tell you what you have learned.

When attempting a task, add a Skill contribution to an Attribute contribution:

$$
\text{Check Score} = 5 \times \text{Primary Attribute} + 2 \times \text{Secondary Attribute} + \text{Skill} + \text{Modifiers}
$$

The task has a Difficulty. The difference determines speed, quality, and risk. The simulation uses deterministic random state for uncertain outcomes.

A pawn with high Intelligence but low Science learns quickly and understands instructions, but remains an inexperienced researcher. A veteran scientist with average Intelligence can still outperform them through Science 80.

Hit Points answer “how close to collapse?” Injuries answer “what is actually wrong?” Resolve is spent to keep acting under fear, pain, or anomalous coercion.

## Shared Scenario Walkthroughs

### SCP-999 soothes Lena

SCP-999 applies Calm: Stress recovery increases, Fear decays, and Resolve regenerates. Willpower affects how quickly Lena returns to duty. The event creates a positive memory but does not raise attributes.

### Psychotic episode

A sanity check uses Willpower, current Resolve, Stress, Fear, trauma, and anomalous effects. Failure by a large margin triggers a severe episode. The episode may be panic, dissociation, obsession, catatonia, or violence based on flaws and trauma tags.

### Cozy grind

Caleb repairs machines to raise Engineering. Dexterity and Intelligence affect XP efficiency and task quality. Engineering can reach 100; attributes remain stable. Training courses improve Engineering but real work is required for higher ranks.

### Witnessed death

The event tests Willpower against severity. Immediate failure raises Fear and spends Resolve. A trauma record applies later Stress and relationship penalties. High Willpower prevents immediate panic but not necessarily trauma.

### Equipment bonus

Lab glasses add Investigation and Science when observing samples. A bizarre pair of Scholarly Boots grants Science despite occupying Feet because affixes are slot-independent. The absurdity is mechanically allowed and becomes part of anomalous item discovery.

### Expedition combat

Initiative uses Dexterity and Perception. Firearms attacks use Dexterity plus Firearms. Carrying a wounded pawn uses Strength plus Athletics. Resisting an anomalous command uses Willpower plus Occult.

## What This Does Well

- Familiar to tabletop and CRPG players.
- Supports expeditions and combat without inventing another model.
- Separates talent from training.
- Equipment bonuses and anomalous affixes have abundant targets.
- Character generation creates immediately distinct physical profiles.

## What Is Awkward

- Six attributes plus twelve skills create substantial UI and balancing load.
- Attribute/skill formulas can obscure why work succeeded.
- Intelligence and Willpower risk becoming dominant choices.
- Hit Points and injuries partially duplicate physical harm.
- Attribute permanence may make weak recruits feel permanently inferior.
- Strange equipment bonuses can make the fiction feel gamey unless constrained.

## Flexible Decisions

Core: six attributes, twelve skills, edge/flaw, health, Resolve, equipment modifiers.

Optional: remove Hit Points and retain only conditions; merge Firearms/Close Combat into Security; merge Investigation/Occult into Anomaly Handling; hide attributes outside detailed dossiers.
