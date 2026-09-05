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

### Published Checkpoints

| Commit    | Result                                                                                       |
| --------- | -------------------------------------------------------------------------------------------- |
| `6d00402` | Consistent original subsystem icons and distinct pawn portraits with captions                |
| `9d79e18` | Needs-driven meals, sleep, breaks, hourly schedules, pantry hauling, and Day Planner         |
| `69c66c8` | Local sight, remembered facility observations, camera installation, and Surveillance         |
| `1d66263` | Local SCP-999 encounters, immediate contact effects, and reserved/masking expressions        |
| `62081d1` | Original AN-001 material trial, observable failure, repair, and illustrated evidence archive |
| `5c73616` | Independent Construction inspector coordinated with Camera Feed                              |
| `337bcdd` | Exact-tick incident auto-pause and full-day integrated replay                                |

The final validation checkpoint adds exact-tick Orange/Red auto-pause, safe manual resume, and a full-day integrated replay. The required pipeline passes 111 tests across 26 files, strict typechecking, formatting, production build, and deployment verification. Browser checks covered the principal controls, asset rendering, hidden-state presentation, trial failure/repair, and exact pause/resume behavior. No claim of a completed 6-8-hour background process is implied; work runs only while the active agent session is executing.

Hosted CI exposed a timeout in the intentional two-day replay: 7.6 seconds on the runner exceeded the default five-second limit, although its assertions passed locally. That long-run test now has an explicit 20-second budget, matching its integration-test scope. Ordinary unit-test timeouts are unchanged.

### Suggested Review

1. Open Day Planner and inspect the schedules and finite meal supply.
2. Open Surveillance, disable a camera, and compare live coverage with remembered terrain and last sightings.
3. Open AN-001 Study: review Materials, order a barrier kit, and choose a protocol after delivery and fitting. Protective isolation is enabled by default. Primary failure opens the room wall; secondary lining provides limited response time and can also fail. Enable maintenance policy or order a replacement, then inspect both barrier records and Findings. Damage remains localized to this enclosure.
4. Open Occupational Health's Assignments tab to compare portraits, skill, procedure eligibility, and current availability.

### Scope Notes

- Published `6d00402`: consistent original subsystem icons and pawn portrait/caption identities.
- Completed daily-routine checkpoint: physical meals, sleep and breaks; hourly schedules; finite pantry/store logistics; Day Planner. A two-day headless scenario sustains routine needs and passes deterministic save continuation. Browser checks verified schedule edits, physical meal arrival, food consumption, and seat-contention reporting. Full validation passes 89 tests.
- Completed observation-memory checkpoint: local awake-personnel/camera sight, wall occlusion, remembered terrain and sightings, physical camera installation, Surveillance inspector, and frozen unseen SCP-999 records. Browser fixture verified that an unseen anomaly's changed location and state remain hidden. Current sensing assumes functioning personnel communications and omnidirectional cameras; power, radio failures, and directional lenses are not modeled.
- Completed local-social slice: SCP-999 uses visible nearby encounters and outward distress rather than global hidden Stress, with immediate contact effects. Reserved and masking expression examples can differ from true psychological condition. Exact behavioral parameters remain provisional; dedicated SCP-999 feeding, enclosure, and boredom routines remain pending.
- Completed authored experiment: AN-001, the Chalk Knot, has a bench-scale study with concrete/ceramic/composite tradeoffs, passive versus stimulated exposure, optional protective isolation, observed degradation/failure, engineering repair, and a reference-book case file with superseded assumptions. Full validation passes 106 tests. The secondary catch vessel is an authored safety constraint; this does not yet implement free-roaming tactical recontainment or material properties for arbitrary world walls.
- Remaining broad work: facility-scale containment, staffing refusals and breakdowns, formal skill progression, procurement, power, and richer anomaly care. These are not implied complete by the delivered prototypes.
- Construction now has its own coordinated modeless window instead of occupying Camera Feed space. The register owns cancellation and laboratory choice; Plan and Locate actions open/focus the camera.
- Integrated one-day test runs clinical care, routine needs, annex construction, SCP-9620 research/recovery, camera installation, and AN-001 failure/repair together, checking reservations and valid deterministic save checkpoints. Also corrected a pre-existing mismatch: Orange/Red events now actually pause as the UI promised, and browser catch-up stops at the incident tick.

A question here is not a claim that the corresponding feature has already been implemented.
