# Tactical Response

Implemented first encounter, tracked in [#21](https://github.com/HanClinto/SimFoundation/issues/21), with direct map interactions from [#23](https://github.com/HanClinto/SimFoundation/issues/23). Save schema 40 requires a fresh development site.

## Orders

Tactical Response provides Draft, Release, Move, Hold, Retreat, Engage 049-2, and Stabilize. Selected staff also expose Orders in inline map selection. This slice uses the existing pause and simulation speeds, not a separate combat clock. Normal speed is recommended while learning action cadence. One combat step is one existing simulation tick; the facility clock still advances a minute per tick. This is provisional tactical pacing, not a physical claim about weapon timing.

Drafting interrupts ordinary work without discarding progress or material reservations. Cargo carriers and active clinical participants must finish their handoff or appointment first. Drafted and incapacitated staff do not take routine jobs, move autonomously, or participate in SCP-999 contact. Release is blocked during action recovery, an active encounter, or unstabilized injury. Released staff resume normal scheduling with persistent injuries intact.

## First Encounter

1. Select Caleb and Lena (optionally Priya), draft them, and issue Move orders to nearby positions around 68,55 inside containment. Each Move opens a map preview; pin a position and Confirm. Travel and doors remain physical.
2. Once the team is staged, Place 049-2 creates one already-provoked sandbox instance at the default 72,55 or another valid floor tile. Nothing is spawned in an ordinary new site. Two or three drafted responders are required.
3. Issue Engage separately to responders who should cover the target. Hold does not attack automatically. Select a responder on the map to see their range and line of sight.
4. Withdraw to 60,55 and nearby tiles beyond the response boundary, or neutralize the instance and assist injured colleagues. Release responders when it is safe to resume routine work.

## Action Rules

The map's **Attack** order includes physical approach to a reachable firing position. Select the actor's portrait, click the adversary, and choose Attack. **Engage From Here** is a separate stationary order; the older inspector Engage controls retain that stationary behavior. Attack uses current target position and geometry, passes through real automatic doors, and waits with a visible reason if no firing position is reachable. It does not spend ammunition while approaching. Losing line of sight resets preparation; recovery cannot be skipped and Attack waits for it before further approach. Neutralization completes Attack into drafted Hold without erasing the last shot's recovery. The current-action strip can cancel Attack safely. Position choice is shortest reachable firing route, not cover-seeking or automatic withdrawal.

Layers > Tactical shows the selected drafted responder's five-tile range, clear versus blocked line of sight, destination lines, health, and yellow preparation / blue recovery bars. Response fire has three preparation steps and three recovery steps, consumes one of 12 initial rounds, and applies 24 damage against the 120-integrity test instance. Range and sight are rechecked on resolution; changing orders or losing sight interrupts preparation. New orders cannot erase recovery, although movement during recovery is allowed.

Each responder has two stabilization kits. Ammunition and kits persist across draft/release and subsequent encounters; replenishment and a general weapon inventory are not implemented. The fixed response loadout is a tactical equipment abstraction, not a newly spawned physical supply stack or an inferred property of the existing paper-doll equipment.

The instance moves every second simulation tick, detects participants within six tiles, remembers its last sighting, and prepares an adjacent action for three steps before a four-step recovery. It does not know unseen current positions. Its action applies 35 functional damage; untreated injuries deteriorate by one per step until incapacitation. It targets only the enrolled response team and stays within ten tiles of its origin. These are sandbox restrictions, not general hostile AI or canonical anomalous limits.

## Casualty Response

At zero functional health, a responder is incapacitated and cannot move, work, or provide sight. A Stabilize order physically approaches a reachable treatment position on the same or a cardinally adjacent tile, then completes six preparation steps, consuming one kit. Travel consumes no kit. Range and sight are checked throughout, and a blocked route retains the order with a reason. Stabilization stops deterioration; an incapacitated responder requires a further 12 recovery steps before they can withdraw at 25 functional health.

Stabilization is not full healing. A persistent tactical-trauma effect remains assessable through the clinical system; tactical status is not automatically a clinical diagnosis. This slice does not implement permanent staff death, automatic treatment, or casualty carrying. Additional staff can be drafted to assist incapacitated participants. If no one has usable supplies, recovery requires restarting the development scenario; no free resupply button is provided.

## Withdrawal And Records

Move every participant outside the ten-tile boundary for eight consecutive steps to complete a withdrawal. The encounter suspends with the instance left in the area. Neutralization is the other terminal result. A later sandbox placement replaces the previous encounter, not the responders' injuries or supplies.

Schema 37 persists orders, ammunition, kits, injury/recovery state, adversary target memory, events and action phases. World shows authoritative tactical state. Recorded shows only last-observed adversary state and disables tactical editing; live responder health, targeting calculations and combat events are withheld. Incapacitated personnel are not observation sources.

## Source And Scope

See [SCP-049 adaptation notes](references/scp-049/adaptation.md). Full SCP-049, reanimation, SCP-076, friendly fire, detailed cover, equipment logistics and multiple adversaries are excluded. The first encounter tests positional orders, timing, obstruction, withdrawal and stabilization without pretending those broader systems are complete.
