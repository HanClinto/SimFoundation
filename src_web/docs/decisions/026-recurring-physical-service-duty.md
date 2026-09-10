# Recurring Physical Service Duty

## Decision

SCP-1295 needs an ongoing staff/supply obligation, not another recovery token.
One counter service profile defines repair input/work, ordinary service
input/work, a coverage interval and preparation lead time. A single Service
action performs physical repair and service using the existing action queue.
Repair persists on the entity's integrity; dated receipts retain material
source and late completion. There is no second repair-progress store or clock.

Coverage and lateness derive from the last completed service receipt and the
simulation tick. Before initial service there is no invented missed history.
After a deadline lapses, counter activities are unavailable until service is
restored. The source-specific wider effects and patron-removal mechanics are
not implemented or claimed.

A pawn can hold one service duty. Assignment enables ordinary autonomy without
interrupting current work. Observed urgent concerns retain precedence. For
assigned workers, authored critical need thresholds select ordinary care before
due service; due service precedes discretionary needs. Unassigned pawn behavior
is unchanged. Clearing a duty does not erase a paid current commitment.

Both duty and current queue are site-scoped by actual entity IDs. Moving a
worker away does not run remote service by proxy. All sites keep ticking under
the same sequential runner, including needs, local work and deadlines. Plain
state preserves duty, current input payment and receipts through reload.

Repeated physical-supply selection in dispensing, nursing, mending and service
now shares `Supply.ts`: stable identity order, exact definition/quantity,
ground proximity and optional ownership by the worker. Mending deliberately
does not opt into carried inputs. No generic recipe/planning language is added.

Core version 18 discards incompatible saves. Tests cover paid repair, recurring
service, actual off-site staffing, need breaks, shortage, cancellation, lapse,
late restoration, persistent revisits and command payment-state initialization.

## Consequences

The manager must allocate real portions, leave an actual worker on site, budget
their meals too, and decide when to relieve or resupply them. Return admission
can still block on an occupied home pad; service work does not bypass transport
ownership or movement. The four regulars remain physical, unremoved patrons.
Subjective fun is still not established by automated play.
