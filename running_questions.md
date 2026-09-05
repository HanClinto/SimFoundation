# Morning Review

Nonblocking questions and provisional choices from the unattended development run. These do not require an immediate response.

## Questions

1. **Starting supplies:** I will start with a finite pantry and show shortages explicitly. Should ongoing resupply primarily come from funding/purchases, deliveries, or on-site food production?
2. **Schedule defaults:** I will use work, sleep, and free-time blocks with urgent hunger/exhaustion allowed to interrupt routine work. Should night shifts initially be selected manually or suggested by the staffing UI?
3. **Observation limits:** I will treat walls as sight blockers, open doors as transparent, and cameras as local coverage rather than omniscient tracking. Directional cameras, radio delays, and unusual senses can follow later.
4. **Clinical consent:** Referrals currently reserve an available patient automatically. Refusal, emergency care, and who may override refusal remain design work; the prototype should not imply that a schedule guarantees consent.

## Working Decisions

- Keep original isometric/reference-book art; identify staff with portrait plus caption where space permits.
- Preserve generic role assignment separately from procedure qualification and current availability.
- Prioritize an operational, recoverable needs loop over adding broad combat or anomaly content prematurely.
- No paid services, branch creation, or changes to unrelated editor settings. Publish independently validated checkpoints to main.

## Handoff Status

- Published `6d00402`: consistent original subsystem icons and pawn portrait/caption identities.
- Completed daily-routine checkpoint: physical meals, sleep and breaks; hourly schedules; finite pantry/store logistics; Day Planner. A two-day headless scenario sustains routine needs and passes deterministic save continuation. Browser checks verified schedule edits, physical meal arrival, food consumption, and seat-contention reporting. Full validation passes 89 tests.
- Completed observation-memory checkpoint: local awake-personnel/camera sight, wall occlusion, remembered terrain and sightings, physical camera installation, Surveillance inspector, and frozen unseen SCP-999 records. Browser fixture verified that an unseen anomaly's changed location and state remain hidden. Current sensing assumes functioning personnel communications and omnidirectional cameras; power, radio failures, and directional lenses are not modeled.
- Completed local-social slice: SCP-999 uses visible nearby encounters and outward distress rather than global hidden Stress, with immediate contact effects. Reserved and masking expression examples can differ from true psychological condition. Exact behavioral parameters remain provisional; dedicated SCP-999 feeding, enclosure, and boredom routines remain pending.
- Still pending: the authored material-containment scenario and its investigation/archive presentation. These are not implied complete by the needs-loop or surveillance work.

A question here is not a claim that the corresponding feature has already been implemented.
