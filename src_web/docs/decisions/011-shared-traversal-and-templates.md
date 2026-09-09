# Shared Traversal And Entity Templates

## Context

Movement checked pawns while A\* checked only terrain and doors. Other ground objects could not obstruct either consistently. Take and food discovery routed to a target's tile, which would become unreachable when that target blocked movement. The generic Definition module also mixed named model defaults with site placement and instance construction.

## Decision

Use EntityTemplate for the core contract describing a named model. Catalog entries satisfy it without core importing catalog. EntityPlacement and instance construction belong with site loading; no catch-all Definition module remains. Material definitions remain independent.

Every entity declares blocking/nonblocking ground occupancy. One shared tile traversal query combines terrain and all ground entities, excludes the moving actor and carried contents, and identifies a closed automatic door as an opening prerequisite. Any additional obstruction overrides that prerequisite. Door state governs door passage; it is not inferred solely from the static flag.

A\* and actual movement both use this query. Planning may include opening an automatic door, while execution must perform that step before entering. Current blocking pawns and objects are routed around; a blocked route waits for another tick. Transfer arrival uses the same query but requires clear passage, without remotely opening doors.

Approach routing targets a reachable position on or cardinally adjacent to the target tile, not the target's occupied tile unconditionally. Take, Eat and food discovery share it. Movement orders may name currently occupied floor because the order is an intention, not a reservation or a guaranteed route.

## Limits And Follow-Up

One-tile footprints and blocking/nonblocking occupancy are sufficient for now. Crossing-only occupancy would require explicit overlap, interruption and cancellation semantics and is deferred. Paths are rechecked against live sequential state; no traffic fairness, reservations, or simultaneous resolution is introduced.

Generic need discovery should eventually use actor-specific interaction offers. Implement a second real need action before extracting common offer/search machinery; do not build Provider/Consumer inheritance or duplicate material-based food classification now.

Snapshot version 3 discards states without explicit obstruction, with no migration or deep save validator. The legacy engine/browser remain untouched. Acceptance tests cover item detours, dynamic blockage, blocking target approach/consumption, door-plus-object precedence and blocked transfer arrival released by an actual pickup.
