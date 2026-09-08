# Expedition Operations

Implemented first expedition loop, tracked in [#22](https://github.com/HanClinto/SimFoundation/issues/22). Save schema 38 requires a fresh development site.

## Notice And Manifest

Open **Expeditions** in the facility inspector. The initial notice reports unscheduled activity at Relay Depot 14 and requests recovery of a sealed archive. It is an original authored side operation, not a generated campaign or a claim about a canonical SCP location.

Select two or three staff. The manifest displays their existing equipped items; those same personnel records, equipment and personal inventory remain authoritative throughout the journey. Allocate ammunition and medical kits within each responder's current tactical supply. Unallocated supplies remain reserved at the base and are recombined with unspent field supplies after return. Draft/release or repeated travel never replenishes the loadout. The prior tactical system's fixed response weapon is still an abstraction; this slice does not add equipment swapping or derive weapon damage from descriptive paper-doll items.

**Assemble team** enlists staff and issues physical movement to the departure point at 63,63. Ordinary work is interrupted using the existing drafting rules, preserving progress and material reservations. Staff carrying cargo, attending a clinical appointment, or incapacitated cannot be taken out of that commitment. The manifest is locked while the operation exists. **Cancel assembly** releases the roster and restores its previous draft availability without consuming supplies.

## Departure And Field Map

**Dispatch** becomes available when everyone reaches assembly with no pending action recovery. Unstabilized injuries and an active base encounter block departure. The outbound trip takes 30 simulation minutes. Departing staff lose their base-map positions and cannot be assigned base jobs or contribute base sight. Site 828 continues advancing with the staff who remain. Needs and effects advance once per shared tick, including transit.

On arrival, **Open field map** opens a second modeless map window for the 28x24 depot. The base map stays available independently. The depot uses the same tile/surface records, doors, pathfinding, combat, observation, and exposure rules. It has separate world state, objects, knowledge and tactical state. The extraction point is marked at 4,12.

The operation desk is World-state inspection. The field map independently supports World and Recorded perspectives, with unknown tiles and remembered sightings in Recorded. Orders from the operation desk intentionally act on field World state; it is not a fog-limited mission-selection game yet. Field doors are edited on the field map and cannot change same-coordinate doors in Site 828.

Double-clicking personnel opens their dossier. Objects, sources, tiles, doors and 049-2 open a selection-specific Field Record with location, condition and relevant properties; only the explicit Orders button routes to Expedition Operations. Field Records retain their perspective and expedition identity, and become unavailable when that temporary location closes.

## Encounter And Recovery

One already-provoked 049-2 occupies the records store. The existing [tactical rules](tactical-response.md) apply, including preparation, recovery, finite ammunition, line of sight, injury and stabilization. Unlike the standalone sandbox, merely remaining outside its response radius does not end the field operation; extraction controls the mission lifecycle. The existing pursuit boundary remains a first-slice limitation.

When no responder is visible and no last sighting remains, 049-2 patrols reachable waypoints around its origin. It moves at its normal one-tile-per-two-steps cadence and can open automatic doors. Patrol direction is deterministic and does not depend on hidden staff positions. Sightings override patrol; adjacent attacks require clear reach, including through doorways. Held-closed doors still block it. Selecting 049-2 shows its behavior and pause state; its Field Record explains detection, pursuit and action timing. Patrol is a game-specific behavior for this already-provoked instance, not a claim that all canonical 049-2 instances roam continuously.

For a straightforward approach, move responders to the office side of the inner door around 16,10 and 16,11. Select the door at 17,10 on the field map and change its policy if needed. Positioning matters: a responder behind the neighboring wall will not fire through it. Engage holds position rather than automatically advancing on a target. Use additional movement orders to establish another firing line.

Two physical objects are present: an archive case and a portable anomalous specimen. **Secure / recover** reserves the selected object for one responder, approaches its tile, spends six handling steps, picks it up, and carries it to extraction. It does not instantly become base inventory. A responder cannot simultaneously perform another field order while committed to recovery. A blocked route retains the order and displays its cause. **Cancel recovery / put down** releases the object; carried cargo is put down at the carrier's actual position, not teleported back to its origin.

The specimen is an original low-intensity corrosion emitter: dose 0.2, radius 1. Its source stays attached while it is carried and after it returns. Recovery does not suppress it. Once at the base, the specimen can be moved and placed inside an appropriate containment vessel through existing object/vessel workflows. The archive is an inspectable physical recovery item, not an invented research-unlock button. Living 049-2 restraint/capture, live captive transport, and reanimation are not implemented.

## Regroup And Return

**Regroup / return** orders the whole team to extraction. In-progress cargo recovery must finish or be cancelled first. Incapacitated or deteriorating staff require stabilization before recall. If someone becomes unstable during regrouping, the operation returns to field control so the team can help them and try recall again. Stabilized casualties retain the existing delay before they can move; no one is silently left behind.

When every responder is physically at extraction, stable and out of action recovery, the inbound trip begins and takes 30 minutes. If the home arrival tile is blocked, arrival waits rather than placing staff in a wall. If recovered emission sources cannot fit the base's source registry, the transfer also waits and reports the limitation. Clear the relevant condition to allow completion.

Arrival restores each member's base position once, retains injuries/effects, equipment, spent ammunition and consumed medical kits, and deposits manifested cargo at the arrival point. The specimen's attached source transfers with its identity. Staff previously drafted or returning injured remain drafted for review; others return to ordinary scheduling. A return report lists the people and objects recovered. Empty-handed withdrawal makes the notice available again; returning cargo resolves the notice and records whether recovery was partial or complete.

The temporary site's state is removed from the save only after the transfer succeeds. The field window closes. Unrecovered field items are not copied home. A later retry generates a fresh operation identity, not a duplicate object identity. Current history is bounded to 20 return reports.

## Scope And Remaining Work

One authored notice and one active expedition at a time. No mission deadlines, notification generator, strategic map, fuel, animated vehicles, expedition food supply, selectable physical weapon inventory, staff death/abandonment, living captive transport, or simultaneous field teams. Current combat incapacitates rather than permanently kills personnel, so return accounting requires the entire enlisted team to be recoverable. If all available help and medical kits are exhausted, this development slice has no rescue reinforcement or free-healing command.

Future missions can build on the location/identity transfer boundary, but map generation and objective validation remain specific to this first depot. A broader mission catalog, casualty evacuation, and living restraint/capture should be independent validated extensions, not claims implied by this first implementation.
