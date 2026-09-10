# Independent Sight And Movement

## Context

The user identified that transparency incorrectly depended on walkable terrain and only handled doors. Glass, low obstacles and mist require independent sight and movement rules. The user continues to accept explicit door handling and considers the bundled Response interface provisional.

## Decision

Tiles expose blocksMovement and blocksSight, as do entities. TileMap.tileAt reads the site's optional authored symbol dictionary with basic open/solid defaults; movement and visibility consume the appropriate property. Sight considers all ground entities, not just doors. Ordinary pawns and low furniture remain transparent; the catalog bookshelf is opaque.

Doors retain explicit stateful behavior. Closed doors may be transparent or opaque independently of their opening policy. Open doors do not themselves obstruct, but never suppress another blocker or opaque terrain. Planning through an openable opaque door does not imply current visibility through it.

Observer and target entities are excluded from their own sight query so opaque targets can be seen, but other blockers at either endpoint remain effective. Carried contents do not independently occlude. Existing diagonal-corner checks use optical properties, not walkability. Unknown tiles are blocked. This is binary visibility, not fog diffusion, height or light simulation.

## Verification And Scope

SightAndPassage.json demonstrates transparent impassable glass and opaque traversable mist through ordinary site loading. Tests cover actual travel through mist, threat discovery through glass, independent entity-flag combinations, opaque targets, carried items, glass/steel doors, stacked blockers, corner visibility, tile-map cloning and replay. Existing five-actor response tests remain passing.

Core snapshot version 8 discards prior development saves without migration. No browser/legacy changes or art are introduced. Response is documented as plain policy/capability data rather than a need-extension class; it is not restructured or expanded in this slice.
