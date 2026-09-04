# Proposal 3: Paranormal Bonds and Breaking Points

Status: review draft

Primary inspirations: Delta Green, Call of Cthulhu, Unknown Armies, stress-injury models

## Design Thesis

A pawn is primarily a professional and a person with Bonds. Skill determines competent action; Willpower and Bonds determine what keeps them human. Psychological harm is divided into Violence, Helplessness, and the Unnatural. Repeated exposure can harden a pawn against one pressure while damaging relationships or leaving them vulnerable elsewhere.

This proposal provides the strongest paranormal storytelling, but its default trajectory is darker and less cozy than the other models.

## Complete Rules Taxonomy

### Identity and profession

- Stable ID
- Name
- Profession: Researcher, Engineer, Medic, Security Officer, Logistician, Administrator
- Clearance: 0 through 5
- Certifications
- Institutional loyalty: 0 through 100
- Personal motivation: Duty, Curiosity, Compassion, Ambition, Survival, Obsession

### Professional skills

Rated 0 through 100:

- Bureaucracy
- Computer Science
- Criminology
- Engineering
- Firearms
- First Aid
- Heavy Machinery
- Investigation
- Medicine
- Occult
- Persuasion
- Pharmacy
- Research
- Search
- Security
- Survival

This list is intentionally concrete. Broad professional packages set starting ratings.

### Personal capacities

- Strength: physical force and carrying
- Constitution: endurance and injury resistance
- Dexterity: coordination and speed
- Intelligence: analysis and learning
- Power: psychological force, concentration, anomalous resistance
- Charisma: trust, persuasion, emotional connection

Rated 3 through 18. Capacities rarely change.

### Bonds

Each Bond has:

- Target: person, family, team, institution, belief, or place
- Score: 0 through 20
- Tags: intimate, dependent, colleague, duty, faith, home
- Strain history

Bonds can absorb psychological damage at a cost: projecting trauma onto a Bond reduces immediate Stability loss but lowers the Bond and creates relationship consequences.

### Stress tracks

Three exposure categories, each with current pressure and adaptation:

- Violence: witnessing injury, killing, being attacked
- Helplessness: inability to rescue, confinement, institutional betrayal
- Unnatural: impossible geometry, possession, SCP-9620 transformations

Each category stores:

- Current pressure: 0 through 10
- Hardened marks: 0 through 5
- Failed marks: 0 through 5

Hardening reduces future acute reactions but carries a social or moral cost. Five failed marks produce a lasting disorder.

### Stability and willpower

- Stability: 0 through 100, persistent psychological integrity
- Willpower points: 0 through Power, short-term exertion
- Breaking point: calculated threshold based on Stability history

Unlike the other proposals, Stability is stored, not purely derived. Paranormal damage has lasting downward pressure until treated.

### Physical state

- Satiety
- Rest
- Hit points
- Injuries
- Pain

### Disorders

Complete launch set:

- Acute Stress Disorder
- Anxiety Disorder
- Depressive Disorder
- Dissociative Disorder
- Obsessive Disorder
- Paranoid Disorder
- Psychotic Disorder
- Substance Dependence
- Violent Compulsion

Disorders have triggers, symptoms, treatment progress, and remission state. Avoid stigmatizing real diagnoses in final copy unless reviewed carefully; fictionalized clinical labels may be preferable.

### Effects and memories

- Acute reactions: Flee, Freeze, Fight, Submit, Dissociate
- Timed medication: Sedated, Mnestic Reinforcement, Antipsychotic Stabilization
- Spatial aura: SCP-999 Comfort, SCP-9620 Attention
- Memories: Witnessed Death, Failed Rescue, Impossible Voice, Team Saved Me

### Equipment

Nine slots: Head, Eyes, Neck, Shirt, Feet, Left Hand, Right Hand, Left Wrist, Right Wrist.

Items affect skills, protection, Willpower costs, or exposure severity. Anomalous affixes can alter any stress track.

## Code Model

```json
{
  "id": "person-emil-novak",
  "identity": {
    "name": "Emil Novak",
    "profession": "logistician",
    "clearance": 1,
    "motivation": "survival",
    "institutionalLoyalty": 54,
    "certifications": ["forklift", "hazardous-materials-1"]
  },
  "capacities": {
    "strength": 11,
    "constitution": 10,
    "dexterity": 12,
    "intelligence": 13,
    "power": 9,
    "charisma": 12
  },
  "skills": {
    "bureaucracy": 35,
    "computerScience": 20,
    "criminology": 10,
    "engineering": 30,
    "firearms": 20,
    "firstAid": 25,
    "heavyMachinery": 60,
    "investigation": 20,
    "medicine": 5,
    "occult": 12,
    "persuasion": 35,
    "pharmacy": 5,
    "research": 15,
    "search": 40,
    "security": 20,
    "survival": 38
  },
  "bonds": [
    {
      "id": "bond-sister",
      "targetType": "person",
      "targetId": "external-ana-novak",
      "label": "Ana, younger sister",
      "score": 14,
      "tags": ["family", "dependent"],
      "strain": []
    },
    {
      "id": "bond-team",
      "targetType": "team",
      "targetId": "site-828-logistics",
      "label": "Site logistics crew",
      "score": 8,
      "tags": ["colleague", "duty"],
      "strain": []
    }
  ],
  "stressTracks": {
    "violence": { "pressure": 1, "hardened": 0, "failed": 1 },
    "helplessness": { "pressure": 3, "hardened": 1, "failed": 1 },
    "unnatural": { "pressure": 4, "hardened": 0, "failed": 2 }
  },
  "psychology": {
    "stability": 62,
    "willpower": 7,
    "breakingPoint": 48,
    "disorders": []
  },
  "physical": {
    "satiety": 58,
    "rest": 64,
    "hitPoints": 10,
    "pain": 0,
    "injuries": []
  },
  "memories": [],
  "effects": [],
  "equipment": {
    "head": null,
    "eyes": null,
    "neck": null,
    "shirt": "item-logistics-jacket",
    "feet": "item-work-boots",
    "leftHand": null,
    "rightHand": "item-inventory-scanner",
    "leftWrist": null,
    "rightWrist": "item-digital-watch"
  }
}
```

An exposure event is explicit:

```json
{
  "eventId": "event-witnessed-death-778",
  "type": "psychological-exposure",
  "category": "violence",
  "severity": 7,
  "witnessIds": ["person-emil-novak"],
  "responses": {
    "person-emil-novak": {
      "testResult": "failed",
      "immediateReaction": "freeze",
      "stabilityLoss": 8,
      "failedMarkAdded": true,
      "memoryId": "memory-witnessed-death-778"
    }
  }
}
```

### Mutation ownership

| Source            | Changes                                                              |
| ----------------- | -------------------------------------------------------------------- |
| Ordinary time     | Satiety, Rest, pressure decay, Willpower recovery                    |
| Exposure event    | Track pressure, marks, Stability, reaction, memory                   |
| Project onto Bond | Stability loss reduced; Bond score/strain worsens                    |
| Treatment         | Disorder progress, failed-mark recovery, Stability restoration       |
| Meaningful work   | Skill improvement                                                    |
| Equipment         | Exposure severity, skill, armor, Willpower modifiers                 |
| Daily transition  | Sleep, Bond contact opportunities, treatment, pressure consolidation |

## RPG Player's Handbook Version

Your Profession tells the Director what work you know. Your Skills are percentile ratings: a rating of 60 means reliable professional competence.

Your Bonds are the people and ideals that keep you connected to ordinary life. When trauma strikes, you may lean on a Bond. You suffer less immediate Stability damage, but that relationship absorbs the strain.

Violence, Helplessness, and the Unnatural are separate because people adapt differently. A security veteran may be hardened to Violence but collapse when reality itself becomes unreliable.

When pressure exceeds your ability to cope, make a Stability test. A minor failure causes an acute reaction. A severe failure adds a failed mark. Repeated failures create a lasting disorder. Repeated successful exposure may harden you, reducing future reactions but changing who you are.

## Shared Scenario Walkthroughs

### SCP-999 soothes Emil

SCP-999 suppresses current pressure on all three tracks and restores Willpower. Direct play creates `team-saved-me`-style positive memory and may enable a therapy bonus. It cannot restore lost Stability instantly or erase failed marks.

### Psychotic episode

Emil reaches his Unnatural breaking point after SCP-9620 speaks using his sister's voice. He gains an acute psychotic reaction, loses Stability, and receives a failed Unnatural mark. If this is his fifth failed mark, he develops Psychotic Disorder with specific triggers.

### Cozy grind

Professional skills improve through use, but progression is less prominent. Heavy Machinery rises from repeated logistics work; Research barely changes. Bonds and treatment become the long-term maintenance game alongside skills.

### Witnessed death

The event is Violence severity 7 and possibly Helplessness severity 4 if rescue was impossible. Emil may project onto his sister Bond, preserving Stability but reducing the Bond and generating an off-site relationship crisis.

### Equipment bonus

A mnestic pendant reduces Unnatural Stability loss but prevents memory suppression. A rifle improves Firearms but increases Violence pressure for a pawn with a relevant failed mark. Equipment interacts with story categories, not just output speed.

### Expedition

Expeditions threaten Bonds through absence and risk all three stress tracks. A hostage rescue is Helplessness-heavy; armed conflict is Violence-heavy; anomaly recovery is Unnatural-heavy.

## What This Does Well

- Produces specific, memorable paranormal trauma stories.
- Bonds connect facility events to personal stakes.
- Distinguishes being hardened from being healthy.
- SCP-999 has meaningful limits and cannot trivialize trauma.
- Equipment, treatment, and mission preparation affect psychological risk in rich ways.

## What Is Awkward

- Stored Stability conflicts with the current derived-sanity direction.
- The system trends toward deterioration and may undermine cozy long campaigns.
- Six capacities, sixteen skills, Bonds, three tracks, marks, Stability, and disorders create high complexity.
- Mental-health labels require careful writing and sensitivity review.
- Players may feel punished for sending favorite pawns into core content.
- Skill grind is secondary to trauma management.

## Flexible Decisions

Core: Bonds, three exposure categories, breaking points, professional skills.

Optional: omit classic capacities; replace diagnostic disorders with fictional “break patterns”; make Stability derived while retaining persistent exposure scars; cap permanent deterioration so treatment supports veteran recovery.
