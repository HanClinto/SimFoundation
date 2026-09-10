# Resilience And Playable Quest Harness

## Context

A review reproduced indefinite missing-target waits, whole-meal waste for tiny hunger deficits, and facility ownership held by incapacitated pawns. The user approved a stabilization pass, longer integration tests, benchmarking, and an ASCII command-line surface. Authored quest success/failure should serve both gameplay and integration tests.

## Decision

Distinguish completed, blocked, failed and interrupted actions. Missing targets fail visibly, incapacity interrupts, and self-chosen actions abandon eight consecutive blocked ticks. Explicit temporary blocks retain their targets. Facility occupancy excludes incapable/carried users. Eating consumes only the nutritional amount needed, retaining fractional stock. Self-chosen restorative sessions may finish once their applicable deficits are satisfied; explicit sessions and research preserve durations.

Add a small declarative observational quest evaluator under simulation/core/quest, with named catalog trials. It evaluates events and state after each tick, persists event counts and final outcomes, prefers failure over simultaneous success, and handles deadlines. No conditions dispatch commands or own sites. Application ScenarioSession composes authored site creation, simulation stepping and quest evaluation. CLI and tests share that session.

The ASCII console shows terrain beside entity tokens, with a legend and explicit stacked-occupant marker. Inspection shows actual entity state and current decision candidates; commands use the ordinary player boundary. Save/load preserves simulation and quest progress. Batch exit codes make the same console usable by scripts. Existing browser/legacy paths are untouched.

## Verification And Limits

Response and daily-life quests verify outcomes instead of fixed action sequences. A 12-pawn 42x26 colony with finite food/shared facilities treats an injured worker, runs past 1000 ticks, recovers after removal of an active research target and blockage of one passage, and replays from a saved checkpoint. A failed early condition requiring every food pile to retain stock was replaced with total stock: location preference is not an economy failure.

Measured route-query occupancy indexing reduced the short local benchmark from roughly 25.5 ms average tick to 6.0 ms. It is transient, not a persistent cache. Broader path reuse, traffic coordination and global escape routing are deferred. Current action failures are not a complete taxonomy of every action-specific invalidity, and self-chosen blocked work may rediscover the same option.

Quest references initially attach to one site and use local authored entity IDs. Branches, rewards and cross-site conditions remain future work. Saves use root/version checks only (core v9, session v1 plus core version), no migrations or deep validators. Tests retain focused safety checks alongside quest-level acceptance; this is not a mandate to encode every unit assertion as gameplay.
