# SCP-914: an independent processing cycle

Adapted from **SCP-914 by Dr Gears**, SCP Wiki, CC BY-SA3.0:
<https://scp-wiki.wikidot.com/scp-914>.
[Revision53 and the adaptation decision](../../../../../docs/references/scp-914/adaptation.md)
document the source and explicit bounds. No image is included.

## The decision

Actual `kinetic-impact` research unlocks the `clockwork` route and its original
pre-approved trial. Bring one real unequipped `protective-vest`, including broken
gear recovered from a body. The approved choices are:

| Recipe      | Actual input                              | Authored output                                    |
| ----------- | ----------------------------------------- | -------------------------------------------------- |
| `coarse`    | One original vest, any retained condition | Two maintenance packs                              |
| `very-fine` | One original vest, any retained condition | One lattice shell: reduction30, wear100 per impact |

The shell buys greater immediate protection but fails quickly; repeated small
impacts waste it. It does not heal existing wounds, restore charges or qualify
as another processing input. Neither do the maintenance packs. These are
bounded game recipes, not source-canonical experiments or a general conversion
language.

## Actual machine ownership

`order alex process machine very-fine @held` uses ordinary delivery to the
intake, movement to the control position and two winding work ticks. Clear the
ports and unequip the input first. Before activation, cancellation leaves the
actual object wherever physical work placed it.

After activation, the machine owns that same input and a sixty-tick cycle.
`finish alex` finishes **loading/activation**, not the machine's cycle. Inspect
the machine or `status` for the due tick. Alex can leave for care, rest or other
duties; incapacity or death of the operator does not undo the machine's work.
There is no post-activation refund or operator-queue cancellation of the cycle.

`finish machine` waits on the currently active device run, not its operator or
future cycles. It can be combined with existing work/transport, for example
`finish machine alex` after Alex departs. `finish --alarms machine` also stops
for any new critical event. At another site, use the apparatus's full ID or stable
label for read-only waiting; this does not permit remote activation or pickup.

The apparatus cannot move while active. Its input cannot be picked out of
machine custody. At completion, the output port must be clear. An obstruction
leaves the input unconsumed and the run explicitly blocked, with a nonrepeating
warning until something changes. Clearing it allows actual output.

Successful output marks the original input amount0 and creates one new item
with input ID/definition/condition, operator, recipe and dates. The consumed
input remains an identified historical record inside the machine, not another
usable vest. The output is ordinary physical cargo, not a reward flag.

The [normal-command walkthrough](tests/independent-cycle.txt) records an impact,
withdraws alive, researches it, commits the worn vest, returns the operator for
real home care while processing continues, then retrieves and uses the shell.
The shell absorbs a later kinetic impact and breaks; a subsequent live capture
still needs the actual suppression charge, transport band and prepared holding.

```sh
npm run sim -- --strict < src/simulation/catalog/quests/scp914/tests/independent-cycle.txt
```

## Limits

The apparatus's source-scale booths/guarding and formal authorization procedure
are not fully simulated. Ports, sixty ticks and recipes are explicit
abstractions of an approved local trial. No biological, weapon, medical or
arbitrary five-setting input experiments are available. Staff time is freed
after activation, not an infinite factory or a free gear-repair shortcut.
