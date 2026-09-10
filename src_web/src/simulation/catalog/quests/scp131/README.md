# SCP-131: supervised companion visit

Adapted from **SCP-131 by Unknown Author**, SCP Wiki, CC BY-SA3.0:
<https://scp-wiki.wikidot.com/scp-131>. The
[reviewed revision38 text and adaptation note](../../../../../docs/references/scp-131/adaptation.md)
give primary attribution evidence. No image or sculpture asset is used.

The article documents a specific interaction with SCP-173: the pair watch it
intently and leave with the cleaning crew while keeping their eyes on it.
Human procedure is not replaced, and broader warden applications are only
being considered. This is an original bounded supervised trial, not a
certified guard programme or complete creature simulation.

## Play the visit

The actual `direct-watch-protocol` finding at the retained statue annex unlocks
`companions`. It is read at that research site, not fabricated as a home finding.
`brief companions` explains the trial. Guide the two existing visitors, `pod-a`
and `pod-b`, to loading positions, then send both as passengers with a real
worker. They never become deployable staff or inventory bonuses.

The same pair can accompany a worker to the statue annex. In this prototype,
their unblinking supplemental gaze works only while they are capable, grounded,
seeing SCP-173 and accompanied by a visible conscious human within six tiles.
An actively sleeping or incapable human does not qualify. Carrying, occlusion,
loss of nearby people or leaving the site removes support. The specific target
whitelist does not grant a general power over other anomalies.

`status` identifies human Watch versus supplemental gaze. Two **human**
observers beside the station, plus the separate human worker, are still needed
for maintenance. A companion cannot be a `relieve` replacement. Keep human
protocol, close the gate before withdrawal, and guide the actual pair out.
They require no food or sleep; ordinary bed admission is refused rather than
inventing a care need.

The [visit continuation](tests/visit.txt) follows the existing SCP-173
walkthrough without a reset. It first brings the actual power cache home so
the already contained kinetic resident remains secure during the longer visit.
Then Casey transports/guides the same pair, observes supplemental coverage
from the locked gallery and returns them. Field cleaning can still become due;
companions do not perform it or reset its deadline.

```sh
awk '1' src/simulation/catalog/quests/scp173/tests/watch-maintenance.txt \
  src/simulation/catalog/quests/scp131/tests/visit.txt | npm run sim -- --strict
```

## Explicit bounds

The local visit areas and authorization are original game fiction. Cooperative
staging abstracts a supervised visit; full bonding, bond fade, free roaming,
danger babbling, momentum/braking accidents, wall climbing, source-speed
movement and injuries are not modeled. Small visitors use nonblocking map
footprints. Automatic hourly audit/lockdown administration is outside this visit.
No full-time autonomous warden or camera network is implemented.
They are physical characters whose presence can help, not a remote safety flag.
