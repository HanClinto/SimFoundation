# Proposed First Tactical Slice

Status: design proposal, not implemented or a canonical anomaly adaptation.

## Recommendation

Proceed toward small pause-based tactical encounters after the electrical slice. Do not wait for a complete economy, utilities simulation, expedition campaign, or full anomaly roster. First add the small set of reusable rules needed for meaningful positioning and recoverable consequences.

1. Draft and release individual staff or a small group. Give move, hold, retreat, and interact orders with reachable destination previews. Preserve autonomous reservations and carried inventory when entering or leaving drafted control.
2. Show line of sight, obstruction, range and action preparation. Keep a single shared simulation clock with pause and existing speeds. Long windups and recovery windows should make repositioning useful rather than rewarding rapid clicks.
3. Add explicit targetability, injury, incapacitation, stabilization and recovery states. Do not infer these from mood, activity strings, or a generic condition percentage. Direct and environmental effects should use the same typed effect/resistance rules.
4. Test one bounded encounter with two or three responders, doors, a short approach, a retreat route, and one adversary. Include no-damage withdrawal, successful containment, responder incapacitation, and save/reload during an action.

## Anomaly Selection

An isolated SCP-049-2 encounter is the strongest initial candidate from the user's suggestions. It offers a limited adversary while letting door control, spacing, protection of a colleague, and retreat carry the tactics. Implementing SCP-049 itself also requires contact rules, disposition, restraint, and reanimation consequences, so it should not be bundled into the first encounter.

Do not encode SCP-049 as universally indestructible based on a gameplay assumption. Pin and review a specific source revision before defining durability or terminal states. Likewise, an SCP-049-2 adaptation should not automatically exclude containment or immobilization just because damage-based outcomes are possible.

SCP-076 is better as a later stress test for pursuit, destructive traversal, extraordinary resilience and recovery, and layered containment. Introducing it before basic orders, target states, and environment interactions are reliable risks replacing reusable rules with exception-heavy scripting.

A non-anomalous training automaton is a useful initial engineering fixture for the same tactical rules, not a new campaign objective. It lets the interaction model be tested before lore-specific behavior. A perception-dependent anomaly such as SCP-173 would exercise a different game centered on observation and coordination; it is not a substitute for testing ordinary engagement mechanics.

## What Makes It Tactical

- Position and timing matter: restricted firing lanes, blocked sight, action windup, recovery, and withdrawal.
- Information is legible: known range, visible preparation, current versus stale target positions, and the reason an action cannot proceed.
- Objectives extend beyond defeating every target: protect someone, close a barrier, escort, contain, or withdraw.
- Environmental methods emerge from shared simulation rules rather than a list of named anomaly-specific solutions. New hazards need inspectable effects and resistance rules before they become encounter mechanics.
- Powers have explicit immunity and susceptibility data, not names recognized by the damage function. Avoid a universal death handler for entities whose source behavior requires a different terminal or recovery state.

## Deferred

No combat rules, weapons, health changes, adversaries, or SCP adaptations are added by the electrical implementation. Cover quality, ammunition logistics, squad formations, friendly fire, advanced medicine, and multiple damage sources should follow the first playable order-and-response loop, not all precede it. Canonical references must be verified and attributed before authored runtime content is introduced.
