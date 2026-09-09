# Expedition Operations

The expedition loop originated in [#22](https://github.com/HanClinto/SimFoundation/issues/22). Scenario definitions and shared execution are separated in schema 48, which discards older development saves without migration.

## Notice And Manifest

Open **Expeditions** in the facility inspector. Two original authored operations are available, not a generated campaign or claims about canonical SCP locations:

| Location        | Travel Each Way | Map / Extraction | Objectives                                        |
| --------------- | --------------- | ---------------- | ------------------------------------------------- |
| Relay Depot 14  | 30 minutes      | 28x24 / 4,12     | Archive and anomalous specimen; one active 049-2  |
| Service Store 3 | 12 minutes      | 16x14 / 2,6      | Three archive cases; no threat or emission source |

Select two or three staff. The manifest displays their existing equipped items; those same personnel records, equipment and personal inventory remain authoritative throughout the journey. Allocate ammunition and medical kits within each responder's current tactical supply. Unallocated supplies remain reserved at the base and are recombined with unspent field supplies after return. Draft/release or repeated travel never replenishes the loadout. The prior tactical system's fixed response weapon is still an abstraction; this slice does not add equipment swapping or derive weapon damage from descriptive paper-doll items.

Lifecycle buttons use immutable previews of the same commands they execute. Team and loadout edits update availability immediately, even while paused. Invalid, blank, fractional or excessive supply amounts remain visible for correction instead of being silently clamped; disabled tooltips explain the constraint. Dispatch, Cancel assembly and Regroup / return likewise report their current phase, assembly, encounter, injury, cargo or route blocker. Submission rechecks current state and reports the actual rejection reason without partially changing the mission.

**Assemble team** enlists staff and issues physical movement to the departure point at 63,63. Ordinary work is interrupted using the existing drafting rules, preserving progress and material reservations. Staff carrying cargo, attending a clinical appointment, or incapacitated cannot be taken out of that commitment. The manifest is locked while the operation exists. **Cancel assembly** releases the roster and restores its previous draft availability without consuming supplies.

## Departure And Field Map

**Dispatch** becomes available when everyone reaches assembly with no pending action recovery. Unstabilized injuries and an active base encounter block departure. Travel time comes from the selected scenario. Departing staff lose their base-map positions and cannot be assigned base jobs or contribute base sight. Site 828 continues advancing with the staff who remain. Needs and effects advance once per shared tick, including transit.

On arrival, **Open field map** opens a second modeless map window named for the location. The base map stays available independently. Both scenarios use the same tile/surface records, doors, pathfinding, combat, observation, and exposure rules. Each has separate world state, objects, knowledge and tactical state, with its own marked extraction point.

The operation desk is World-state inspection and mission management. The field map independently supports World and Recorded perspectives, with unknown tiles and remembered sightings in Recorded. **Control on Map** selects and centers the chosen responder without issuing work or clearing pending actions. It preserves the map's Follow setting and refuses control while the map is Recorded or in placement. Personal orders use the field map's queue policy; assembly, dispatch and recall remain team-level operations. The desk is not fog-limited mission reporting yet. Field doors are edited on the field map and cannot change same-coordinate doors in Site 828.

Double-clicking personnel opens their dossier. Objects, sources, tiles, doors and 049-2 open a selection-specific Field Record with location, condition and relevant properties; only the explicit Response button routes to Expedition Operations. Field Records retain their perspective and expedition identity, and become unavailable when that temporary location closes.

## Encounter And Recovery

The following encounter and specimen details apply to Relay Depot 14. Service Store 3 instead contains three archive cases, without an adversary or emission source; it uses the same physical recovery actions.

One already-provoked 049-2 occupies the records store. The existing [tactical rules](tactical-response.md) apply, including preparation, recovery, finite ammunition, line of sight, injury and stabilization. Unlike the standalone sandbox, merely remaining outside its response radius does not end the field operation; extraction controls the mission lifecycle. The existing pursuit boundary remains a first-slice limitation.

When no responder is visible and no last sighting remains, 049-2 patrols reachable waypoints around its origin. It moves at its normal one-tile-per-two-steps cadence and can open automatic doors. Patrol direction is deterministic and does not depend on hidden staff positions. Sightings override patrol; adjacent attacks require clear reach, including through doorways. Held-closed doors still block it. Selecting 049-2 shows its behavior and pause state; its Field Record explains detection, pursuit and action timing. Patrol is a game-specific behavior for this already-provoked instance, not a claim that all canonical 049-2 instances roam continuously.

For a straightforward approach, move responders to the office side of the inner door around 16,10 and 16,11. Select the door at 17,10 on the field map and change its policy if needed. Positioning matters: a responder behind the neighboring wall will not fire through it. **Engage From Here** holds position; **Attack** includes physical approach to a firing position.

Two physical objects are present: an archive case and a portable anomalous specimen. Select a responder on the field map, choose the cargo, then **Recover to Extraction**. When the queued intention starts, it reserves the object, approaches its tile, spends six handling steps, picks it up, and carries it to extraction. It does not instantly become base inventory. A responder cannot simultaneously perform another field order while committed to recovery; pending intentions wait without reserving their targets. A blocked route retains the order and displays its cause. The current action tile's cancel control releases the object and puts carried cargo down at the carrier's actual position, not its origin; pending work then advances. Expedition Operations retains recovery reporting, not a second set of personal recovery commands.

The specimen is an original low-intensity corrosion emitter: dose 0.2, radius 1. Its source stays attached while it is carried and after it returns. Recovery does not suppress it. Once at the base, the specimen can be moved and placed inside an appropriate containment vessel through existing object/vessel workflows. The archive is an inspectable physical recovery item, not an invented research-unlock button. Living 049-2 restraint/capture, live captive transport, and reanimation are not implemented.

## Regroup And Return

**Regroup / return** orders the whole team to extraction. In-progress cargo recovery must finish or be cancelled first. Incapacitated or deteriorating staff require stabilization before recall. If someone becomes unstable during regrouping, the operation returns to field control so the team can help them and try recall again. Stabilized casualties retain the existing delay before they can move; no one is silently left behind.

When every responder is physically at extraction, stable and out of action recovery, the inbound trip begins and takes the scenario's travel time. If the home arrival tile is blocked, arrival waits rather than placing staff in a wall. If recovered emission sources cannot fit the base's source registry, the transfer also waits and reports the limitation. Clear the relevant condition to allow completion.

Arrival restores each member's base position once, retains injuries/effects, equipment, spent ammunition and consumed medical kits, and deposits manifested cargo at the arrival point. The specimen's attached source transfers with its identity. Staff previously drafted or returning injured remain drafted for review; others return to ordinary scheduling. A return report lists the people and objects recovered. Only returning every declared objective object resolves the notice. Partial and empty-handed returns make it available again; reporting uses the same identity-based completion rule.

The temporary site's state is removed from the save only after the transfer succeeds. The field window closes. Unrecovered field items are not copied home. A later retry generates a fresh operation identity, not a duplicate object identity. Current history is bounded to 20 return reports.

## Scope And Remaining Work

Two authored notices and one active expedition at a time. No mission deadlines, notification generator, strategic map, fuel, animated vehicles, expedition food supply, selectable physical weapon inventory, staff death/abandonment, living captive transport, or simultaneous field teams. Current combat incapacitates rather than permanently kills personnel, so return accounting requires the entire enlisted team to be recoverable. If all available help and medical kits are exhausted, this development slice has no rescue reinforcement or free-healing command.

`expedition-site.ts` declares each scenario's map factory, objective IDs, extraction, travel time and optional encounter position. Shared execution, progress, rendering and save validation consume that definition. The service store is also a headless integration scenario for physical recovery, cancellation, reload, partial/full return and one-time transfer. A broader mission catalog, casualty evacuation, and living restraint/capture remain independent extensions, not a general quest engine hidden behind these definitions.
