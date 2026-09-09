# Authored Expedition Scenarios

## Context

The depot was useful playable content but its two objects, map dimensions, extraction and travel time were repeated in execution, persistence and presentation. Return status accepted any cargo while reporting required exactly two items. These assumptions prevented a second small scenario from exercising shared behavior.

## Decision

Keep authored content in `expedition-site.ts`: notice and location text, travel time, extraction, recovery target identities, optional encounter position and a site factory. Shared expedition execution owns assembly, travel, physical recovery and return. Progress, markers, reporting and current-save validation read the same scenario definition.

Preserve Relay Depot 14. Add Service Store 3 with a smaller map, a different extraction point, shorter travel, three archive cases and no adversary or emission source. Both are playable and usable as deterministic integration scenarios. Notice resolution and return reporting require every declared target identity, not a cargo count. Partial returns permit retry with a new expedition and new object identities.

Schema 48 discards earlier saves without migration. Authored factories define the expected object/source identities and dimensions for validation; current state retains moved objects, doors, observations and action progress.

## Consequences And Alternatives

- Tests use real commands and bounded outcome waits for physical assembly, recovery, cancellation, reload and partial/full return. UI tests cover report labels rather than scripting an entire mission.
- Two to three staff, shared base assembly, finite supplies and six handling steps remain execution rules. No configurable quest graph, reward framework or scenario editor is added.
- Keeping all depot constants in the executor would preserve the original coupling. A general mission engine would add complexity without another concrete objective type; neither is needed for these two recovery scenarios.
