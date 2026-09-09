# Physical Material Accounting

## Context

The annex prototype left an independently stored available-material counter and stockpile coordinate. Surface and vessel work updated this counter while also reserving physical objects. Persistence assumed that every world began with 160 materials. A scenario changing only physical stock to 23 relocated units was rejected before any work began.

## Decision

Delete `GameState.construction` and the duplicated surface spending counter. Material stacks, their quantities, locations and exclusive reservations are authoritative. Derive available material from unreserved, uninstalled ground stacks. Hauling reservations and carried cargo are unavailable to a second job.

Reservation, consumption and release change physical objects only. Surface/vessel collection begins at the chosen cargo's real position. Supply lookup considers the work destination first, then other locations ordered by Manhattan distance and ID. Preserve the existing single-location, compatible-condition batch rule rather than adding a new hauling planner.

Current-version save validation checks object quantities, owners and active-order cargo requirements. It does not reconstruct a starter-world budget from completed jobs. Conservation is checked across command transitions in scenario tests using known initial quantities, not by requiring every valid world to equal 160 units.

Schema 47 discards earlier saves; no migration is retained.

## Verification And Limits

- Scenarios with 23 and 240 relocated materials exercise reserve, cancel, consume and reload through real surface work.
- Surface and vessel jobs cannot reserve the same units twice; cancellation restores availability by releasing cargo, not crediting a counter.
- Hauling commitments are excluded from availability. Wrong reserved amounts still fail save validation.
- No procurement, material conversion, multi-source batching, route-optimal supply choice, meal-accounting rewrite or mission engine is introduced.
- The starter site's 160-unit stack remains authored content. Different quantities and locations no longer need matching ledger edits.
