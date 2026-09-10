# Provisional Site Campaign

Run `npm run sim` from `src_web`. `brief` introduces the finite home site;
`status` shows personnel, supplies, route gates, transit blockers and findings.
`brief blackwood`, `brief gallery` and `brief kestrel` explain the next work.
Use `site home` or the route name to inspect a retained site.

The home begins with Alex, Ben and Casey, eight meals, four round-trip transport
allocations, a reusable field kit, a comparison bench, independent records,
ordinary rest furniture and a glass display bay. No campaign command deploys
new staff. Home routines can be enabled with `autonomy casey on`.

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
both actual people; there is at most one walking passenger per group. At home,
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
course, health-caused blood-loss incapacity can clear; wounds remain, severe
wound incapacity does not clear, and arbitrary `canAct = false` is not healed.

Then escort/admit the recovered person for ordinary rest. This is an abstract
game care model, not a medical procedure or drug recipe. The
[late-rescue walkthrough](tests/carried-recovery.txt) deliberately waits until
Mira cannot walk and completes the entire rescue through normal commands:

```sh
npm run sim < src/simulation/catalog/campaign/tests/carried-recovery.txt
```

Core version 15 records incapacity cause and paid clinical work. Old development
saves are discarded, not migrated.

## SCP-507 Returnee

The [SCP-507 returnee route](../quests/scp507/README.md) reuses cooperative
walking, nested cases, physical transfer and home review. `brief returnee`
introduces the source-backed contact and original local log. A person-only
return leaves the log behind; a complete retrieval brings the person, his
personal flashlight and cased evidence as their original records. The review
does not verify an alternate-world journey or simulate future shifts.

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
capacity, not a hidden breakage roll. Case state was introduced in core version
14 without save migrations. The [courier walkthrough](tests/courier.txt) is copyable:

```sh
npm run sim < src/simulation/catalog/campaign/tests/courier.txt
```

`save <new-path>` and `restore <path>` preserve the entire ongoing session,
including in-progress delivery/study and transit. Success does not stop the
campaign; partial recovery does not reset a site. Development saves are
disposable and only current versions load.

The [home-loop walkthrough](tests/home-loop.txt) is a normal-command,
test-only example of recovery, home study, equipment use and supply return:

```sh
npm run sim < src/simulation/catalog/campaign/tests/home-loop.txt
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

This slice has no death, hostile capture, vehicle simulation or automatic
resupply. Incapacitated staff can be carried by available responders
through existing physical rules. Treatment stabilizes bleeding; finite bedside
care can improve blood loss, but neither is a universal wound cure. There is no authored combat in these
campaign routes. Running out of every transport allocation prevents additional
departures, not prepaid return or continued home management.
