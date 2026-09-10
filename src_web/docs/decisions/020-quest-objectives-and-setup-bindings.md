# Quest Objectives And Setup Bindings

## Decision

The user identified that naming Daniel directly in Consumption's objective conditions coupled reusable rules to one concrete setup. Objective references should name roles; setup chooses the entities that fill them. Personal names remain useful for readable CLI commands, but must not determine who is eligible to satisfy a reusable quest.

Consumption now uses `diner` and `meal` references. Its authored playable setup binds those roles to local entity IDs. Scenario loading resolves the IDs and passes bindings through the existing `startQuest` interface. Both state and event checks already resolve these bindings; the evaluator needs no new condition type or scenario-specific branch. Alternate callers supply their own actual entity IDs, without editing the quest or importing the default setup.

The default setup still includes Daniel, his starting needs and a two-portion meal. Those are playable scenario data, not success criteria or an automatically executed answer. Test-only command transcripts stay colocated under `tests/`. Fixed authored targets in other quests retain local-ID lookup; this change does not introduce a new quest language or refactor unrelated scenarios.

Session version 3 discards earlier saves without migration because existing Consumption progress lacks the new role bindings. Core simulation snapshots remain unchanged.

## Verification

The original consumption walkthroughs and save/replay checks still pass. An independently authored researcher named Alex and a differently named lunch satisfy the unchanged quest; incapacitation triggers the same failure condition. Tests verify setup binding resolution and rejection of old session saves.
