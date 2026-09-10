# SCP-1295: Retained Diner Service

Adapted from [SCP-1295](https://scp-wiki.wikidot.com/scp-1295) by **Dmatix**,
SCP Wiki, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
The [archived revision 22](../../../../../docs/references/scp-1295/2026-09-09-revision-22.txt)
was reviewed before adaptation. Original scenario text is offered under the
same license; no source dialogue or images are copied into runtime.

## Source And Limits

The source describes four elderly regulars whose access and routine at a diner
must not be disrupted. This slice keeps Warren, Frederick, Pat and Dwight at
their tables and the entrance physically open. The player supports ordinary
service instead of collecting or forcibly moving them.

Counter damage, repair packs, meal batches, staff duty and tick deadlines are
original game abstractions. There is no real-hours conversion, ordinary
customer population, covert-disguise simulation, removal mechanic or wide-area
anomalous effect. An overdue service is a bounded, recoverable local problem:
the counter's register activity is unavailable until service resumes. It does
not close the entrance, erase patrons or end the campaign.

## Physical Provisioning And Staffing

`brief diner` gives the current instructions. Send actual staff with a chosen
food portion and a maintenance pack:

```text
order alex take meals 4
order casey take parts 1
step 20
prepare diner alex casey
step 12
send diner alex casey
step 8
site diner
```

Use map labels or `inspect <worker>` contents to identify the new supply
portions. Deliver food and parts within one tile of `counter` at (8,4), then
`assign alex counter`. Assignment enables autonomy but does not replace current
work. It stores one site-scoped duty, not an itinerary or a second executor.

The ordinary Service action approaches the counter, spends one maintenance
pack for six repair ticks, retains that completed repair, then spends one meal
batch for eight service ticks. A cancelled funded attempt retains its spent
input. Completed services record their worker, actual source, quantity and
tick. Do not assume four delivered portions will fund four rounds: the worker
also needs ordinary meals.

Each completion covers 100 ticks. Assigned work becomes due 24 ticks before
the deadline, leaving time for travel and ordinary interruptions. Critical
food/rest offers take precedence over duty; otherwise due service takes
precedence over discretionary needs. These are the same normal action queues
and meal/bed interactions used elsewhere. No off-screen free service runs.

Leave Alex at the diner and manage home while every site continues ticking.
`status` reports duty, actual worker activity, condition, coverage/deadline and
history counts. `inspect counter` gives exact repair/service receipts.

## Interruption And Revisit

`assign alex none` clears future duty, not current paid work. Turn autonomy off
and finish/cancel the current action before preparing withdrawal. A lapse is
visible and counter use is blocked, but it remains repairable and serviceable.
A later real food delivery restores service and records how late it was.
Revisiting never restores removed food, parts or damaged equipment.

Keep the home arrival pad clear. The walkthrough deliberately leaves Casey on
it, shows Alex's blocked return, then clears the pad for ordinary admission.

The [normal-command walkthrough](tests/staffed-service.txt) provisions, assigns,
leaves remote work running, withdraws and observes the lapse:

```sh
npm run sim < src/simulation/catalog/quests/scp1295/tests/staffed-service.txt
```

Core version 18 adds the service profile and duty state; old development saves
are discarded without migration.
