# Gradual Consumption And Quest Test Setups

## Decision

Nutritional density belongs to material/object definitions; dietary compatibility and conversion efficiency belong to the consumer. Pawns consume material at a configured rate per productive tick. Eat runs until satisfied or depleted; cancellation leaves actual remaining material on the same entity, allowing later resumption, transfer to another eater and exact save continuation.

Material removal and functional damage are distinct. Consuming structural objects removes material and scales remaining integrity proportionally. Damage can reduce integrity without removing material. Zero integrity disables facilities and obstruction but retains remnants; zero material removes the entity. No repair, salvage, tile consumption or predation mechanics are implied. Objects with carried dependencies or active facility users are protected.

Quest packages separate `quest.ts` conditions from shared `setup.ts` gameplay initialization. The application registry composes those packages, not success/failure configurations. Answer-key setups live only under `test/simulation/quests/<quest>/` and use ordinary commands after initial configuration. They are not shipped as selectable cases or registered as playable variants.

## Acceptance

The Consumption quest starts an idle hungry diner near a two-portion meal. Tests use its unchanged shared setup and demonstrate ordinary completion and interrupted/reloaded completion, preserving a half portion. Separate tests establish specific deadline and incapacity failures without editing quest state. Focused checks cover dietary compatibility, object nutrition overrides, per-tick effects, carried leftovers shared between eaters, wood/metal consumption, damage versus mass, and occupied/dependency protection.

Existing response, daily-life and colony quests retain behavior but move into the same package structure. The ASCII CLI can load the consumption challenge; no test controllers are imported into runtime code. Version 10 discards the prior diet/state shape without migrations or deep persistence validation. Legacy and browser code remain unchanged.
