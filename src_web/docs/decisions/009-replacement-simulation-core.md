# Replacement Simulation Core

## Decision

On 2026-09-09 the user explicitly requested moving the existing simulation to `src/simulation_legacy` and creating a clean replacement in `src/simulation`. This supersedes earlier plans to avoid a filesystem archive or preserve the running implementation throughout incremental changes. The UI/application boundary stays; old application imports name the legacy path explicitly until replaced. No new project, branch, migration layer or compatibility re-export is introduced.

The replacement uses plain data: one entity collection per site; pawns are action-capable entities, not a separate owner or a combat mode. Definitions own tick handlers; entities read one immutable starting snapshot and produce proposals. A resolver handles movement and resource conflicts with stable entity-ID tie-breaks and publishes one next state. Door behavior belongs to the door definition, not the coordinator. Shared site-wide calculations can be added when a feature actually needs them.

Site creation and transfer occur through explicit commands. Sites persist until disposed; transfers own their payload, and arrivals happen after local ticking. Save/restore is JSON plus root/version checks only. Authored site data uses the same model with one-time ID/reference remapping, distinct from restoring an existing simulation.

## First Executable Slice

Staff and autonomous example pawns share movement, take/drop/eat/wait execution and applicable need progression. An inactive pawn is carryable without replacing its identity. Non-pawn items and doors are in the same entity collection. Player permission, autonomy, mobility and ability to act are independent. Debug context allows authorized queue editing without bypassing physical legality.

Acceptance tests cover frozen input, shuffled entity/proposal order, contested movement and consumption, door open/cross/close timing, both ID orders for carried-pawn updates, control revocation, JSON replay, two instantiated site copies, blocked transfer arrival and transit replay with a carried pawn. Tests also reject imports from the archive/application/browser into the replacement.

## Limits

The old UI still runs the archived implementation; it does not display the replacement's state. This is an explicit transition, not a claim of completed UI integration. The new core is the executable target for further development, not a facade around legacy functions. Rich jobs, combat, SCP-specific behaviors, Site 828 content and quests must be ported selectively. Existing prototype tests are not an obligation to preserve those implementations.

Stable ordering alone is not enough: all proposals read the same starting state and conflict rules are explicit. First-slice movement rejects entering another pawn's starting tile, and crossing a newly opened door waits until the following tick. More complex movement arbitration is deferred. No attempt is made to deep-copy the whole simulation for each entity, serialize functions or create an extensible scheduling framework.
