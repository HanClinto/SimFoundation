# Expedition Location Ownership

Status: implemented 2026-09-07. Tracking: #22. Schema 38.

## Context

The current base simulation owns one world, a global personnel roster, physical objects, observation memory and tactical responders. Expeditions need a genuinely separate location without duplicating staff or pausing the home facility. Existing fixed base inventory ledgers must not be repurposed as unlimited field loot counters.

## Decision

- Keep global personnel records authoritative, including equipment, inventory, effects and needs. An active expedition lists its roster but does not hold cloned personnel records.
- Store a temporary site's world, physical objects, observations, combat and environment beneath the active expedition. Construct an ephemeral GameState view to run existing tactical/observation/exposure functions, and write back only the owned field records and changed personnel.
- Remove away staff from base positions and base tactical responders. Advance the base with only resident personnel, then merge global identity records and advance the expedition on the same tick. Away needs/effects advance once, not once per visible map.
- Use explicit expedition-ID commands for field actions. Reject stale commands, base tactical commands for enlisted staff, and competing cargo/tactical ownership. UI focus never chooses the simulation target implicitly.
- Allocate tactical supplies at dispatch, keep unused reserves separately, and recombine only on successful return. Equipment remains the same global record; no duplicated item instances are manufactured by map travel.
- Recover original cargo objects through exclusive handling/carry orders. Transfer only manifested physical objects and their attached sources. Preserve existing base material/meal conservation: recovered archive/specimen kinds are not added to those ledgers.
- Retain the temporary map during transit and field work. Dispose of it after a successful return transfer, never while staff or manifested cargo still depend on it. Store a bounded return manifest instead of archiving the entire map indefinitely.
- Reuse the existing map renderer in a second modeless window. All map canvases share dimension-constrained CSS; canvas rules may not rely on a single element ID. Rendering and field view projection never autosave a projected state.

## Validation

Validate the roster partition, missing base positions, field bounds/topology/door policies, observation bounds and timestamps, tactical phases and supplies, return positions, reserved loadouts, unique object identities, recovery orders, cargo physically at extraction, and transfer history. Save/replay tests cover assembly, both travel legs, field combat, carrying, cancellation, blocked arrival and cleanup. No nested expedition state is serialized inside a field site.

## Consequences And Alternatives

This avoids duplicating the full base simulation or pretending the field is a rectangular region on the base map. It also avoids a broad multi-site refactor before the first round trip is proven. The current field projection deliberately excludes routine construction, economic ledgers, cameras, and base-only work. Future field construction or simultaneous missions will require extending those ownership contracts, not simply enabling base commands on the projected state.

The first encounter's bounded pursuit, no permanent death and two/three-person team restriction remain visible design limits. Portable anomalous-object recovery is implemented; living captive transfer and casualty evacuation are distinct future state models.
