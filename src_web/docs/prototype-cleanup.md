# Prototype Cleanup Review

This review supersedes a proposed exhaustive workflow playtest as the next priority. The goal is a smaller, more coherent simulation, not preserving every prototype screen or adding tests that freeze provisional UI.

## Working Rules

- Keep working general mechanisms: physical objects, movement, jobs, reservations, observations, action ownership and persistence.
- Connect features through those mechanisms when their purpose is clear. Do not build adapters merely to preserve obsolete prototype flows.
- Remove misleading controls or hide unfinished feature shells when there is no meaningful underlying operation. Preserve useful authored material as reference documentation rather than pretending it is earned knowledge.
- Keep tests at behavioral boundaries: resource conservation, actual work, observations and safe cancellation. Avoid tests that require a particular window arrangement, hard-coded scenario or future research progression.
- New research mechanics need a separate small design decision; this review does not authorize a new tech tree or a complete research framework.
- Saves are disposable development artifacts. Do not migrate old versions or retain obsolete systems for compatibility. Incompatible changes bump the schema; startup replaces old/invalid data with a fresh site.

## Verified Candidates

### Research Archive / Foundation Library

Visually confirmed static site text, inert contents tree and a display of the `anomalousPsychometrics` capability. No research work is performed here. Remove the archive shortcut/window until there are actual records to browse, or retain only a small honestly labelled site briefing if that text has value. Do not replace it with a more elaborate archive.

### Anomalous Psychometrics

Deleted in schema 46: capability, scheduling interval, request API, anomalous survey generation, targeted/automated trait inference, evidence/assessment records, disclosure flags and matching persistence validators. No compatibility layer or automatic unlock remains.

### Anomaly Registry

The current window is specifically SCP-999 resident status/contact reporting, not a catalog of the facility's anomalies. Preserve the functioning resident behavior, but label the record specifically or fold it into entity inspection. A future general registry should derive entries from real residents/objects, not a second hard-coded catalog.

### Laboratory Annex

Deleted completely: dedicated blueprint state, authoring APIs, hauling/building/commissioning executor, tick hook, cross-system exclusions, project art, save validators, register and annex-only tests. Schema 45 rejects older saves. Generic surface construction remains; current material-stock accounting and generic work authorization survive in `material-stock.ts`, not a legacy annex adapter.

Evidence anchors: [desktop shell](../src/adapters/browser/main.ts), [clinical coverage display](../src/adapters/browser/clinical-care-view.ts), [clinical eligibility](../src/simulation/clinical.ts), [initial state](../src/simulation/state.ts), [current material stock](../src/simulation/material-stock.ts).

The observed dependency chain is misleading: the archive displays a gate, clinical controls wait on that gate, and a research-labelled construction task never supplies it. These are not three parts of an implemented research loop.

## Research Direction

Research should be work a pawn performs using a real research bench or another study facility associated with a containment unit or anomaly. The archive should display records/evidence resulting from that work, not grant global capabilities through a disconnected progress screen.

Before implementation, settle only the first concrete work loop:

1. What physical object or containment unit is being studied?
2. Which facility and access conditions permit the work?
3. What does the pawn actually do, and which existing job/action owner controls it?
4. What observation or study record is produced, as distinct from hidden simulation truth?
5. What does cancellation preserve, and what is consumed, if anything?

Defer broad unlock graphs, generic research currencies, speculative discovery trees and facility-specific frameworks until this loop demonstrates a need for them.

## Next Review

- [x] Visually compare the archive, SCP-999 resident record, construction panel and Occupational Health against their actual simulation owners.
- [x] Trace psychometrics capability writers: no production enabling path found; clinical tests explicitly enable the saved flag.
- [x] Trace annex completion: physical room construction and a research-skill commissioning job, not an evidence-producing research activity.
- [x] First removal: deleted the static archive, shortcuts, inert contents tree, progress display and archive-only styling. Removed anomalous screening request/schedule/procedure controls without granting new capabilities; ordinary care and historical records remain.
- [x] Second removal: renamed the resident record and facility entry SCP-999; its functioning behavior and observations remain.
- [x] Third review: deleted the annex implementation and all runtime/validation/UI dependencies. No old projects are loaded or continued. Generic surface construction and object placement remain the build paths.
- [ ] Then decide on one facility-based research action, separately from this cleanup, with no tech tree required.

## This Pass

Schema 46 follow-up deletes the anomalous clinical branch and trait-reveal schema completely, and makes development personnel/medical views show current values without assessments. Existing ordinary appointments are not required to inspect staff. See [development visibility decision](decisions/005-development-personnel-visibility.md). Browser verification used fresh, unassessed staff: Emil's trait parameters were visible and Lena's chart showed health 86 and the real forearm injury at tick 0; removed capability/evidence fields were absent from the new save.

The first pruning pass removed presentation; the follow-up removes annex internals completely. Retaining them for save compatibility was the wrong decision and is superseded by the explicit no-migrations policy. Schema 45 starts fresh and overwrites incompatible saves. Current-version save round trips and corruption checks remain useful; no legacy schema is maintained.

Validation stays focused on ordinary care, generic placement, current resource conservation and fresh-state behavior. Annex-only suites are deleted. Daily operations and cancellation tests exercise current surface work instead of retired annexes.

The initial visual pass verified no archive window/shortcuts/status, no Plan Annex, ordinary physical/mood/psychiatric surveys and the SCP-999 resident title. The subsequent deletion removes the legacy link and register as well. Facility subsystem totals derive from actual entries.

## Further Consolidation Candidates

1. Completed: remove the anomalous-screening branch and unused trait-reveal records/algorithms entirely.
2. Completed development visibility pass: live health, psychology, needs, preferences, traits and contributors are directly visible. Medical charts show real active effects. Ordinary appointments/history remain as simulated work, not gates; further simplification of report types is deferred rather than replaced with a new psychology framework.
3. Completed in schema 47: removed saved material availability, preferred stockpile position, surface spending counter and fixed 160-unit save budget. Physical stacks/reservations now determine availability and spending. Starter quantities remain scenario content; no procurement framework was added.
4. Preserve authored field missions as playable integration test beds. Separate scenario setup and objectives from map lifecycle, travel, combat and hauling, so the same small scenario can be exercised by a player or a high-level test. Do not delete useful quest scenarios just for being authored.

### Scenario-Backed Accounting Review

- [x] Use small scenarios with 23 and 240 relocated materials to expose fixed-budget and stockpile assumptions.
- [x] Exercise surface/vessel reservation, cancellation, consumption, reload and hauling exclusion through real commands. Verify physical quantities and reservation ownership rather than exact UI sequences or fixed completion ticks.
- Reuse the expedition depot to exercise outbound supplies, recovered cargo and return without assuming every mission always has two objects or a particular threat.
- Keep the scenario definition inspectable/playable; avoid a general quest engine or a large UI automation framework until there is a second concrete scenario that needs it.

The material-accounting pass is complete; authored mission setup separation remains the next approved priority. See [physical material accounting](decisions/006-physical-material-accounting.md). Existing expedition scenarios remain available and their gameplay rules are unchanged.

These are prioritized review candidates, not newly implemented mechanics or commitments to a replacement framework.

The next useful validation is a short visual pass after each removal and existing behavior checks for anything actually touched. A long scripted base-plus-expedition playtest is not the priority for this work.

This is a provisional inventory, not a commitment to preserve these systems or a replacement gameplay roadmap.
