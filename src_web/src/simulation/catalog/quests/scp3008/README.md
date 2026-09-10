# SCP-3008: Bounded Group Evacuation

Adapted from [SCP-3008](https://scp-wiki.wikidot.com/scp-3008) by **Mortos**,
SCP Wiki, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The [archived revision 31](../../../../../docs/references/scp-3008/2026-09-09-revision-31.txt)
was reviewed before adaptation. Original sector, survivors and scenario text are
offered under the same license. No source journal prose, branded artwork or
new image is used.

## Deliberate Boundaries

This is one retained store sector, not an infinite world. Nora and Eli are
original adult survivors. Employees patrol during the day and use the existing
attack action at night. **This prototype caps their impacts at 60 total wound
severity**, below the incapacity threshold. The article's lethal violence,
wandering exits, changing topology, automatic restocking and corpse handling
are not implemented or claimed.

The fixed exit and 120-tick day / 60-tick night cadence are original gameplay
abstractions. Night closure always has a readable next reopening; the player
cannot be permanently stranded by an unimplemented rescue/death system.
Night impacts still persist as real wounds and do not disappear on return.

## The Decision

`brief store` explains two supported approaches:

1. Bring food and parts, restore the shelter, and use its one actual clinical
   pack to recover Eli's blood-loss incapacity before walking both survivors out.
2. Leave field supplies untouched, carry Eli out alongside walking Nora, and
   spend a home clinical pack after arrival.

The first approach costs time before closing and leaves a functioning retained
shelter. The second preserves time and field supplies but ties up a carrier and
requires home care. Neither requires collecting every map marker.

The cycle starts on the first simulation turn with a real responder in the
sector. A readonly view does not start it. Once started it continues while
unattended and never resets on revisit. Other sites, needs, service obligations
and transit keep advancing too.

## Physical Work And Return

Restore `shelter` at (10,2) with one actual maintenance pack and meal batch,
using ordinary Service. Its clinical care remains unavailable before repair
and initial service, or after service lapses. Eli must be physically beside it
for `order casey nurse eli shelter`.

Use separate escort destinations such as (2,4) and (2,5). This route admits two
cooperative walking passengers with existing staff. Everyone selected must be
within two tiles of (2,4), with completed queues. A carried person is already
included through their actual carrier; do not select them again as a passenger.

`send home alex casey nora eli` succeeds by day. At night it refuses without
spending another docket, changing ownership or erasing queued work, and reports
the exact next opening tick. Move to the loading area and wait for reopening.
Return remains prepaid and is not blocked by hunger/fatigue readiness.

At home, escort the people to bed positions and admit them normally. Carried
Eli needs real clinical recovery first. Staff, survivors, injuries and supplies
remain their original records. A partial withdrawal leaves the other survivor
at the unchanged sector, not a reset rescue objective.

Normal-command, test-only walkthroughs:

```sh
npm run sim < src/simulation/catalog/quests/scp3008/tests/shelter-and-evacuate.txt
npm run sim < src/simulation/catalog/quests/scp3008/tests/carried-evacuation.txt
```

Core version 20 adds the operating cycle and phase-aware hostility. Earlier
development saves are discarded without migration.
