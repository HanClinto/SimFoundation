# Personnel Model Proposal Review Packet

Status: open for review

This directory contains five complete alternatives for SCPSiteManager's pawn model. They are intentionally standalone so reviewers can comment on one model without reconstructing assumptions from chat or issue history.

## Proposals

1. [Skill-First Colony Simulation](01-skill-first-colony-sim.md)
2. [Classic Attributes and Skills](02-classic-attributes-and-skills.md)
3. [Paranormal Bonds and Breaking Points](03-paranormal-bonds-and-breaking-points.md)
4. [Layered Hybrid (Detailed)](04-layered-hybrid-recommended.md)
5. [Simplified Hybrid with Assessment Fog (Current Candidate)](05-simplified-hybrid-assessment-fog.md)

Each proposal includes:

- Inspirations and design thesis
- Complete named rules taxonomy
- Authoritative JSON examples
- Mutation ownership by time, work, event, equipment, and daily transition
- Player's Handbook-style explanation
- The same shared scenario walkthroughs
- Strengths, awkward edges, and optional decisions

## Shared Evaluation Scenarios

Reviewers should judge each system against the same desired play:

1. SCP-999 soothes a stressed pawn without becoming a universal cure.
2. A pawn experiences an understandable psychotic or dissociative episode.
3. Repeated meaningful work creates satisfying long-term skill progression.
4. Witnessing a death produces immediate fear and lasting consequences.
5. Ordinary equipment provides sensible bonuses.
6. An anomalous affix creates a useful benefit with a strange tradeoff on any item type.
7. Injury remains distinct from hunger, fatigue, or mood.
8. Expedition staffing rewards specialization and preparation.
9. Autonomous job selection can explain why one pawn was chosen.
10. The personnel dossier can summarize the result without displaying every internal field.
11. Cameras, monitors, reports, and assessments limit what the Director actually knows.

## Comparison

| Concern                     | Skill-first | Classic attributes | Paranormal bonds | Layered hybrid | Simplified hybrid |
| --------------------------- | ----------- | ------------------ | ---------------- | -------------- | ----------------- |
| Colony-job clarity          | Excellent   | Good               | Fair             | Very good      | Very good         |
| Cozy use-based grind        | Excellent   | Good               | Fair             | Excellent      | Excellent         |
| Tactical/expedition support | Fair        | Excellent          | Very good        | Very good      | Good              |
| Paranormal psychology       | Good        | Good               | Excellent        | Very good      | Very good         |
| Equipment/affix hooks       | Good        | Excellent          | Very good        | Excellent      | Excellent         |
| Explainability              | Excellent   | Fair               | Fair             | Very good      | Very good         |
| Imperfect-information play  | Poor        | Poor               | Fair             | Fair           | Excellent         |
| Implementation cost         | Low         | High               | Very high        | Medium-high    | High              |
| Long-campaign recovery      | Good        | Good               | Difficult        | Good           | Good              |
| Tabletop familiarity        | Moderate    | Excellent          | Strong niche     | Moderate       | Moderate          |

## Summary Judgment

### Skill-first colony simulation

Does best: autonomous work, low complexity, readable progression, quick content authoring.

Feels awkward: talent and training collapse together; physical and tactical distinctions require broader skills or special traits.

Choose it if the game should remain a facility sim first and an RPG only in flavor.

### Classic attributes and skills

Does best: familiar character sheets, tactical actions, broad equipment bonuses, immediate recruit differentiation.

Feels awkward: formulas and duplicate numerical axes can overwhelm the management game. Intelligence/Willpower optimization may crowd out personality.

Choose it if expeditions and tactical combat should eventually rival base management in importance.

### Paranormal bonds and breaking points

Does best: specific trauma stories, personal relationships, meaningful adaptation, strong Delta Green tone.

Feels awkward: persistent psychological decline fights the cozy idle rhythm and current derived-sanity direction. It also creates the largest content and sensitivity burden.

Choose it if the game should primarily explore the human cost of containment.

### Layered hybrid

Does best: combines readable jobs, cozy grind, paranormal consequences, equipment depth, and future tactical support. Each concept has a clear rate of change and UI home.

Feels awkward: discipline is required to stop the layered architecture from exposing too many numbers or accumulating modifier types. Aptitudes could become invisible complexity.

Choose it if base management remains primary but beloved veteran pawns, expeditions, equipment, and anomaly stories all need substantial depth.

### Simplified hybrid with assessment fog

Does best: separates stable identity from mutable Foundation administration, creates character tradeoffs without universally superior stats, and makes cameras, monitors, medicine, trust, and personnel assessments part of facility gameplay.

Feels awkward: fog of war forces every personnel screen to distinguish actual state from known state. Bipolar preference axes are intentionally stylized, mixed-polarity needs require careful presentation, and poor assessment pacing could frustrate players.

Choose it if the facility's information infrastructure should matter as much as the underlying pawn simulation.

## Recommendation

Use Simplified Hybrid as the current candidate, while retaining Layered Hybrid as the higher-detail fallback. The candidate should follow six constraints:

1. Character state is organized by lifecycle: Immutable Identity/Traits/Biases; Stable Foundation Assignment/Skills/Equipment; Transient Needs; Effects; Derived Health and capabilities.
2. Skill remains the dominant contributor to ordinary work; Mind↔Might and Receptive↔Resolute primarily affect preference, learning, and satisfaction.
3. Composure is not a Bias; it is derived from Health, Stress, Fear, Threat Response, relevant training, and Effects.
4. Actual pawn state and player knowledge remain separate; research improves automatic facility-level candidate screening, while optional targeted assessments can use assigned workers and existing Skills.
5. One Effect instance shape uses optional activation, expiration, magnitude, and progression fields instead of separate buff/injury/memory/aura subclasses.
6. The default dossier exposes only assessed identity, assignment, known or suspected Traits, Health summaries, activity, and urgent findings. Exact Effects, formulas, and hidden state remain in drill-down or debug views.

Borrow Bonds and three-category exposure scars from Proposal 3 only after relationships and trauma repeatedly prove too shallow with memories alone.

## Review Questions

1. Are Mind↔Might and Receptive↔Resolute legible as preferences rather than capability scores?
2. Are eight core skills the correct granularity?
3. Should Stability/Sanity ever be persistent, or remain entirely derived?
4. Should traits be strictly immutable, or can rare story events transform them?
5. Should skill levels be 0-20, 0-100, or level plus hidden XP?
6. Are certifications useful gating or administrative clutter?
7. Which paranormal concepts require persistent scars beyond memories/effects?
8. Are Head, Eyes, Shirt, Feet, Left/Right Hand, and two Special slots the right launch set?
9. Which details belong on the default ID summary versus tabs?
10. Does the recommended model support cozy recovery after serious incidents?
11. Should Physical/Mental/Emotional health totals be stored or derived from conditions?
12. How stale can assessments become before imperfect information feels unfair?
13. Which continuous monitors should exist at game start?
14. Should improved screening run automatically, require a Director action, or reserve pawn assignments for targeted follow-up only?
