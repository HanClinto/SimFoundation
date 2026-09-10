# Provisional Site Campaign

Run `npm run sim` from `src_web`. `brief` introduces the finite home site;
`status` shows personnel, supplies, route gates, transit blockers and findings.
`brief blackwood`, `brief gallery` and `brief kestrel` explain the next work.
Use `site home` or the route name to inspect a retained site.

Authoring starts with [Home.ts](Home.ts) for the home layout and finite initial
inventory, and [setup.ts](setup.ts) for route opportunities. Campaign rules,
reserve dispatch, care admission and named apparatus stay in their own files;
the setup does not execute test solutions.
The existing armchair sits on the lower service lane rather than closing the
guest-bed departure path beside the workshop. This is authored circulation,
not permission for workers to pass through one another.

The home begins with Alex, Ben and Casey, eight meals, four round-trip transport
allocations, a reusable field kit, a comparison bench, independent records,
ordinary rest furniture and a glass display bay. No campaign command deploys
new staff. Home routines can be enabled with `autonomy casey on`.

`order alex take meals 3` physically collects three portions while leaving five
at home. Only explicitly stackable ordinary supplies accept quantities; people,
cases, specimens and identified samples are not divisible. A partial collection
gets its own stable map label and ID, shown under `inspect alex` contents.
Taking the entire stack keeps its original identity. There is no instant
inventory editor or automatic merging on return.

`finish alex casey` advances the existing queues until those captured
commitments finish, block, fail or are interrupted, with a 1000-tick safety
limit. Every site still advances; this is not free work or a solution planner.
It does not wait forever for future autonomous tasks. The output gives elapsed
time and remaining queues.

After `send`, `finish @1` can also watch that person's actual transfer until
arrival or blocked admission, without guessing its duration. It reports the
final owner and stops on a new critical notice for the travelling payload.
Multiple selected workers can combine local work and existing transport.
This read-only wait does not change the selected site or permit transit orders.

Campaign `run` stops after the first complete tick with a new containment
warning, breach, escape or death and prints the identified alarm. Inspect and
respond, then resume; old log entries do not repeatedly stop time. `step N`
remains deliberate fixed-duration advancement, and `finish` remains scoped to
the chosen commitments. Neither rolls back a fatal or breached tick. Batch
mode returns incomplete status (exit2) if an alarm stopped its run.

Use `events alarms`, `events here`, `events <route|site-id>` or
`events <entity-id|stable-label>` to filter the existing dated history.
Entity filters include events targeting that entity as well as its own work.
These commands are read-only and explicitly show retained history only; they
do not reconstruct events older than the saved100-entry limit.

Within an order, `@held` means that worker's actual directly carried object:
`order alex deliver @held 7 4` delivers a collected portion without copying its
generated ID. `order alex pack vial @held` uses the carried case. It never
selects another worker's inventory or silently substitutes a new object.

Prepare an actual team:

```text
prepare blackwood alex ben
step 12
send blackwood alex ben
step 8
site blackwood
```

Preparation is ordinary walking, not instant departure. Queued work must finish
or be cancelled first; `queue alex` explains blockers. Staff take their carried
objects with them. Each carrier can hold one object, so kit/supplies compete
with evidence. One ground docket beside home pad (2,7) is spent only on an
accepted outbound departure. Return trips are prepaid even if dockets run out.
Keep the home arrival pad clear; blocked arrivals remain in transit and continue
physiology until admitted.

`inspect <full-id|stable-label>` reads the actual entity even while it belongs
to transit or another site. It includes its owner, destination/arrival blocker,
actual carried contents and restraint condition. Transit inspection has no map
position or local-autonomy preview. Gameplay orders still require the worker
and targets at the selected site; inspection does not authorize remote care or
mid-transit changes. Local aliases take precedence; ambiguous nonlocal aliases
require a full ID or stable label.

Outbound staff must have hunger and fatigue below 85, both when preparing and
when sending. `status` shows each person's work, autonomy and actual readiness
blocker. Enable `autonomy alex on` to use ordinary home food/rest routines, or
order specific meal/bed work. Routines take real travel, time and finite food.
Turn autonomy off and finish/cancel remaining work before preparing a trip.
Return travel is never refused solely for hunger or fatigue, so a tired team
can still get home. This campaign departure policy does not change isolated
trial actions or introduce a global injury/healing shortcut.

Recover Blackwood's journal and specimen, then `prepare home alex ben`, wait
for walking, and `send home alex ben`. At home, delegate
`order alex deliver journal 3 3` and `order ben deliver specimen 3 5`.
After delivery, `order ben study bench marsh-lead` requires both objects and the
two independent records near the bench for physical work. The dated finding
opens the Kestrel depot; merely collecting every map marker does not.

For the depot survey, carry `kit` to Kestrel and `order alex study station
depot-survey`. Leaving the reusable kit there frees a return carrier for meals.
Recovered `dockets` must be delivered beside the home pad to fund future trips.
All removed supplies remain removed on revisit.

The gallery route recovers SCP-1370 without combat. Deliver `exhibit` to home
(13,3), `order alex study display safe-exhibit`, then walk outside the bay so
its door can close. The exhibit retains its original pawn identity.

## Cooperative Care Transfer

`brief care` describes an original closing aid station, not an SCP article.
Mira accepts escort but not direct pawn orders. Her minor wound bleeds at
0.1 blood loss per tick, including while unattended. Casey has two finite
stabilization charges. A medic should `order casey treat mira` before
`order casey escort mira 2 3`. The responder approaches and the person walks on
her own turn. Escort places the person at the exact destination and yields
the tile rather than stacking them.

When both queues finish in the loading area, `send home casey mira` transfers
both actual people; this care route permits one walking passenger per group. At home,
`order casey escort mira 6 2`, wait for arrival, then `admit mira bed`.
Admission requires proximity and stopped bleeding, queues ordinary rest and
enables home needs autonomy. Injury and lost blood remain; Mira is a resident,
not a cloned staff recruit.

Cancel the leader's escort to release following on the next tick. The person
stays where she is. If she becomes incapable, stabilize and carry her through
ordinary `take` and staff preparation instead; do not list a carried passenger
again in `send`. Supply-backed clinical care can address blood-loss incapacity
after evacuation; severe wounds need other treatment. A partial
withdrawal leaves the same patient at the same persistent site, with no reset.

The [care-transfer walkthrough](tests/care-transfer.txt) uses normal commands:

```sh
npm run sim < src/simulation/catalog/campaign/tests/care-transfer.txt
```

## Equipment-Backed Intervention

`brief intervention` describes an original hostile anomaly in a bounded yard.
The route visibly opts dispatched staff into lethal-risk mortality (twelve
critical ticks). Equip the real `suppressor` and `vest` at home with
`order alex equip suppressor` and `order alex equip vest`, then prepare/send.
An item merely carried in hand is not worn. `unequip` physically places gear
on the ground. Worn gear travels with the wearer and remains with the body
after death; another worker can recover it without restoring charges/condition.

The home holds three finite `suppression-units`. With the serviceable tool worn,
bring a unit beside the worker (or carry it) and `order alex rearm suppressor`.
Six ticks and one unit restore one charge, up to capacity two. Cancellation
keeps a consumed unit but does not grant an unfinished charge; body-recovered
tools use exactly the same operation. There is no automatic or infinite refill.

Actual use publishes one-time equipment warnings when worn armor reaches low
condition or breaks, and when a tool/medical kit spends its final charge.
Automatic `run` can stop on those notices before the next intervention; they
do not refill the item or roll back the impact that caused them.

Worn condition has separate maintenance: bring a real maintenance pack and the
equipment to `workshop`, then `order alex repair-equipment vest workshop`.
Ten productive ticks restore up to40 condition, capped at100, without refilling
charges or replacing the item. Funded cancellation loses the part without
granting unfinished repair. Cases, restraints and specimens are not generic
equipment-repair targets. In the compact home clinic, move the clinician aside
after treatment if their position blocks the recovered worker's exit.
Funded repair reserves both its actual equipment and bench until completion or
explicit cancellation/interruption. Moving/equipping/transferring that gear
cannot silently hand it to a second paid repair; losing access does not release
the original commitment merely because progress resets.

`order alex subdue specimen` uses one of the fictional instrument's two charges
for temporary eighty-tick subdual. This does not produce consent or heal the
subject. Armor reduces impacts but wears out and does not erase bleeding.
The ordinary cargo slot remains available while tool/armor are worn; `@held`
refers to that loose cargo rather than the worn equipment.

```sh
npm run sim < src/simulation/catalog/campaign/tests/intervention.txt
```

The initial intervention rehearsal withdraws after subdual. For live recovery,
carry `restraint` before departure, subdue the specimen, then
`order alex restrain specimen @held`. Its real item attaches after four work
ticks; only then can the hostile subject depart as carried cargo. When it wakes,
it remains noncooperative but can be escorted under effective restraint.
Conscious struggle consumes one restraint condition per tick, including transit.
At zero condition the broken item remains and the subject escapes its carrier.
Inspect the subject/status for remaining restraint condition before travel.

Crossing twenty restraint condition during conscious struggle emits a warning
before breakage. Carry the actual `spare-restraint` and use the same `restrain`
order under subdual or secure containment to exchange bands. The old band stays
attached throughout work, then remains a loose item with its existing wear;
the replacement does not magically repair it. Cancelling before completion
leaves both original ownership relationships unchanged.

```sh
npm run sim < src/simulation/catalog/campaign/tests/restrained-return.txt
```

This is temporary physical custody, not safe indefinite containment. The home
`holding` cell must be repaired with a maintenance pack and serviced with an
actual power unit first. Deliver parts beside (14,7), then `service holding`.
After return, `order alex contain @held holding` physically admits the restrained
subject. `unrestrain specimen` can recover the original band while containment
is effective. The cell can perform the physical `kinetic-intake` study.

Coverage lasts 120 ticks with a warning forty ticks early. Assign a worker to
the cell's ordinary service duty or schedule manual service; there are only
three initial power units. `order ben lockdown holding` spends a nearby
maintenance pack and three work ticks to buy eighty fallback ticks. It is not
an infinite reset. If both coverages lapse the same hostile is released at the
hatch; re-subdual, restraint and restored service are required for safe intake.
Status and events expose warning, breach, custody and fallback expiry.

```sh
npm run sim < src/simulation/catalog/campaign/tests/containment-cycle.txt
npm run sim < src/simulation/catalog/campaign/tests/connected-danger.txt
```

`connected-danger.txt` is one uninterrupted injured capture, restraint/return,
controlled study, staff wound/blood care, equipment repair/rearm and cell
fallback session. It keeps a real worker assigned to upkeep while the others
recover. Delaying fallback until after all medical/maintenance work is not
equivalent: a lapsed cell can release its hostile while staff are occupied.

Safe later transfer does not require a breach. Carry the original transport
band back to the cell and apply it while effective containment holds the awake
subject. Ordinary `take` or `deliver` can then extract the restrained subject;
an unrestrained live subject cannot be removed. A retained body can also be
physically recovered from a cell without resurrection.

Explicit Treat/Nurse orders may care for a nonallied custody subject only
while effective restraint or containment makes that access safe. The ordinary
bed/proximity/visibility/supply rules still apply; losing custody stops further
care without refund. Neither medical work nor recovery changes hostility or
consent. The original kinetic subject has a retained prior lesion and blood
loss to exercise this loop:

```sh
npm run sim < src/simulation/catalog/campaign/tests/secured-care.txt
```

These fictional game mechanics are not real equipment instructions.

Workers can operate a real door locally with
`order alex door gate closed`, `open`, or `automatic`. They approach and spend
two work ticks; a closing order waits until the doorway is physically clear.
There is no remote switch or forced displacement of a person/body/item.
The intervention yard starts with an open isolation gate. Closing it from the
loading side provides a physical withdrawal barrier, not consent, restraint,
controlled-study evidence or a replacement for the powered holding cell.
This bounded subject does not bash doors; opening the gate restores the risk.

The actual `kinetic-intake` finding unlocks `support`, a retained regional
cache. It holds three power units, two suppression units, two wound-care packs
and two maintenance packs. An outbound allocation and real carriers are still
required; two carriers cannot bring every category in one trip. Deliver power
beside holding or suppression stock beside the worker for existing service/
rearming actions. The cache does not respawn and reserve dispatch cannot
bypass the study gate. This makes physical research change later logistics
without adding an unlimited shop or instant completion reward.

## Permanent Casualties And Reserve Response

`brief accident` introduces an original urgent casualty. This route explicitly
opts Rowan into mortality: after blood loss reaches 100 with ongoing bleeding,
20 consecutive critical ticks cause permanent death. Status reports the
critical interval and death tick/cause. Prompt treatment can stop the bleeding;
ordinary nursing can then address blood loss. Previously authored peaceful
patients do not silently acquire this fatal clock.

For additional field stabilization, a trained medic can wear `medical-kit`
in the same tool slot used by the intervention instrument. Its three actual
supplies are consumed before the medic's separate initial allowance; while an
empty or broken kit is worn there is no silent fallback. The kit does not grant
training to other staff. `rearm medical-kit` spends one real
`field-medical-unit` and six work ticks per restored supply, up to three.
Unequipping, transit and body recovery preserve the same kit and its balance.

Crossing blood loss80 while bleeding emits a pre-fatal warning for opted-in
patients; entering the critical interval emits another identified warning.
Automatic `run` stops on those notices. The original accident's first warning
still leaves time to dispatch Devon, physically reach Rowan and stabilize him.
Ignoring warnings does not pause the fatal clock, including during transit.

If rescue is late, the body and its carried recorder remain the original
entities. Carry/deliver the body through ordinary transport; no treatment or
anomalous mending resurrects it. Dead workers stop needs, autonomy and every
queued commitment without refunds or deleting their equipment.

`reserve accident devon` dispatches the existing reserve medic through twelve
ticks of transit. `reserve home riley` requests the second existing responder.
Two reserved allocations and two actual people are the entire reserve, not
infinite replacements. These commands still work when the original crew is
lost, but perform no automatic rescue or healing. Keep arrival pads clear,
then use the responders to recover people/bodies and equipment physically.
Reserve dispatch respects the same research prerequisite as ordinary travel;
it cannot be used to open Kestrel before home corroboration.

```sh
npm run sim < src/simulation/catalog/campaign/tests/permanent-loss.txt
npm run sim < src/simulation/catalog/campaign/tests/crew-loss-recovery.txt
```

`crew-loss-recovery.txt` deliberately loses all three original staff through
ordinary yard combat, without injected health changes. Devon then physically
recovers Alex's original tool, spends one retained charge on the same hostile,
and returns Casey's body. Alex/Ben's bodies and the worn vest remain at the yard
for later recovery; the threat is only temporarily subdued, not magically
contained. Riley and one regional dispatch remain, along with two home trips.
This proves finite continuation after catastrophic loss, not unlimited rescue.

## Clinical Recovery After Evacuation

Stabilization stops bleeding; it does not restore lost blood. A late Mira rescue
can still carry her home without a free cure. Deliver her to (4,2), beside the
home `clinic`, and `order casey nurse mira clinic`. A medically trained worker
must physically reach the patient, who must be grounded beside the clinical
bed with no active bleeding.

One of four physical `clinical-packs` is spent at the start of a course. Sixteen
productive ticks restore up to 25 blood-loss points. Cancellation keeps the
spent pack and earned partial benefit. An empty supply stack, occupied bed or
patient elsewhere produces a visible blocker. After a completed supported
course, health-caused blood-loss incapacity can clear; wounds remain under this
default course, and arbitrary `canAct = false` is not healed.

`order casey nurse alex clinic wounds` explicitly chooses the separate wound
course. It spends one of three initial wound-care packs over twenty productive
ticks for up to forty severity recovery. Original wound IDs and the actor,
supply and reduction records remain. Wound-caused incapacity can clear after a
completed supported course, but brain/organ trauma and death cannot. Interruption
keeps both partial improvement and the consumed pack. This is a fictional game
care model, not a clinical procedure or medicine recipe.

```sh
npm run sim < src/simulation/catalog/campaign/tests/injured-return.txt
```

Then escort/admit the recovered person for ordinary rest. This is an abstract
game care model, not a medical procedure or drug recipe. The
[late-rescue walkthrough](tests/carried-recovery.txt) deliberately waits until
Mira cannot walk and completes the entire rescue through normal commands:

```sh
npm run sim < src/simulation/catalog/campaign/tests/carried-recovery.txt
```

[SCP-2295 supported care](../quests/scp2295/README.md) extends this with specific
lung replacement, finite textiles/self-fabric and paid postoperative nursing.
`brief triage` explains the two-adult transfer. The bear acts on the youngest
nearby major-organ patient; brain trauma is not repaired. Positioning and
follow-up matter, and unrelated injuries are retained.

## SCP-507 Returnee

The [SCP-507 returnee route](../quests/scp507/README.md) reuses cooperative
walking, nested cases, physical transfer and home review. `brief returnee`
introduces the source-backed contact and original local log. A person-only
return leaves the log behind; a complete retrieval brings the person, his
personal flashlight and cased evidence as their original records. The review
does not verify an alternate-world journey or simulate future shifts.

## Persistent Remote Service

The [SCP-1295 diner](../quests/scp1295/README.md) needs real food, a maintenance
pack and an assigned worker, not a recovered object. `assign alex counter`
reuses ordinary physical repair/service and food/rest routines while you view
home. Service deadlines and source receipts remain visible in `status` and
`inspect counter`. A lapse blocks counter use until a later service, but does
not close the entrance or erase patrons. Revisit preserves depletion and
completed repair. `assign alex none` clears future duty without cancelling
current paid work.

Each started service now emits one due warning and one lapse warning at the
receipt-derived transition ticks, even while the manager views another site.
Automatic `run` stops for these notices; unstarted stations do not generate
repeating alarms. When a tick contains both a routine warning and an actual
death/breach/escape, the more severe incident is presented first and all events
remain available for inspection. Cell primary warnings share this service
mechanism rather than being duplicated in the subject's custody logic.

The [SCP-2006 screening annex](../quests/scp2006/README.md) reuses this duty
loop for the selected containment showcase. Each host physically rehearses;
unused approved programmes and the actual audience are required. Prints are
retained, not consumed or cloned, and each counts once at the rig. `brief
screening` explains the finite curation/staffing loop and its explicitly
unmodeled psychological/shapeshifting behavior.

## Bounded Store Evacuation

[SCP-3008](../quests/scp3008/README.md) combines field service, clinical care,
escort/carry and a timed return. `brief store` introduces the fixed sector and
its two survivors. First responder entry starts a persistent day/night cycle;
night employees cause capped, nonlethal wounds and the exit reports its next
reopening. Restore the shelter and use field care, or carry the casualty home
and spend a home pack instead. Two walking passengers fit this route's larger
loading area. Neither path resets the people or the site.

## Protective Courier Handling

`brief courier` introduces an original nonliving fragile-vial recovery.
Bring the real home `case`; the depot's case is already too worn. Bare pickup
of `vial` is refused by its handling protocol. While carrying a compatible
empty case, `order alex pack vial case` approaches and spends five ticks
sealing it. Completion costs ten case condition; cancellation before closure
does not charge partial wear. Cases hold one specimen and cannot contain people
or other cases.

The case and specimen are separate persistent entities in a carried ownership
tree. Ordinary staff preparation and transport move both without duplication.
`inspect case` shows contents and retained condition. At home, move Alex to
(3,5) and `order alex unpack case` for two ticks. Unpacking leaves the vial at
the worker's feet and does not restore case condition. Then
`order alex study bench courier-inspection` physically inspects the exposed
vial and its actual case. A sealed specimen is not available for study.

No case repair, automatic replacement, chemical hazard or protective damage
multiplier is modeled. The useful decision is preparation and scarce carrying
capacity, not a hidden breakage roll. The [courier walkthrough](tests/courier.txt) is copyable:

```sh
npm run sim < src/simulation/catalog/campaign/tests/courier.txt
```

`save <new-path>` and `restore <path>` preserve the entire ongoing session,
including in-progress delivery/study and transit. Success does not stop the
campaign; partial recovery does not reset a site. Development saves are
disposable and only current versions load.

The [home-loop walkthrough](tests/home-loop.txt) is a normal-command,
test-only example of recovery, home study, equipment use and supply return.
The [connected management session](tests/connected-management.txt) adds early
resident care and group evacuation in the same saved campaign, without resets:

```sh
npm run sim < src/simulation/catalog/campaign/tests/home-loop.txt
npm run sim < src/simulation/catalog/campaign/tests/connected-management.txt
```

## Attribution And Limits

Blackwood evidence adapts [SCP-1867 by Djoric](../quests/scp1867/README.md);
the gallery adapts [SCP-1370 by Sorts](../quests/scp1370/README.md), both under
CC BY-SA 3.0. Their source/adaptation notes also appear in object inspection.
This campaign, Kestrel depot and the transport agreement are original game
fiction offered under the same license, not canonical SCP events. No images
are included.

The home also hosts a [bounded SCP-294 experiment](../quests/scp294/README.md),
with finite paid requests and source-conserving samples. Use `brief scp294`.

Peaceful routes retain their authored nonfatal behavior; explicit mortality
now exists for opted-in health and the accident scenario. Hostile capture,
vehicle simulation and automatic resupply are not yet implemented. Incapacitated staff can be carried by available responders
through existing physical rules. Treatment stabilizes bleeding; finite bedside
care can improve blood loss, but neither is a universal wound cure. The bounded
store has capped night impacts, not source-level lethal combat. Running out of every transport allocation prevents additional
departures, not prepaid return or continued home management.
