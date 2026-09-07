# Physical Electrical Utilities

Status: implemented, 2026-09-06. Tracking: #20.

## Context

The facility already has physical objects, material-funded work, autonomous hauling, observation-limited records, and cosmetic activity feedback. Power must provide a recoverable physical loop rather than a new set of disconnected counters or instant construction controls.

## Decision

- Represent generator, cable, and light equipment as finite physical objects. Reuse object hauling and engineering installation.
- Give installed cable a separate underfloor occupancy layer, with no new vertical simulation or ceiling construction.
- Derive connected components, capacity, demand, overload and illumination instead of saving redundant graph state.
- Require actual power for cameras and lights. Keep personnel sight independent of light until tactical sensing is explicitly designed.
- Use one deterministic connection for cameras touching multiple terminals; cameras do not bridge circuits.
- Reuse the existing material collection/delivery/engineering repair pipeline, retaining its serialized owner for compatibility with the code's current structure. Electrical service kits cost eight materials; other vessel actions remain vessel-specific.
- Damage equipment through existing exposure sources. Do not add random failures or automatic emergency pauses.
- Preserve separate World truth and Recorded memory. Unknown circuit state is not approximated as live truth.

## Consequences

Schema 36 requires a fresh development save. Existing materials remain conserved. A newly installed light can overload a circuit, and a damaged cable can remove coverage before staff observe the underlying failure. Service can be restored by rerouting equipment, shedding demand, or delivering repairs. Geometry, controls, sources, and save/load can be tested headlessly.

The first generator is a constant-capacity abstraction: fuel, replenishment, storage batteries, switching delays, breaker operations, and automated backup remain deferred. Eight-material repairs are provisional balance. Ordinary display visibility in unlit areas is not evidence of an emergency lighting system.

## Alternatives

Separate utility tiles would duplicate object hauling and reservations. Instant cable brushes would bypass physical work. Full electrical load flow or fuel logistics would obscure the first testable loop. A second repair job system would duplicate existing delivery, cancellation and conservation logic; the existing pipeline may later move to a generically named owner as further repairable equipment justifies that refactor.
