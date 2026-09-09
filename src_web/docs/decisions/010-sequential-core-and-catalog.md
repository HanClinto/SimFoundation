# Sequential Core And Catalog

## Context

The first replacement in decision 009 split each action between pawn proposals and a monolithic resolver. Although double buffering can be modular, its claim bookkeeping and state merging were not earning their complexity here. The user prioritizes readable, consolidated behavior and a folder structure resembling a wiki, drawing on MoistureFarmer's core/equipment distinction.

## Decision

Use `simulation/core` for generic mechanics and `simulation/catalog` for named entity/material definitions, authored sites, and future quests. Core accepts supplied definitions and must never import catalog content. Catalog entries carry names, descriptions, and defaults; their index registers entries without implementing behavior. Materials are definitions, not entity subclasses. Avoid redundant `entity/entities` and `action/actions` folder levels and empty placeholder content.

Replace proposals and resolution with stable sequential site/entity turns. Clone once at the public tick boundary for caller isolation, then let each action inspect and mutate current working state. Later entities see earlier changes. First successful movement/resource use wins; entering an earlier mover's vacated tile is allowed. ID order is deliberately biased, not simultaneous or fair. Starting IDs are captured, removals skipped, new entities deferred, and transfer arrivals processed after local ticks.

Each concrete action class owns eligibility and execution. Queue handling owns sequencing, cancellation and reporting, with only a small constructor dispatch. Queued state remains plain JSON, not class instances. Core entity kinds are generic, not enumerations of named staff or SCPs.

Materials have catalog-defined tags. Diet rules match tags and provide consumer-specific nourishment per unit; multiple matches use the maximum once. Eat shares candidate filtering between autonomy and explicit execution, but explicit targets never retarget. Start with one material and a remaining amount per entity. Consumption supports loose items only; installed structures and living pawns require consequences not implemented in this slice.

## Consequences

Movement, taking, dropping, eating and waiting can be understood locally. No reservation sets or next-state merging are needed for these actions. Sequential state visibility is part of gameplay, including door opening visible to later actors. Frozen-input/replay tests remain useful, while proposal-order tests are replaced by sequential-behavior checks.

Stable IDs determine priority; swaps, traffic optimization and fair scheduling are deferred. Definitions are trusted authored data, not a scripting/mod interface. Autonomy currently chooses food or configured patrol; unique catalog behavior will get a narrow interface when a real feature needs it, not an anticipatory plugin framework.

Snapshot version 2 discards the prior experimental state. Plain JSON root/version checks remain the entire save parser. The legacy engine and browser bindings stay untouched. The [simulation README](../../src/simulation/README.md) is the current organization, API and scope guide.

The subsequent [shared traversal decision](011-shared-traversal-and-templates.md) separates EntityTemplate from site placement, adds explicit entity obstruction and interaction-position routing, and advances the disposable snapshot to version 3. Sequential ordering remains unchanged.
