# Machine-owned processing

The SCP-914 candidate now earns a distinct capability: an actual device keeps
working after its operator has completed activation and left. This is not
ordinary Craft with a different name.

An authored Processor profile supplies ports, activation duration, recipes and
one current run. Process reuses Deliver and Move for actual loading/control
access, then locks the same input under the facility and ends its pawn action.
The normal sorted facility turn advances the run at its recorded due tick.
No wall-clock callback, second pawn executor, quest solution or production
scheduler is introduced.

Only a whole matching item is accepted. Worn gear, active repair leases, other
holders, occupied ports and invalid layouts are refused. After activation,
facility occupancy and transfer rules protect the independent run. Operator
death or departure does not cancel it.

Successful release consumes the original identified input to amount0 and
creates one output with a per-machine run ID and actual provenance. A blocked
output/missing input/identity conflict produces no item or premature consumption,
retains the run and emits a warning only when the blocker changes. Clearing the
physical problem permits completion; the input is never silently substituted.

Craft and processing share a plain ItemBlueprint type, not a general recipe
language. Ordinary maintenance parts now live with other supplies rather than
being owned by an unrelated SCP quest. The first two recipes accept only the
original vest, so their outputs cannot form a conversion loop.
