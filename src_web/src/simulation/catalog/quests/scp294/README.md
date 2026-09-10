# SCP-294: Bounded Retrieval Experiment

Adapted from [SCP-294](https://scp-wiki.wikidot.com/scp-294) by **Arcibi**,
SCP Wiki, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The [archived revision 116](../../../../../docs/references/scp-294/2026-09-09-revision-116.txt)
was reviewed for source and credit. Original adaptation text is offered under
the same license. No source images or article prose are included in runtime.

## Source And Adaptation

The source describes a coin-operated machine that retrieves requested liquids,
rejects a diamond request, and can remove the same volume from a specifically
identified distant mixture. Those are the supported mechanics here. The home
installation, approved request list, local reservoirs, harmless tracer, finite
coin budget and tick durations are original gameplay abstractions. Sources
need only be grounded in the same retained site, not beside the machine.

Only **water, coffee, tracer and diamond** are accepted. There is no natural
language interpretation, hazardous mixture recipe, bodily extraction, abstract
effect, liquid temperature, caffeine benefit or nutrition. Water/coffee samples
are labeled controls, not an implemented needs shortcut. The apparatus does not
restock. The machine stays at home; bulky freight is not implemented.

## Play

Start `npm run sim`, then `brief scp294` and `inspect machine`.

```text
order ben dispense machine tracer tracer
step 20
inspect machine
order ben deliver site-1:machine:sample-1 8 3
step 12
```

The first `tracer` selects the request; the second names the actual source.
Source and sample identities persist. Each completion withdraws one
cup-equivalent from that source and creates one sample with source, machine,
operator, tick and original amount. The machine keeps a dated operation record.
`map` assigns a normal stable object label to every new cup.

The worker must reach the machine. One coin allocation is consumed when
productive work begins. Cancel before then to avoid payment; cancel afterward
and the coin remains spent. Liquid is withdrawn atomically at completion, not
while waiting. `queue ben` shows PAID and work ticks. Missing coins, depleted
sources, a competing operator or an uncleared sample produce readable blockers.
Only the current operator can use carried coins; ground coins must be within
one tile of the machine.

Clear each output with ordinary take/delivery work before requesting another.
Two tracer portions produce distinct sample IDs. Put them at (8,3) and (9,4),
then `order ben study sample-bench repeated-tracer`. Physical comparison records
both source sample IDs. It does not grant points or claim unmodeled chemical
analysis. Keep the samples for subsequent inspection rather than duplicating
them in a research inventory.

`order ben dispense machine diamond` spends a coin over a short trial and
records OUT OF RANGE, with no liquid removed and no sample created. Unknown
requests are rejected rather than translated into an arbitrary effect.

The home begins with eight coins, four water portions, three coffee portions,
and two tracer portions. The decision is how to allocate trials and staff time:
compare repeat retrieval, retain controls, test a known refusal, or interrupt
paid work to respond elsewhere. Source scarcity is real; a third tracer request
waits without consuming another coin. Normal-command coverage is in
[repeated-tracer.txt](tests/repeated-tracer.txt):

```sh
npm run sim < src/simulation/catalog/quests/scp294/tests/repeated-tracer.txt
```

Core version 12 discards older development snapshots, including older campaign
saves. Current paid progress, records, quantities and sample identity replay
without migration. Automatic staff response may interrupt self-chosen work,
but dispensing is an explicit order in this slice.
