# Bounded Cycle And Group Evacuation

## Decision

SCP-3008 is a bounded integration of existing field work, care, escort/carry and
transport, not an independent infinite-world game. An optional site operating
cycle starts once an actual controllable pawn is physically present. It stores
one start tick and two positive durations. Phase and next transition are
derived, not saved as another competing clock. The cycle continues after staff
leave and is independent of quest outcomes.

Response data may restrict hostility to one operating phase. Visibility and
concern selection use the actual tick; an active attack stops at dawn and
ordinary patrol resumes. A supplied optional attack ceiling clamps total wound
severity using the live sequential state. This keeps the authored employees
nonlethal without changing uncapped existing combat scenarios or erasing injury.

Catalog route data authorizes a daytime return, a two-passenger group and a
two-tile loading area for this sector. Night refusal occurs before ownership
transfer and reports the next opening. Core transfer remains generic and owns
the actual records; previously departed transit is not retroactively cancelled
when the source closes. Hunger/fatigue still cannot prevent prepaid return.

The shelter combines existing repair/service and clinical work. Service must
be restored before the clinical bed is usable. A player can instead carry the
casualty out and use home supplies. This is a concrete time/equipment/care
decision, not a new quest condition language.

## Play-Driven Escort Correction

The eleventh site produced follower IDs that sort before their incoming
leaders. An earlier-turn follower could repeatedly step into the leader's next
route tile, causing an endless two-tile oscillation after group arrival.
Escort now remembers the leader's last vacated tile in its own queue state.
Follow uses that trail until the final destination handoff; each pawn still
moves only on its own turn. The repeated move-and-normalize code was folded
into one local method. New commands discard caller-supplied trail state.

The complete group-return transcript reproduces that ordering and now finishes
both admissions. Existing corridor, cancellation and current-version replay
tests also pass; no global traffic planner or second follower registry was
introduced.

## Boundaries

The fixed opening, capped impacts, original survivors and shelter are explicit
game adaptations. Infinite/changing topology, source-level lethality, corpse
handling and automatic stock replenishment are omitted. The bounded opening
always recurs, so no unimplemented death/rescue mechanism can permanently trap
all responders. Core version 20 discards incompatible snapshots.
