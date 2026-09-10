# Supply-Backed Clinical Recovery

## Decision

The original care transfer could return an incapacitated person but could not
restore her supported condition. Add one ordinary, finite, physical course
before specialized anomalous medicine. Health records the cause of incapacity;
it does not infer that every externally disabled pawn needs a free heal.

Nurse is a normal pawn action. A medically trained worker approaches an allied
patient grounded within one tile of a usable clinical bed. Active bleeding must
first be stabilized through Treat. The bed supplies a small course definition:
one physical supply-pack definition, work duration and blood recovery amount.
The patient and bed are claimed by productive queue work, not a second
reservation ledger. Facility occupancy also recognizes the action's bed ID.

One supply unit is spent at the first productive tick. Blood recovery accrues
over work ticks and persists after cancellation. Completing a supported course
can clear recorded blood-loss incapacity; severe wound incapacity and arbitrary
non-health inability remain. A new course cannot supply a forged paid marker:
command submission clones the typed action, resets progress and strips payment
references. The same initialization now serves dispensing and nursing without
a growing duplicated object constructor.

CLI parsing already returns typed known actions. Its redundant action-kind
whitelist and second work-progress initializer were removed while integrating
nursing. Parsing owns syntax, command submission owns fresh intention state,
and individual actions own execution.

Core version 15 adds clinical and incapacity state; old snapshots are discarded
without migration or deep persistence validation. The late-rescue transcript
waits for actual bleeding incapacity, carries the same person home, spends a
real pack and admits her only after supported recovery.

## Limits

No organ restoration, wound healing, self-treatment, death, instant admission
cure or realistic drug/infusion recipe is included. The quantities and timings
are game-scale abstractions. The medical prerequisite for SCP-2295 must keep
its specific replacement provenance separate from this ordinary blood care.
