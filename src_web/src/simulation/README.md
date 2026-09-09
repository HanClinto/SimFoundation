# Simulation Core

This is the replacement headless simulation. It imports no code from `simulation_legacy`, application controllers or browser adapters. The previous implementation remains in [../simulation_legacy](../simulation_legacy) for reference; existing UI/application callers explicitly use that directory until replaced. There is no compatibility facade in this directory.

## Layout

- `model.ts`: plain serializable entities, pawns, sites, transfers and actions.
- `entities/`: shared entity mechanics, currently optional need progression.
- `behaviors/`: definition-owned tick handlers and autonomous intent selection. Handlers read the current snapshot and emit proposals, not mutations.
- `actions/`: source-aware commands, proposals and deterministic resolution. Staff and autonomous pawns share the same executor; no combat enrollment or drafting.
- `world/`: spatial queries and cardinal pathfinding using the existing `pathfinding` dependency.
- `campaign/`: site instantiation/disposal and ownership transfer, independent of quests.
- `content/`: plain JSON site definitions used by headless integration tests.
- `tick.ts`: collect proposals, resolve each site, then advance transit/commit arrivals. It contains no door or named-anomaly rules.
- `snapshot.ts`: JSON stringify/parse and root/version checks only.

Run `npm run test:simulation` from the web project for the replacement acceptance tests. `npm run check` also checks the archived application's existing tests/build during the transition; passing those does not mean the new core is connected to the UI.

## Tick Contract

Every entity observes the same site snapshot for a tick. Handlers must not mutate it; tests freeze inputs. Local need changes and shared action requests are collected before any next-state changes are applied. The resolver orders competing actions by entity ID. A move or resource claim has one winner; losing actions retain a blocker for retry. Doors own automatic-close proposals in their definition, and shared spatial resolution prevents closure around occupants or incoming movement.

Movement uses a conservative starting-snapshot occupancy rule: a pawn cannot enter another ground pawn's starting tile on the same tick, even if that pawn proposes leaving it. Swaps and traffic optimization are not implemented. A closed automatic door is opened on one tick and crossed on a later tick. Entity/proposal array order does not change the tested results; stable ID arbitration is explicit, not hidden direct-mutation ordering.

All owned pawns advance applicable needs once, including carried or transit-owned pawns. Carried pawns do not independently act or occupy another tile. No food need means no hunger updates. Autonomy off prevents new self-selected actions but preserves current queues and ongoing physiology. Player authority is checked at submission and execution. Debug permission is supplied through a trusted caller context, never inferred from the queued action; debug commands bypass player permission, not physical restrictions. Cancellation removes an intention and does not teleport/drop cargo or change autonomy.

Transfers accept prepared ground entities at a loading tile, include carried dependency groups and move their actual records into transit ownership. Travelling pawns must have empty queues. No site ticks these records in transit. The coordinator advances their needs and commits arrivals after site execution, so arrivals receive no extra local step. Blocked arrivals retain payload and reason. Both endpoints remain protected from disposal while a transfer exists. Transfers are ordinary headless domain commands, not user-facing authorization endpoints yet.

## Authored Data And Saves

The acceptance site is a JSON document with rectangular `.` floor / `#` wall rows and entities. `instantiateSite` gives the site and each entity fresh IDs and remaps local carried/target references and initial action IDs. Snapshot restore preserves IDs, action progress and transit exactly. No callbacks are serialized and no per-type revival or save migration runs.

The loader checks authored map geometry and local references because it is creating new live objects. Snapshot parsing intentionally does not revalidate gameplay. The definition catalog and template types are trusted developer-authored content, not a hardened external mod interface.

## Current Scope

Implemented: entity/pawn separation, independent autonomy/control/mobility/carryability, move/take/drop/eat/wait, one chosen autonomous patrol intention, non-pawn automatic doors/items, deterministic claims, optional needs, shared JSON site instantiation, snapshot replay, multi-site ticking, prepared cross-site transfers and empty-site disposal.

Not ported: Site 828's full authored map, personnel dossiers, qualifications, jobs, material construction, electrical networks, clinical care, anomaly-specific actions, combat, quest progression, reactive mental states, transit return/reroute, stack quantities/weight, and browser binding. `canAct` and `mobile` permit representing an inactive or immobile pawn; they do not implement death, injury or recovery rules. The accepted input policy blocks a revoked player action in place; richer active-control-change policies remain future work.

The current definition union deliberately covers only the first executable examples. Add concrete behaviors when porting a wanted feature; do not build an ECS or a scripting system in anticipation. Preserve useful domain calculations from the archive selectively, then test them through this core. Do not expand legacy execution to make the replacement look complete.
