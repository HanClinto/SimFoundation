# Bounded Tactical Response

Status: implemented 2026-09-07. Tracking: #21.

## Decision

Build the first encounter on the existing deterministic simulation tick, pathfinding, doors and observations. Store explicit tactical orders, action phases and casualty states rather than infer them from UI activity strings. Start with one optional, already-provoked 049-2 and a roster of two or three responders.

Drafting transfers movement ownership away from routines/jobs while preserving unfinished work and physical reservations. Cargo and clinical commitments cannot be interrupted by this first command. Movement and withdrawal remain player-directed; Engage holds position rather than pursuing automatically. Loss of range or sight resets preparation; recovery is retained across new orders. Stabilization consumes a finite kit and requires proximity throughout.

The current clock's minute-per-tick convention is retained for compatibility; action steps are coarse tactical pacing, not realistic weapon timings. Supplies are a fixed loadout abstraction with no replenishment. Injuries persist and can be assessed by the existing clinical system. No permanent personnel death is introduced.

## Boundaries

Only enrolled responders are adversary targets. The instance is leashed to a ten-tile sandbox region and suspends after withdrawal. These are deliberate test boundaries, not canonical powers or containment guarantees. An unrestricted breach requires broader civilian response, damage, and casualty ownership rules. The source revision and original adaptation choices are recorded separately.

World provides exact tactical inspection; Recorded never computes hidden live target positions or response state. Equipment, traits and clinical records do not magically supply tactical statistics. Injury effects bridge into clinical assessment, but functional combat health and clinical health estimates remain distinct concepts.

## Alternatives

A separate real-time combat clock would complicate physical work and replay. Full weapon inventories, squad formation, cover physics and many adversaries would obscure whether basic orders and timing are usable. Immediate health restoration would remove the rescue/withdrawal decision. A bespoke SCP-049 or SCP-076 boss implementation would put anomaly exceptions ahead of reusable positional mechanics.
