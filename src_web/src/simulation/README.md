# Replacement Simulation

This is the headless replacement engine and its playable text campaign.
The browser still runs [simulation_legacy](../simulation_legacy); implementing
a replacement mechanic does not mean it has been ported to the browser.

**Open the file for a thing to understand that thing.** Core owns generic
mechanics. Catalog owns named definitions, physical setups, source attribution
and adaptation choices. Actions execute through one ordinary pawn queue.

## Start Playing

From `src_web`, with the project's supported Node version:

```sh
npm run sim
npm run sim < src/simulation/catalog/campaign/tests/connected-management.txt
npm run sim < src/simulation/catalog/campaign/tests/connected-danger.txt
npm run sim < src/simulation/catalog/campaign/tests/crew-loss-recovery.txt
npm run sim -- --strict < src/simulation/catalog/campaign/tests/connected-danger.txt
```

Start with `brief`, `status`, `map` and `help`. The
[campaign guide](catalog/campaign/README.md) explains the finite home roster,
equipment, care, research, routes and fallback choices. Transcripts are
test-only normal commands, never imported or executed by gameplay.
Use `status work` for a compact current-operations view without the full
portfolio, using the same authoritative queues/coverage/device state.
The CLI and benchmark use Vite only as a local module loader, with HMR and
WebSocket listeners disabled; they do not compete with the browser dev server
for a hot-reload port.
For automation, `--strict` stops on an invalid or rejected input command and
returns exit1 with line context. It uses the same parser and does not roll back
earlier work. Default interactive/piped behavior still permits correcting an
error; strict command validity is not a claim that a quest or risky operation
succeeded.

| Command                              | Meaning                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `order alex take meals 2`            | Physically collect a portion from a stackable supply                                                              |
| `order alex deliver @held 7 4`       | Collect/carry/drop the worker's actual loose cargo                                                                |
| `prepare blackwood alex ben`         | Assign ordinary assembly movement, with autonomy off                                                              |
| `finish alex ben`                    | Advance captured work, linked followers and existing transport, stopping on a blocker/failure or after 1000 ticks |
| `send blackwood alex ben`            | Depart only when the actual team is physically prepared                                                           |
| `site blackwood`                     | Change the inspected retained site, not the simulation clock                                                      |
| `inspect @1`                         | Read the actual entity, including across sites or in transit                                                      |
| `queue alex` / `cancel alex`         | Inspect or remove an intention, without refunding work                                                            |
| `assign ben holding`                 | Assign one recurring service duty using ordinary autonomy                                                         |
| `run 200`                            | Advance until a new critical alarm, quest result or the requested limit                                           |
| `step 20`                            | Deliberately advance exactly twenty complete ticks                                                                |
| `save <new-path>` / `restore <path>` | Save or restore the same ongoing session                                                                          |

Commands append rather than replace queued work. Accepted does not mean
executing now or guaranteed to succeed. `queue` and `finish` expose blockers.
`@held` is scoped to the ordering worker's one loose carried object, excluding
worn equipment and attached restraints. Exact IDs and stable labels are
unambiguous; ambiguous aliases are rejected.

Pawns have stable `@N` labels and other objects `oN`. Home staff receive the
first labels. Labels are never reused after removal, and map cells widen for
multi-digit labels. Coordinates are zero-based. `++` marks stacked ground
occupants; every entity remains listed below the map.

Global inspection does **not** grant remote gameplay control. Transit
inspection reports the real owner, arrival/blocker, health, gear and custody
with no invented map position or local-autonomy preview. Orders remain
selected-site scoped.

## Dependency And File Ownership

```text
adapters -> application -> simulation/catalog -> simulation/core
core -X-> catalog, application, adapters, browser, legacy
```

Core accepts supplied definitions/materials. It has no hidden default catalog,
registration singleton, DOM, storage, network, wall-clock timer or random
global. State is plain serializable data, not saved handler instances.

| Area                         | Main entry points                                                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequential state/ticks       | [Simulation.ts](core/Simulation.ts), [Snapshot.ts](core/Snapshot.ts)                                                                               |
| Entity definitions/instances | [Entity.ts](core/entity/Entity.ts), [EntityTemplate.ts](core/entity/EntityTemplate.ts), [EntityPlacement.ts](core/site/EntityPlacement.ts)         |
| Spatial rules/ownership      | [Site.ts](core/site/Site.ts), [TileMap.ts](core/site/TileMap.ts), [Pathfinding.ts](core/site/Pathfinding.ts), [Transfer.ts](core/site/Transfer.ts) |
| Pawn work/control            | [Pawn.ts](core/entity/pawn/Pawn.ts), [ActionQueue.ts](core/entity/pawn/actions/ActionQueue.ts), [ControlPolicy.ts](core/ControlPolicy.ts)          |
| Health/custody/gear          | [Health.ts](core/entity/pawn/Health.ts), [Custody.ts](core/entity/pawn/Custody.ts), [Equipment.ts](core/entity/Equipment.ts)                       |
| Named home/routes            | [Home.ts](catalog/campaign/Home.ts), [setup.ts](catalog/campaign/setup.ts), [Campaign.ts](catalog/campaign/Campaign.ts)                            |
| Application/text surface     | [ScenarioSession.ts](../application/ScenarioSession.ts), [Console.ts](../adapters/cli/Console.ts), [Order.ts](../adapters/cli/Order.ts)            |

The catalog index lists definitions, not behavior. Named source-specific
content lives beside its own setup and README. Prefer small explicit contracts
earned by a playable scenario over a general quest/plugin/crafting framework.
Detailed architectural decisions live in [docs/decisions](../../docs/decisions).

## Sequential Ticks And Events

`advanceSimulation` clones the caller's state once, increments the global tick,
then visits sites and their starting entity IDs in case-sensitive sorted order.
Each entity sees earlier turns' changes. Removed IDs are skipped; newly added
IDs wait until the next tick. Transit physiology and admission occur after
local turns, without giving an arrival a second local turn.

This is not a simultaneous proposal/resolver system. First successful movement,
pickup or consumption wins. Later actors can enter a tile vacated earlier in
the same tick. Swaps, fairness rotation and general traffic optimization are
not implemented.

Every published event receives the authoritative simulation tick at this
boundary. The application can deliver the full current-tick batch to runtime
callers while saving only the most recent100 events. `run` and `finish` use the
full batch, so busy ticks cannot hide an early death or failed commitment.

Campaign `run` stops **after the complete tick** on new warning, breach, escape
or death. Death/breach/escape outrank routine warnings for presentation; all
events remain delivered. Old history does not repeatedly stop resumed time.
Explicit `step` and scoped `finish` remain deliberate operations, not implicit
rollback or automatic response. Batch mode returns exit2 if an alarm stops it.

`finish --alarms <workers...>` combines selected work/transport completion with
stopping on any new critical event, including remote sites. Ordinary `finish`
retains target-scoped stopping but reports a bounded highest-severity summary of
critical events it passed. Both use full tick delivery; old saved history never
creates a new alarm. This avoids silently passing a remote watcher's collapse
while waiting for a local worker to eat or sleep.

## Physical Entities And Ownership

An entity has a persistent ID, definition ID, material, amount and location.
An instance belongs to exactly one site or transfer. A location is ground or
carried by another entity in that owner's collection:

- A pawn carrying a case owns its ordinary cargo relationship.
- The case owns the same nested specimen, not a copied inventory entry.
- Worn equipment remains a carried item with its own condition and charges.
- A restraint is an attached item carried by its subject, not a consent flag.
- A holding facility owns the same contained pawn through that relationship.
- A dead pawn remains a body with its actual carried possessions.

`positionOf` resolves the ownership chain. Site instantiation gives local IDs
globally distinct identities and remaps supported local references. Loading a
save preserves exact IDs instead of instantiating copies.

Transfers require actual prepared ground roots, a valid loading area and empty
travelling pawn queues. They include the full carried dependency tree and move
the actual records into transit. Active work/gear leases and live-hostile
restraint requirements are rechecked. Blocked admission retains the transfer,
reason and payload while physiology/custody continue. Site disposal rejects
nonempty sites or active transfer endpoints.

Campaign rules add roster, route, readiness and passenger checks above generic
transfer. Travel is reusable without a lifetime trip entitlement; actual time,
loading capacity and finite supplies still matter. Outbound readiness requires
hunger/fatigue below85; exhausted crews may still return. Reserve dispatch
moves one of two pre-existing responders, not a new template or abstract ticket.
It respects research gates and performs no automatic rescue.

## One Action Queue

Each action owns `canStart` and `tick`; `ActionQueue` only dispatches and
advances the current commitment. Approach movement reuses `Move`, including
ordinary door opening. Multi-step delivery, care, packing and intake do not
create competing executors or hidden pawn queues.

| Outcome       | Queue meaning                                                              |
| ------------- | -------------------------------------------------------------------------- |
| `completed`   | Remove the intention; the next can begin next tick                         |
| `blocked`     | Wait for correction/cancellation with a reason                             |
| `failed`      | Remove the intention because its required target is gone                   |
| `interrupted` | End a commitment for incapacity, carrying, urgent response or retry policy |

Explicit queued work can depend on earlier work, so later intentions defer
physical eligibility until execution. A player authority check is repeated at
execution. Revoked permission pauses an order; it does not erase it. New
commands reset progress and strip paid-state markers; saved current work
retains them.

Cancelling never refunds consumed inputs, restores condition, moves cargo or
rolls back earned effects. Ordinary facility occupancy derives from productive
current work. Funded equipment repair additionally retains its bench and gear
claim until explicit resolution even after progress resets. Funded crafting
likewise holds its bench until actual queue resolution. No separate
reservation ledger is needed. Self-chosen work abandons eight consecutive
blocked ticks; this is a bounded retry policy, not a deadlock solver.

## Needs, Concerns And Routine Work

[Needs.ts](core/entity/pawn/Needs.ts) uses 0..100 deficits: zero is satisfied.
Highest satisfiable need wins, with need ID as the stable tie break. Providers
offer ordinary actions and next-productive-tick relief, not whole-session
rewards. Equal relief uses provider order. An unsatisfiable high need does not
prevent trying a lower one. There is no predictive utility or travel-cost
optimizer.

Observed [Threat](core/entity/pawn/concerns/Threat.ts) and
[Care](core/entity/pawn/concerns/Care.ts) concerns precede routines. Immediate
danger/confrontation, allied bleeding and distant withdrawal have distinct
priorities. Factions/hostility are explicit policy. There is no hearing,
shared radio knowledge or last-seen pursuit. Attack stops after losing sight;
an explicit Treat can approach its named patient but requires visibility at
the treatment position.

Autonomy off prevents new choices, not physiology or queued commitments.
Urgent concerns can interrupt suitable self-chosen work; explicit work is not
silently replaced. For an assigned service worker, authored critical need
thresholds allow ordinary food/rest before due work. A single service duty and
the organ-mending capability also produce normal queued actions.

[FacilityAction](core/entity/pawn/actions/FacilityAction.ts) shares approach,
exclusive use, signed need effects and bounded sessions. Sleep, Relax, Read,
Exercise and the earlier Research demonstration use it. Travel/blocked turns
earn no work. Self-chosen restorative work can finish when benefits are
satisfied; explicit sessions retain their duration. Research's local progress
counter is not the physical Study/finding system or a global technology currency.

Curiosity and Restlessness remain separate optional needs. Hygiene/washing
were removed by user direction. Social interaction, mood and richer psychology
remain future work; they are not additional invented bars here.

## Traversal, Sight And Material

`blocksMovement` and `blocksSight` are independent on tiles and entities.
Glass can block passage but transmit sight; opaque mist can do the reverse.
Unknown/out-of-bounds tiles permit neither. Carried objects do not independently
block their carrier's tile. Broken zero-integrity objects no longer obstruct,
but positive remaining material is not silently removed.

`traversalAt` returns clear, a blocker, or an automatic door requiring opening.
A closed automatic door can appear in a route but consumes an opening turn;
it never hides another blocker sharing that tile. Door closure observes actual
nearby ground occupants. Visibility uses deterministic line expansion and
corner checks, not roofs, height, light attenuation or volumetric fog.

`order <worker> door <door> <open|closed|automatic>` physically approaches and
sets policy over work ticks. Explicit closure rejects an occupied doorway;
it is not a remote command or a collision bypass. The original yard gate is a
local isolation fallback, not powered custody or a door-bashing simulation.

Materials define tags and optional nutritional density; a consumer's diet
defines compatibility/efficiency. Highest matching efficiency applies once.
An entity can override nutrition, including zero. Wood being plant/organic
does not make it ordinary edible plant food.

Eat consumes the minimum of rate, remaining amount and hunger requirement on
each productive tick. Partial food retains identity and location; depleted
objects are removed and later references fail explicitly. Material consumption
proportionally reduces optional integrity; impact damage changes condition
without inventing lost mass. Living pawns, occupied facilities, nested cargo
holders and objects carried by someone else are not food targets.

Quantity-aware Take only splits explicitly stackable ordinary supplies.
Whole-stack pickup preserves identity; a portion receives one new ID with
conserved quantity and per-unit condition. People, cases and identified
samples cannot be divided. There is no automatic stack merge or inventory editor.

## Danger, Custody And Recovery

The [original intervention loop](catalog/campaign/README.md#equipment-backed-intervention)
exercises equipment-backed danger without changing the peaceful source quests:

- Equip/Unequip physically fit actual items. Armor reduces impacts and wears;
  charged Subdue is temporary, not injury repair or cooperation.
- Rearm and RepairEquipment use real finite supplies and work. They retain
  gear identity and do not restore unrelated charges/condition.
- A trained medic's worn kit supplies stabilization; empty/broken worn kits
  do not silently fall back to a separate initial allowance.
- Restrain fits a compatible actual band under subdual or effective holding.
  Conscious struggle wears it locally and in transit. Low condition warns;
  breakage leaves the real item and releases carried custody.
- A band can be exchanged physically under safe conditions. The original
  remains attached during work and keeps its worn condition after replacement.
- Cooperative or effectively restrained walking uses linked Escort/Follow
  actions. Each pawn moves on its own turn; the follower uses the leader's
  vacated trail, and the destination is yielded to the passenger.
- Contain requires compatible, prepared holding and actual transport custody.
  Service provides finite coverage; Lockdown buys bounded emergency time with
  a physical part. Lapse releases the original subject at the hatch.
- Safe re-restraint and extraction permit later medical transfer without
  manufacturing a breach. Hostility and consent do not change through care.

Health separates wounds/bleeding, accumulated blood loss, organ trauma,
temporary subdual, pending postoperative recovery and permanent death.
Default Nurse addresses blood/postoperative care; explicit `wounds` chooses a
different finite course. Original wounds keep treatment provenance. Independent
postoperative and subdual obligations cannot be erased by another course.
Death, unresolved major organ trauma and arbitrary inability are not healed.

Mortality is explicit opt-in health data. Pre-fatal and critical warnings leave
a real intervention opportunity; ignoring them can cause permanent death.
Bodies stop physiology/work and retain gear/cargo. The
[catastrophic-loss transcript](catalog/campaign/tests/crew-loss-recovery.txt)
loses the original crew through actual combat, then uses an existing reserve
to recover original gear and one body. Other bodies remain for follow-up:
there is no infinite rescue, free replacement or resurrection.

## Study, Crafting, Service And Named Content

[Watch](core/entity/pawn/actions/Watch.ts) is a separate finite direct-attention
commitment. [Attention](core/entity/pawn/Attention.ts) derives valid conscious
human coverage from current work, sight and availability; it saves no duplicate
observer registry. An opted-in source cannot move/attack while held. Supervised
stations require the actual subject and other observers beside the work area.
The [SCP-173 annex](catalog/quests/scp173/README.md) exercises coverage, relief,
third-worker work and locked withdrawal after prior campaign research.

Specifically authored companion gaze can supplement that coverage using the
same physical availability/sight query, without substituting for human work
supervision or guarded relief. The [SCP-131 visit](catalog/quests/scp131/README.md)
uses two actual passengers and a retained-site research prerequisite, not a
remote camera flag or general warden programme.

[Observe](core/entity/pawn/actions/Observe.ts) operates an actual carried
recorder from a visible vantage. [ImpactRecording](core/entity/ImpactRecording.ts)
captures only a real impact seen by an active, capable operator; it does not
mine global history or perform another pawn turn. Records remain with the
device through withdrawal, incapacity, death and recovery. Bounded capacity
retains earlier evidence; quiet watching or cancellation grants no knowledge.

Study physically requires identified intact sources, productive work and a
station. Findings retain actor, tick and actual source IDs. Repeated ordinary
plans do not duplicate findings; per-actor rehearsal plans qualify each host
separately. A contained-source plan requires actual ownership by effective
holding throughout work, not a nearby carried subject. Dead bodies cannot
satisfy a living-source study. Record-based plans instead require qualifying
physical recordings and preserve their incident IDs in the finding. They can
support useful engineering after a casualty without erasing that casualty.

[Craft](core/entity/pawn/actions/Craft.ts) turns a recorded finding into an
authored item through actual bench work and physical supplies. Its small
[profile](core/entity/Crafting.ts) names one input quantity, a finding
prerequisite and an explicit item blueprint, not a recipe expression language.
Payment happens at work start; completion creates one loose output with dated
material and research provenance. Cancellation never refunds parts.
The [kinetic engineering loop](catalog/campaign/KineticEngineering.ts) produces
a slower-wearing restraint after controlled study of the actual resident.
`brief engineering` explains the player situation.

[Process](core/entity/pawn/actions/Process.ts) loads and activates an actual
[Processor](core/entity/Processor.ts), then finishes its pawn commitment.
The machine owns its input and timer independently in ordinary facility turns.
Output is atomic, source-identified and physical; blocked release neither
duplicates output nor prematurely consumes the input. The
[SCP-914 trial](catalog/quests/scp914/README.md) exercises this during an injured
operator's home care, with two bounded nonliving choices and no conversion loop.

Service physically repairs/provisions a station using exact finite inputs.
Coverage derives from dated receipts; due/lapse warnings have no extra timer.
Reusable programmes retain their identity and are claimed during presentation;
distinct-input rules prevent counting the same print twice. Clearing a duty
does not cancel current funded work.

| Content                                      | Playable purpose and source notes                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [SCP-1867](catalog/quests/scp1867/README.md) | Home corroboration opens retained Kestrel logistics; Blackwood remains off-map                                       |
| [SCP-1370](catalog/quests/scp1370/README.md) | Recover the same pawn into a physical home display                                                                   |
| [SCP-294](catalog/quests/scp294/README.md)   | Four paid requests, exact source depletion and identified repeat samples                                             |
| [SCP-507](catalog/quests/scp507/README.md)   | Ordinary-world passenger/flashlight/cased-record return; no subsequent shifts                                        |
| [SCP-2295](catalog/quests/scp2295/README.md) | Youngest-patient lung replacement, finite textile/self-material and postoperative care; no brain cure                |
| [SCP-1295](catalog/quests/scp1295/README.md) | Real remote staffing, repair and resupply; no global harmful effects                                                 |
| [SCP-2006](catalog/quests/scp2006/README.md) | Per-host rehearsal and distinct curated programmes, not arbitrary psychology/shapeshifting                           |
| [SCP-173](catalog/quests/scp173/README.md)   | Conscious direct watch, overlapping relief and three-person maintenance; no image, automatic blinking or relocation  |
| [SCP-131](catalog/quests/scp131/README.md)   | Two physical companions with bounded supplemental gaze, not human staffing or general wardens                        |
| [SCP-914](catalog/quests/scp914/README.md)   | Independent machine-owned nonliving gear processing, not arbitrary recipes or an operator-bound repair job           |
| [SCP-3008](catalog/quests/scp3008/README.md) | Field-care versus carried-evacuation choice, retained cycle and fixed reopening; explicitly capped nonlethal impacts |

Source credit and adaptation limits live beside each named entry. Original
care/courier/intervention scenarios establish reusable mechanics without
distorting an SCP to fit them. The [portfolio checkpoint](../../docs/scp-expedition-priorities.md)
distinguishes implemented bounds from future candidates. No new images or
browser bindings are implied.

## Isolated Trials, Saves And Verification

`--scenario response|daily|colony|consumption|scp1867|scp1370` selects an
isolated quest; `sight` is a sandbox. The two isolated recovery quests require
`deploy <staff-type> <name>` then `start`. Deployment creates trial actors at
authored entry tiles and binds actual identities to quest roles. Campaign
travel instead moves its finite existing roster. Trial setup does not tick.

[Quest.ts](core/quest/Quest.ts) observes state/events without ordering actors
or owning sites. Failure precedes simultaneous success; success can occur on
the deadline tick before timeout. Final results and event counters persist,
while state conditions describe the actual current world. Re-evaluating the
same tick is idempotent. Role bindings separate objectives from concrete names
and test setups; the evaluator is not a general branching quest language.

Current save versions are defined by `SIMULATION_VERSION` in
[Simulation.ts](core/Simulation.ts) and the session contract in
[ScenarioSession.ts](../application/ScenarioSession.ts). [Snapshot.ts](core/Snapshot.ts)
and `restoreSession` perform JSON/root/version checks, not deep gameplay
validation or repair. Development saves are disposable: incompatible versions
are discarded without migrations or retained old implementations. Save requires
a new filename; restore preserves exact identities, work, receipts and labels.

Batch exits are 0 for finished/sandbox work, 1 for quest failure, and 2 for
setup, unfinished quests or alarm-stopped runs. A build's deployment-artifact
verification is a local check, not authorization to deploy.

```sh
npm run test:simulation
npm run typecheck
npm run check
npm run benchmark:simulation -- 40
```

Use targeted existing tests during a slice and the full existing pipeline at
integration checkpoints. Tests cover ownership/resource conservation, blocked
work, partial failure, current-version replay and actual normal-command play.
The benchmark is a local measurement, not a guaranteed performance target.
Do not preserve obsolete mechanics merely to satisfy an old fixture.

The replacement still lacks the browser port, broad construction/power economy,
full anatomy, arbitrary SCP behavior, infinite procurement and a general traffic
planner. Tight spaces and greedy local fleeing can still require explicit
orders. Automated play proves objective behavior, not subjective fun or full
canonical containment. Historical decisions explain why contracts changed;
this guide describes what callers can use now.
