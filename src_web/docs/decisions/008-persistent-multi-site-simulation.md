# Persistent Multi-Site Simulation

## Status

Direction approved by the user on 2026-09-09; implementation started in [#24](https://github.com/HanClinto/SimFoundation/issues/24). The headless site collection, local-system runner, site-owned queues, scoped application controller and prepared freight/personnel transfers are implemented and tested. Browser/save cutover and convergence of existing transport remain pending. The staged [refactor plan](../multi-site-refactor.md) records contracts, status and acceptance gates. This decision supersedes the temporary-location lifetime and base/field asymmetry in decisions 003 and 007; their descriptions remain historical records of the current browser implementation.

## Context

The game currently owns one fully simulated base and one reduced expedition location. Returning removes the expedition site; another visit reconstructs its initial contents. The user intends to establish containment around immovable anomalies, retain remote facilities, and expand or migrate operations. Those goals require sites to exist independently from visits and quests.

## Decision

Latest user clarification: replace the dedicated SCP-999 slot and singleton adversary with one site-owned entity collection. Pawns are entities with shared action execution, applicable needs and type-specific autonomous intent selection; physical objects need not be pawns. Control permission is independent of behavior and validated headlessly. Remove unsuitable prototypes rather than retaining them as compatibility paths. This generic entity replacement is approved; an elaborate general-purpose ECS framework is not required.

One global simulation owns many persistent sites and one shared clock. Every site owns a tilemap, local systems and responsibility for ticking its currently owned entities. The same local simulation applies regardless of which site the UI calls home. Canonical transferable records have stable identity and exactly one site or transit owner; a global lookup must not introduce a second ticking path.

All sites use the same SiteState type and own their own entities, work/action queues, routines and utilities. Personnel, resident, threat and physical-object lists are derived views, not duplicated authoritative records. Records live in the owning site or, after departure, in a transfer's transit payload; any global identity lookup is derived, not a second authoritative store. There is no reduced remote-site representation. An unstaffed or unequipped site has fewer available actions because of its physical state, not because it is a different kind of site.

Transfers handle physical preparation, transit ownership and validated atomic arrival between arbitrary sites, including raw materials and dependent cargo such as vessel contents. People retain personal state; local jobs and reservations do not silently migrate. Transit advances appropriate condition/needs rules once per global step, without running nonexistent site work.

Sites are instantiated explicitly, retained without an active expedition, and disposed only through an explicit guarded lifecycle command. Quest completion and operation return never imply disposal. Start with conservative disposal that rejects live contents, active work/hazards and unresolved live references; preserve historical provenance independently of live sites.

Expeditions coordinate personnel and transfers. Quests observe cross-site conditions and durable accomplishments; they do not implement parallel physical behavior or own destination state. Initial factories define content, not an invariant that live inventory can never change.

Saves are ordinary JSON snapshots of authoritative state with a version and lightweight structural/ownership checks, not a persistence framework. Authored JSON site data, optionally using ASCII tile rows, supplies Site 828 and specialized integration fixtures through the same headless loader. Restoring a campaign preserves identity/progress; instantiating a template allocates new identities and remaps its local references. No migrations or exhaustive duplicate gameplay-validation layer.

## Consequences

- State, ticking, controller scoping, browser bindings and current-save validation must change before new scenario authoring.
- Existing physical rules and authored scenarios are retained where useful, but return/retry no longer resets locations.
- Unattended sites continue applicable simulation. Begin with full deterministic ticking rather than approximation or viewport-based suspension.
- Save-breaking changes discard incompatible development saves. No migration or parallel legacy engine.
- Site creation and ordinary freight can work without any quest. Future headquarters metadata does not change simulation capabilities.
- Single-level site geometry remains unchanged; multi-site ownership does not authorize multi-floor construction or new travel physics.

## Alternatives

Keeping persistent locations as an optional expedition feature would preserve the wrong owner and encourage scenario-specific workarounds. Nesting full GameState instances would duplicate clocks/global records and complicate transfer. Merely wrapping the singleton resident/adversary records would preserve duplicated pawn execution. Use plain typed entities, shared actions and explicit site ownership instead of an ECS framework or universal quest language.
