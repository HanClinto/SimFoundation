# SCP-173: bounded direct-watch maintenance

Adapted from **SCP-173 by Moto42**, SCP Wiki, CC BY-SA3.0:
<https://scp-wiki.wikidot.com/scp-173>. The reviewed text is
[archived revision57](../../../../../docs/references/scp-173/2026-09-09-revision-57.txt).
No sculpture image or likeness asset is included.

The article supplies direct-eye-contact immobility, hostile neck attacks,
three-person entry/two-observer procedure, a locked enclosure and cleaning.
This prototype uses a fixed viewing gallery, sequential tile movement,
fatigue-limited commitments, a modeled lethal impact and a shortened cleaning
cadence. It does **not** implement automatic blinking, precise source speed,
camera substitution, relocation, full anatomy or the article's complete
containment procedures. Sustained Watch abstracts conscious direct attention;
ambient360-degree visibility and the impact-recording Observe action do not.

## Player situation

An actual home `kinetic-intake` finding unlocks the retained `statue` route.
Bring three existing people through repeatable transport or the finite reserve.
The viewing gallery lets two people establish watch before opening the inner
door. `order alex watch subject 200` becomes active on Alex's normal turn, not
at command acceptance. `status` and `inspect subject` show actual watchers.

One active conscious human observer freezes the subject. Two distinct active
observers beside the station, other than its worker, authorize cleaning/study.
Move observers into the work room under overlapping coverage, admit the third
person and close the door behind them. Then the third worker can `service
station` or `study station direct-watch-protocol`. Both observers and the
subject must remain beside the station during productive work.

The finite watch ends at its chosen duration or fatigue85, with warnings before
expiry or the fatigue limit. It is not a permanent boolean grant. Loss of sight,
control, consciousness or independent ground position removes coverage.
The subject resumes physical movement/attack when every valid observer stops.
The closed door remains a separate physical fallback.

To relieve a watcher, activate the replacement **before** releasing the earlier
commitment. `relieve alex riley` releases only Alex's current Watch after
confirming Riley is already actively watching the same subject. Pending work,
wrong subjects, unavailable people and loss of required coverage for productive
supervised work are refused without advancing time. Later queued work stays
intact. This does not move or activate the replacement for you; ordinary
`cancel` remains the deliberate exception.

During withdrawal, keep overlapping observers while people leave;
physically close the door before the last watchers stop. Clear the narrow door
approach so others can pass. Use `finish riley` for Riley's work, not
`finish alex casey` while their active watches are the safety coverage.

If a worker returns home to rest while others remain on watch, use
`finish --alarms <worker>`: it stops that targeted wait for a new remote warning
or casualty. Ordinary `finish` reports remote critical events after the wait but
does not promise to stop before the remote situation worsens. Neither command
automatically supplies relief or rolls back the tick.

The [normal-command walkthrough](tests/watch-maintenance.txt) captures/studies the
kinetic source first, then plays three-person entry, locked work, overlapping
relief, withdrawal and return. The first return team clears the home pad for
the third person's actual transfer. The failure regression abandons both
watchers with the door open and retains real worker deaths.

```sh
npm run sim -- --strict < src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt
```

Cleaning spends one of three existing packs over eight work ticks; coverage200
and warning40 are authored game values, not the source's biweekly interval.
Overdue cleaning reports a maintenance lapse; it does not magically unlock a
door. Protocol study records the actual source and worker rather than granting
research points. Generic suppression instruments and portable recovery do not
apply to this source.
