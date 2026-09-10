# SCP-2295: Supported Patchwork Care

Adapted from [SCP-2295](https://scp-wiki.wikidot.com/scp-2295) by **K Mota**,
SCP Wiki, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The [archived revision 25](../../../../../docs/references/scp-2295/2026-09-09-revision-25.txt)
was reviewed before adaptation. Original scenario text is offered under the
same license. No source prose, images, injury instructions or medical recipes
are included in runtime.

## Supported Source Properties

The source bear responds to nearby major organ trauma, chooses the youngest
human when several are present, makes replacements from nearby fabric and
stuffing or its own material, and leaves the recipient unconscious after the
replacement. Its inability to repair the illustrated cerebral injury matters:
this implementation does **not** turn it into a universal healing button.

The bounded model supports **lung replacement only**. Lung/brain trauma,
ordinary wounds and blood loss are distinct health facts. A replacement records
its organ, tick, bear identity and actual textile source. Other injuries remain.
Brain trauma is not repaired, and a younger brain-trauma patient is not silently
skipped in favor of an older lung patient; their position and the unsupported
blocker are visible.

The source's distance is adapted to two cardinal tiles. Age is an authored
adult value, not a pediatric population simulation. Original patients Iris (29)
and Owen (54), care locations, material units and work duration are game
abstractions. There is no complete anatomy, organ inventory, generated-tool
simulation, comfort-gift mechanic or automatic self-fabric regeneration.

## Manager Loop

The home bear acts automatically. `brief triage` describes the urgent adult
transfer. Send two real staff, carry one patient each, and return through the
same transport ownership used by ordinary care. At home, lay textiles within
two tiles of the bear and position Iris at (6,6) before Owen at (5,7).

The first productive tick spends one nearby ground textile bundle. If none is
available, it spends one finite self-fabric unit instead. The adaptation retains
one minimum body unit, so an exhausted bear waits for external supplies rather
than disappearing. Supplying fabric prevents this cost; no material is refunded
after an interrupted attempt.

The youngest eligible nearby person is reconsidered during treatment. A younger
arrival or a patient leaving range interrupts the current attempt. Carrying the
bear interrupts its ordinary queue too. No unfinished replacement is granted.
The physical work and paid source persist through current-version reload.

After eight productive ticks, the lung replacement is recorded, but the person
remains postoperative and cannot walk. Carry them to (4,2), then
`order casey nurse iris clinic`. A real clinical pack and a complete bedside
course are required even if postoperative blood loss is zero. Wounds remain;
the ordinary course improves blood loss by at most 25. Then use cooperative
escort and normal bed admission.

This keeps the decision in staffing, positioning, finite material and follow-up
care rather than a remotely selected heal target. It is an abstract fictional
care model, not a real clinical procedure.

The [ordinary-command walkthrough](tests/supported-transfer.txt) returns both
adults, performs both replacements and follows through with care:

```sh
npm run sim < src/simulation/catalog/quests/scp2295/tests/supported-transfer.txt
```

Core version 16 adds organ facts, mending commitments and postoperative state.
Older development saves are discarded without migration.
