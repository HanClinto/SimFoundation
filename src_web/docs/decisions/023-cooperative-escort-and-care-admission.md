# Cooperative Escort And Care Admission

## Decision

The original closing-aid-station scenario proves a living transfer before
adapting SCP-507. Consent is explicit pawn data (`acceptsEscort`), separate from
player control, agency and carryability. A cooperative contact accepts an
escort but does not become a directly controllable employee.

One leader Escort action appoints a linked Follow action in the passenger's
ordinary queue. Each pawn moves only on its own sequential turn through Move;
the leader never ticks the follower. The leader approaches, keeps the person
within reach, and yields the destination so the passenger reaches the exact
ordered tile. A corridor needs a free place for the leader to stand; the action
does not bypass collision. Cancelling or ending the leader's action releases
Follow on its next turn. Loss of consent ends following and blocks the leader.
There is no second scheduler, persistent follower registry or duplicate route.

Campaign departure admits at most one explicitly cooperative mobile passenger
alongside one or two existing staff. Queues must finish and every selected
person must physically reach the loading area. Core transfer owns their actual
records in transit, exactly as it owns cargo and staff. An incapacitated person
is not a walking passenger: an available responder can use the existing
Take/carry tree instead.

Home `admit <person> <bed>` checks physical proximity, a cooperative available
person and stabilized bleeding. It queues ordinary bed rest, enables ordinary
needs autonomy and records the dated admission in campaign state. Admission
does not create a new employee, replace the person, heal wounds or restore
blood. The bed is not a teleport target.

## Play-Driven Corrections

Treatment previously completed immediately if a named patient was out of sight.
The aid-station wall exposed this as false success: a manager could order
treatment and unknowingly leave bleeding untreated. Treat now physically
approaches the identified patient, then requires sight from the treatment
position. Visible-threat checks and finite stabilization charges are unchanged.

Initial escort arrival held the leader on the destination and deadlocked its
passenger. Escort now explicitly yields that tile and finishes only when the
person reaches it. Ordinary CLI play, blocked-route recovery, one-tile corridor,
consent withdrawal, cancellation, once-per-turn movement and replay cover
the corrected behavior.

Session version 5 adds admissions; core version 13 adds cooperative action
state. Earlier development saves are discarded without migrations.

## Limits

No hostile capture, permanent death, universal healing, routine-independent
staff planner or free reinforcement is introduced. Mira's wound bleeds at a
visible rate while unattended. Missing her care window can leave her incapable;
return remains physically possible by carrying, but full medical recovery and
incapacitated bed admission are not implemented in this slice. The home staff
remain available to continue the campaign. The next medical slice must address
that distinction instead of hiding a free cure behind admission.
