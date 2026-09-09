# Prototype Cleanup Review

This review supersedes a proposed exhaustive workflow playtest as the next priority. The goal is a smaller, more coherent simulation, not preserving every prototype screen or adding tests that freeze provisional UI.

## Working Rules

- Keep working general mechanisms: physical objects, movement, jobs, reservations, observations, action ownership and persistence.
- Connect features through those mechanisms when their purpose is clear. Do not build adapters merely to preserve obsolete prototype flows.
- Remove misleading controls or hide unfinished feature shells when there is no meaningful underlying operation. Preserve useful authored material as reference documentation rather than pretending it is earned knowledge.
- Keep tests at behavioral boundaries: resource conservation, actual work, observations and safe cancellation. Avoid tests that require a particular window arrangement, hard-coded scenario or future research progression.
- New research mechanics need a separate small design decision; this review does not authorize a new tech tree or a complete research framework.

## Verified Candidates

### Research Archive / Foundation Library

Visually confirmed static site text, inert contents tree and a display of the `anomalousPsychometrics` capability. No research work is performed here. Remove the archive shortcut/window until there are actual records to browse, or retain only a small honestly labelled site briefing if that text has value. Do not replace it with a more elaborate archive.

### Anomalous Psychometrics

Fresh state sets a saved capability false; no production enabling path was found. Tests enable it explicitly. Occupational Health exposes an interval control marked Research unavailable. Retire the unreachable normal-game affordance for now, preserving the useful clinical implementation separately. Do not silently unlock it. Removing the saved flag itself is a separate compatibility decision, not a prerequisite for hiding the misleading feature.

### Anomaly Registry

The current window is specifically SCP-999 resident status/contact reporting, not a catalog of the facility's anomalies. Preserve the functioning resident behavior, but label the record specifically or fold it into entity inspection. A future general registry should derive entries from real residents/objects, not a second hard-coded catalog.

### Laboratory Annex

Dedicated 9x7 blueprint, 40-material reservation, hauling/building jobs, room metadata, then a 48-progress research-skill commissioning job. No resulting research record or capability connection was found. Generic surface construction already exists. Retire the special laboratory promise. Consider removing new-annex authorization and keeping existing saved work able to finish; preserve a prefab build feature only if it proves useful independent of research. Do not move the commissioning job into a new research abstraction just to preserve it.

Evidence anchors: [archive shell](../src/adapters/browser/main.ts), [clinical coverage display](../src/adapters/browser/clinical-care-view.ts), [clinical eligibility](../src/simulation/clinical.ts), [initial capability](../src/simulation/state.ts), [annex executor](../src/simulation/construction.ts), [annex UI](../src/adapters/browser/construction-view.ts).

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
- [x] Third review: removed new-annex authorization, placement helper and facility shortcut. Existing saved projects retain completion and pre-dispatch cancellation, accessible through Engineering only when blueprints exist. Generic surface construction and object placement remain the normal build paths.
- [ ] Then decide on one facility-based research action, separately from this cleanup, with no tech tree required.

## This Pass

The approved pruning pass removes presentation and authorization paths rather than adding replacement frameworks. Saved clinical data, capability fields and annex execution remain for compatibility; they are not a commitment to preserve these mechanics in the future. No new research mechanics, global unlock or save schema was introduced. The shell's stale tactical/expedition callbacks were reconciled with the existing map handoff APIs so the pruned application typechecks; unrelated local changes were preserved.

Validation stays focused on ordinary care, generic placement and legacy work/resource safety, plus a visual inspection of the reduced facility UI. The placement test no longer depends on the retired annex helper. Underlying legacy authoring APIs remain for old construction tests and compatibility; there is no normal UI for authorizing new annexes.

Verified in the browser: no archive window/shortcuts/status, no Plan Annex entry, only physical/mood/psychiatric routine surveys, no anomalous request buttons, and the SCP-999 resident title. Fresh sites hide the legacy annex link; the facility's subsystem totals now derive from its actual entries. Editing then restoring the mood survey interval restored the saved state exactly. The existing care, construction, persistence and placement tests pass without new snapshot suites. The shared preview was marked hidden by the browser during verification, so navigation used DOM activation; screenshots and live content were also checked.

The next useful validation is a short visual pass after each removal and existing behavior checks for anything actually touched. A long scripted base-plus-expedition playtest is not the priority for this work.

This is a provisional inventory, not a commitment to preserve these systems or a replacement gameplay roadmap.
