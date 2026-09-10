# Observed Concerns And Response

## Context

The user asked whether urgency could describe something that needs doing because of an observed cause, and requested an end-to-end scenario with a threat, injured person, medic, civilian researcher and soldier. Acceptance is that autonomous responses emerge within roughly 10-50 ticks, not a fixed sequence of routes or orders.

## Decision

Use cause -> concern (with urgency) -> role/capability-informed action. Threat and care discovery live in separate small modules; the coordinator selects without containing their detailed rules. Concerns are derived observations, not new need bars or a duplicated global registry. They precede ordinary needs as a separate group, preserving the generic positive-urgency needs selector.

Introduce optional health and response data on ordinary pawns. Health tracks actual wounds and blood loss; physiology advances once in sites, while carried, or in transit. Response data controls faction hostility, sight, confrontation/withdrawal and medical/attack capabilities. Core does not name Soldier, Medic or Researcher. No drafting prerequisite or Social/Fear/Sanity bar is introduced.

Attack, Flee and Treat use shared movement/interaction rules. Attack has close-range windup and real injury effects. Treat uses finite medical charges to stop bleeding, not erase damage. Flee locally increases distance from currently visible threats. Perception respects sight range, walls and closed doors using existing pathfinding line utilities; no global target knowledge or last-known tracking.

Concerns may interrupt self-chosen routine activities, movement and waiting. Explicit commands and autonomy-off remain respected. Immediate danger may interrupt self-chosen treatment without spending supplies; explicit treatment blocks. Interrupted facility use releases through queue removal without a second reservation system. Full safety/command override policy is intentionally deferred.

## Acceptance And Limits

ThreatAndCasualty.json instantiates five catalog-backed actors through the ordinary site loader. A 40-tick test checks actual attack events/injury, civilian withdrawal and medic stabilization/supply use, with replay and insertion-order checks. Boundary tests cover hidden causes, routine interruption, duplicate medical work, threat counterattack and transit bleeding.

This is not full combat, medicine, emotional health, equipment, or tactical AI. Flee can fail in corners, threat awareness has no hearing/memory, injury thresholds are provisional, and stabilization does not cure incapacitation. The guard is intentionally stationary but can attack adjacent opponents. No trigger script makes the test outcomes happen. Browser and legacy code are unchanged. Core save version 7 discards incompatible saves with no migration or deep validator.
