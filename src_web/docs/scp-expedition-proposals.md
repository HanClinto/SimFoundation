# SCP Expedition Proposals

Draft for review, 2026-09-09. These are proposed adaptations, not implementation commitments or claims that the source articles describe these missions. Full source spoilers follow.

## Decision Framework

Rank the smallest version that preserves the interesting decision, not the cheapest collectible with an SCP label. Evaluate field play, persistent facility consequences, reusable systems, and authoring cost together. A strong expedition should change what the player does after returning home.

Current implementation supports authored notices, one expedition with two or three existing staff, physical assembly and travel, independent field maps, tactical orders, finite ammunition and medical kits, physical object recovery, and return with persistent injuries and objects. It does not yet support live capture, civilian evacuation, knowledge-only completion, persistent revisits, dynamic opportunity scheduling, or field construction. See [Expedition Operations](expeditions.md) and [scenario definitions](../src/simulation/expedition-site.ts).

The broader [roadmap](roadmap.md) contains historical aspirations, including superseded prototypes. Its headings are not proof of implementation. This draft follows the current single-level underground base, inspectable simulation, disposable development saves, and preference for reusable physical work over disconnected unlock buttons.

Source snapshots and attribution remain in the [reference catalog](references/README.md). Canonical properties and invented mission premises are separated below. Historical copies of removed works are reference evidence, not a recommendation to ship them without an editorial and licensing review.

## Scope And Scoring

Coverage: **59 distinct works**, comprising the 58 Wiki URLs in Abby's list plus the separately archived SCP-963. Multiple snapshots of SCP-999 are one proposal; the current removal notice for The Factory is not an additional fictional anomaly. The five companion tales have their own proposals. Source links below select the reviewed snapshot, including historical copies where necessary.

This is a design review of the archived article premises, procedures, and relevant addenda, not a complete adaptation of every experiment or embedded performance. Linked external exploration reports, such as the SCP-093 color tests and SCP-610 field logs, are not automatically part of the archived parent article and are not treated as reviewed evidence. SCP-2521's written/spoken/pictorial distinction was checked against its local diagrams, not inferred from its nearly empty text export. SCP-3007's visual revelation needs a separate art/source review before adapting that revelation.

All opportunity hooks, map layouts, optional objectives, rewards, timings, and mechanical numbers proposed here are original game design unless explicitly attributed to a source. Starting an article before its final canonical state, relocating an object, or transferring a resident to Site 828 is an alternate campaign premise. Do not silently claim that neutralized anomalies are still active. Do not automatically merge the tales into one definitive origin story.

Scores describe the **bounded proposal below**, including its first meaningful base payoff:

- **F, expected fun (1-5):** 1 is mainly a collectible; 3 supports a worthwhile decision; 5 combines strong tactical or management choices with a distinctive payoff. This is a hypothesis, not playtest data.
- **E, total effort (1-5):** 1 is mostly an authored map using existing recovery; 2 is a small local behavior and record; 3 needs one substantial reusable subsystem; 4 needs several interacting subsystems; 5 changes a fundamental simulation boundary. Includes content, UI, persistence, art, and testing. These are relative sizes, not calendar estimates.
- **R, reuse (1-5):** how much of that investment benefits other proposals. High reuse is not permission to build a framework without a working scenario.
- **Rank:** editorial portfolio priority, not a computed quotient. Favor fun per effort, recurring facility decisions, and distinct experiences; avoid selecting five variations of the same retrieval. Dependencies still determine build order. Adjacent ranks are not meaningfully precise.

Confidence is medium for small object/recovery proposals and low for social, identity, cosmic, and reality-shifting systems. E can move a full band after the first implementation. Research, live transport, and field work are not assumed free just because several entries share them. Do not add the E numbers as person-weeks.

## Ranked Index

| Rank | Work                                                                         | F   | E   | R   | Recommendation                         |
| ---- | ---------------------------------------------------------------------------- | --- | --- | --- | -------------------------------------- |
| 1    | [SCP-1867](#p01-scp-1867)                                                    | 5   | 3   | 5   | First connected investigation          |
| 2    | [SCP-1370](#p02-scp-1370)                                                    | 4   | 2   | 4   | Small recovery tutorial                |
| 3    | [SCP-294](#p03-scp-294)                                                      | 5   | 3   | 5   | First bounded experiment station       |
| 4    | [SCP-2295](#p04-scp-2295)                                                    | 5   | 4   | 5   | Medical follow-through                 |
| 5    | [SCP-1295](#p05-scp-1295)                                                    | 5   | 4   | 5   | First field support operation          |
| 6    | [SCP-173](#p06-scp-173)                                                      | 5   | 4   | 5   | Containment showcase                   |
| 7    | [SCP-507](#p07-scp-507)                                                      | 4   | 3   | 5   | Recurring escort contact               |
| 8    | [SCP-3008](#p08-scp-3008)                                                    | 5   | 4   | 5   | Later expedition showcase              |
| 9    | [SCP-2006](#p09-scp-2006)                                                    | 5   | 3   | 4   | Behavioral containment                 |
| 10   | [SCP-1437](#p10-scp-1437)                                                    | 4   | 3   | 5   | Recurring intake operation             |
| 11   | [SCP-348](#p11-scp-348)                                                      | 3   | 2   | 4   | Quiet care-focused reward              |
| 12   | [SCP-049](#p12-scp-049)                                                      | 5   | 4   | 5   | Extend the existing encounter honestly |
| 13   | [SCP-529](#p13-scp-529)                                                      | 3   | 2   | 3   | Low-risk resident variety              |
| 14   | [SCP-1762](#p14-scp-1762)                                                    | 4   | 3   | 3   | Optional emotional story arc           |
| 15   | [SCP-1171](#p15-scp-1171)                                                    | 4   | 3   | 4   | Noncombat contact mission              |
| 16   | [SCP-999](#p16-scp-999)                                                      | 3   | 2   | 4   | Deepen existing resident care          |
| 17   | [SCP-1545](#p17-scp-1545)                                                    | 4   | 3   | 4   | Bounded rescue puzzle                  |
| 18   | [SCP-1981](#p18-scp-1981)                                                    | 4   | 3   | 4   | Evidence and media study               |
| 19   | [SCP-073](#p19-scp-073)                                                      | 4   | 4   | 4   | Cooperative resident logistics         |
| 20   | [SCP-2662](#p20-scp-2662)                                                    | 5   | 4   | 5   | Protect the resident from intruders    |
| 21   | [SCP-2952](#p21-scp-2952)                                                    | 4   | 4   | 4   | Repair and diplomacy                   |
| 22   | [SCP-701](#p22-scp-701)                                                      | 5   | 4   | 5   | Prevent an event, not defeat a boss    |
| 23   | [SCP-504](#p23-scp-504)                                                      | 4   | 3   | 4   | Acoustic handling puzzle               |
| 24   | [SCP-179](#p24-scp-179)                                                      | 3   | 3   | 4   | Ground-based warning support           |
| 25   | [SCP-1000](#p25-scp-1000)                                                    | 4   | 4   | 4   | Contact and contested evidence         |
| 26   | [SCP-1983](#p26-scp-1983)                                                    | 5   | 5   | 4   | Later lighting-rule expedition         |
| 27   | [SCP-087](#p27-scp-087)                                                      | 4   | 4   | 4   | Bounded reconnaissance                 |
| 28   | [SCP-093](#p28-scp-093)                                                      | 5   | 5   | 5   | Future linked-map campaign             |
| 29   | [SCP-1048](#p29-scp-1048)                                                    | 5   | 4   | 4   | Later missing-materials investigation  |
| 30   | [SCP-096](#p30-scp-096)                                                      | 5   | 5   | 4   | Information-handling showcase          |
| 31   | [SCP-191](#p31-scp-191)                                                      | 4   | 4   | 4   | Power-dependent medical rescue         |
| 32   | [SCP-745](#p32-scp-745)                                                      | 4   | 4   | 3   | Small roadside recovery                |
| 33   | [SCP-342](#p33-scp-342)                                                      | 3   | 3   | 3   | Intercept before activation            |
| 34   | [SCP-3001](#p34-scp-3001)                                                    | 3   | 3   | 3   | Returned-device investigation only     |
| 35   | [SCP-4999](#p35-scp-4999)                                                    | 3   | 2   | 3   | Respectful aftermath investigation     |
| 36   | [Ethics Committee Orientation](#p36-ethics-committee-orientation)            | 4   | 3   | 5   | Cross-mission review layer             |
| 37   | [Marianas Trench document](#p37-document-recovered-from-the-marianas-trench) | 3   | 2   | 3   | Campaign evidence thread               |
| 38   | [SCP-3333](#p38-scp-3333)                                                    | 5   | 5   | 4   | Identity and extraction thriller       |
| 39   | [SCP-953](#p39-scp-953)                                                      | 4   | 5   | 4   | Defer deceptive-identity gameplay      |
| 40   | [Taboo / SCP-4000](#p40-taboo)                                               | 5   | 5   | 4   | Future protocol expedition             |
| 41   | [SCP-2521](#p41-scp-2521)                                                    | 5   | 5   | 4   | Future communication hazards           |
| 42   | [SCP-993](#p42-scp-993)                                                      | 3   | 4   | 4   | Broadcast interruption only            |
| 43   | [SCP-2030](#p43-scp-2030)                                                    | 3   | 3   | 3   | Missing-person evidence case           |
| 44   | [SCP-1281](#p44-scp-1281)                                                    | 4   | 4   | 3   | Remote-contact support only            |
| 45   | [SCP-610](#p45-scp-610)                                                      | 5   | 5   | 5   | Defer until quarantine works           |
| 46   | [SCP-439](#p46-scp-439)                                                      | 4   | 5   | 4   | Defer biological lifecycle             |
| 47   | [SCP-2547](#p47-scp-2547)                                                    | 4   | 5   | 4   | Later town relief operation            |
| 48   | [SCP-106](#p48-scp-106)                                                      | 5   | 5   | 4   | Perimeter evidence before full entity  |
| 49   | [Treats](#p49-treats)                                                        | 4   | 5   | 3   | Optional evacuation variant            |
| 50   | [The Young Man](#p50-the-young-man)                                          | 3   | 3   | 2   | Historical evidence variant            |
| 51   | [SCP-3393](#p51-scp-3393)                                                    | 5   | 5   | 3   | Defer antimemetic simulation           |
| 52   | [SCP-3007](#p52-scp-3007)                                                    | 5   | 5   | 3   | Defer dual-world embodiment            |
| 53   | [SCP-2399](#p53-scp-2399)                                                    | 3   | 4   | 3   | Background strategic pressure          |
| 54   | [SCP-076](#p54-scp-076)                                                      | 4   | 5   | 3   | Late specialist containment            |
| 55   | [SCP-835](#p55-scp-835)                                                      | 3   | 5   | 3   | Offshore remote sampling only          |
| 56   | [SCP-2439](#p56-scp-2439)                                                    | 4   | 5   | 3   | Deferred institutional story           |
| 57   | [SCP-231](#p57-scp-231)                                                      | 2   | 4   | 2   | Evidence/support only; editorial hold  |
| 58   | [The Factory](#p58-scp-001-o5)                                               | 4   | 4   | 3   | Historical source; editorial hold      |
| 59   | [SCP-963](#p59-scp-963)                                                      | 4   | 5   | 3   | Historical source; editorial hold      |

## Shared Feature Vocabulary

These tags identify **new work**, not installed capabilities. Reuse existing commands underneath each extension; do not create a universal quest scripting language first.

| Tag | Smallest useful addition                                                                                                           | Current boundary / status                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| O   | Notices triggered by actual conditions; typed cargo, evidence, escort, service, and withdrawal outcomes; one-time campaign results | Authored notices and all-cargo completion exist. Mission variety is roadmap-aligned; these predicates are new.                   |
| K   | Dated observations attached to an object, person, or site; physical study/recording job; corroborated lead                         | Evidence-driven containment is an approved direction, but no functioning general research loop exists.                           |
| A   | Field NPC/resident identity, follow/wait, consent or restraint status, transport manifest, arrival destination and care            | Escort/capture is roadmap-aligned; portable vessels currently hold objects, not people or the resident SCP-999.                  |
| V   | Physical field loadout and containment equipment; bring cases/tools, seal and recover them, bulky-item handling                    | Base vessels and fixed tactical supplies exist. Field vessel work, tool effects, and heavy lifting are new.                      |
| W   | Explicitly enable local hauling, installation, repairs, power, meals and bounded work on field maps                                | Base systems exist, but the field projection does not automatically run the base job/routine/utility system.                     |
| H   | Casualty carrying/evacuation, recoverable failure, rescue resolution; narrow organ/patient states when required                    | Incapacitation and stabilization exist. No permanent death, rescue fallback, civilian patients, or organ replacement model.      |
| P   | Actor attention/watch actions, handoffs, applicable sensor channels and light-sensitive behavior                                   | Geometric LOS, cameras and cosmetic illumination exist. Looking, blinking, indirect imagery and behavioral illumination are new. |
| S   | Bounded dialogue choices, negotiated follow/service, interaction history and behavioral response                                   | Personnel effects and SCP-999 interactions exist; general dialogue, bargaining and trust are new.                                |
| D   | Persistent off-site state, revisits, recurring local event clocks and finite intake                                                | Current temporary maps are discarded on return; retry creates a fresh site. Need depleted objectives and lasting consequences.   |
| B   | Contact/residue exposure, biological carriers, detection, isolation and decontamination                                            | Current emitters damage structures/electrical objects, not infectious personnel or contaminated inventory.                       |
| I   | Explicit information channels and exposure records; safe playback, message restrictions, identity checks                           | Not a generic sanity penalty, and not current World/Recorded display. Mostly a new direction.                                    |
| X   | Linked authored spaces, special transitions, bounded changing exits or dual-world ownership                                        | Temporary maps exist; arbitrary linked maps and simultaneous alternate embodiment do not. New major scope.                       |

All resident proposals need care/arrival ownership beyond simply placing an icon on the base. All dangerous proposals need a non-softlocking failure policy before release. Permanent staff death is an explicit design decision, not a prerequisite to sneak into an anomaly patch. Until that decision, use a disclosed recoverable adaptation or keep lethal canonical encounters out of the playable slice.

## Proposals

### P01 SCP-1867

**Source:** [references/scp-1867/2026-09-09-revision-26.txt](references/scp-1867/2026-09-09-revision-26.txt). A cooperative telepathic naturalist in a small aquatic body offers a collection; his claims require independent corroboration.

**Opportunity and map:** A caretaker requests help cataloging a cottage collection. Search a bounded vault map with a dry archive, specimen benches, and a locked equipment room. Recover a journal and two clearly marked samples, matching their labels to inventory notes before deciding what to leave isolated. No hostile creature is necessary; separating delicate evidence from an unverified device is the decision.

**Return and follow-through:** Bring a physically supported aquarium resident only in the second slice. Initially recover the collection and communicate with Blackwood at an existing outpost. At a base workbench, compare the journal and samples to produce one corroborated expedition lead, not a guaranteed truth generator.

**Build / verdict:** O, K; A/V/S for resident transfer. Excellent connective tissue and replayable catalog work. Cap the first collection at three items and one follow-up; thousands of artifacts and freeform conversation are out. Playtest whether comparing finds changes dispatch decisions, rather than merely delaying an unlock.

### P02 SCP-1370

**Source:** [references/scp-1370/2026-09-09-revision-31.txt](references/scp-1370/2026-09-09-revision-31.txt). The self-powered robot is verbally hostile but physically ineffectual; restraint and an ordinary adequately sized case suffice.

**Opportunity and map:** Reports of a threatening exhibit bring agents to a gallery with narrow aisles and audiovisual displays. Shut off distracting displays or position a portable speaker, let the robot approach, then secure it without damaging the exhibit. A direct careful pickup can remain viable; this is not a fight disguised as a puzzle.

**Return and follow-through:** Carry the secured robot to extraction and place it in a display enclosure at the base. Controlled observation records its actual inability to damage a target, with occasional short authored boasts and no invented need for external power.

**Build / verdict:** V plus a very small mobile-object handling state; K for observations. Do not build the entire hostile humanoid capture system for this object. Good low-risk teaching scenario, but not a deep long-term economic engine. Its value is establishing inspect, approach, secure, carry, and study.

### P03 SCP-294

**Source:** [references/scp-294/2026-09-09-revision-116.txt](references/scp-294/2026-09-09-revision-116.txt). A vending machine produces requested liquids, sometimes by retrieving existing material; its outputs, protected cups, and limits are not ordinary coffee-machine behavior.

**Opportunity and map:** An office manager reports impossible vending results. On a break-room/loading-bay map, compare ordinary coffee with an authorized unusual sample, preserve both labeled cups, then prepare a clear route for a bulky-machine collection. The first mission can return samples and a verified freight order; moving the full machine needs V, not a one-person pocket pickup.

**Return and follow-through:** Install a supervised test station. Begin with four authored requests, such as water, coffee, a traceable reference mixture, and one hazardous liquid. Staff physically supply a sample holder, operate, record and store outputs. A traceable mixture test should actually subtract the dispensed amount from its source.

**Build / verdict:** K, V, small liquid/sample records and bounded machine-use rules. High fun/reuse if output handling matters. No arbitrary natural-language chemistry, unlimited material farming, or reliable medical-knowledge drink; those are separate, expensive adaptations. Never generalize every liquid into a corrosion emitter.

### P04 SCP-2295

**Source:** [references/scp-2295/2026-09-09-revision-25.txt](references/scp-2295/2026-09-09-revision-25.txt). The bear constructs organ replacements from fabric, chooses the youngest eligible nearby patient, and cannot resolve the documented brain injury.

**Opportunity and map:** A crashed mail van contains an unusual parcel beside an injured civilian. Use a compact roadside/clinic map: bring cloth from the van to the bear, move the patient into safe proximity, and protect the treatment interval. Recover the bear and card only after the patient is stable; leaving useful fabric with the local clinic is an optional cost.

**Return and follow-through:** At the base, position eligible patients and supply fabric. Record which organ was replaced and preserve other injuries. Stocking the treatment area becomes a logistics decision, not unlimited healing.

**Build / verdict:** A, H, K, physical textile supplies and a narrow organ-state extension. Existing aggregate tactical injury is insufficient. Start with one supported organ injury in an authored patient, not a full surgical anatomy simulator. High-impact medium-term candidate; worth more than another combat encounter because it closes the expedition-to-medical loop.

### P05 SCP-1295

**Source:** [references/scp-1295/2026-09-09-revision-22.txt](references/scp-1295/2026-09-09-revision-22.txt). Four regulars must retain access to their diner; forced removal or exclusion has distinct escalating effects. The story implies their identities without making a capture sensible.

**Opportunity and map:** A cover operative calls in sick just as the diner faces a delivery shortfall. Dispatch agents to a diner, stockroom, and service yard. Keep the entrance open and seats available while unloading meals and repairing a failed appliance. Decide who serves, who repairs, and whether to request relief rather than exhaust the team.

**Return and follow-through:** Return with observations and a continuing service agreement, not four prisoners. Future short visits consume finite supplies and staff time; reliable support keeps a remote containment obligation stable.

**Build / verdict:** O, W, S, D; a bounded access-denial warning/effect for the first patron, not four city-scale fields. Excellent reuse of mundane simulation. Do not claim that changing the menu itself canonically triggers an effect; the gameplay threat is losing diner access. Needs genuine service actions, not a checklist marked complete from headquarters.

### P06 SCP-173

**Source:** [references/scp-173/2026-09-09-revision-57.txt](references/scp-173/2026-09-09-revision-57.txt). Direct observation prevents motion; a three-person entry keeps two watching while work occurs. The enclosure needs cleaning.

**Opportunity and map:** A storage wing requests emergency recontainment. Three agents enter a compact map with a blind corner, service door, and transport enclosure. Two maintain watch while the third moves equipment. Trade observation positions without an uncovered interval, then close and verify the transport enclosure. Do not assume cameras substitute for direct observers.

**Return and follow-through:** A dedicated base chamber makes cleaning and watch coverage a recurring staffing/geometry problem. A missed handoff should be telegraphed; use an explicitly adapted recoverable first incident until staff-death policy is decided.

**Build / verdict:** A/V, P, H and a cleaning work action. LOS alone is insufficient; attention must compete with carrying, aid, and other work. Very high showcase value, but automate routine watch relief after the player establishes a policy. No real-time blink-clicking. Use new compatible artwork, not the historically associated sculpture photograph.

### P07 SCP-507

**Source:** [references/scp-507/2026-09-09-revision-44.txt](references/scp-507/2026-09-09-revision-44.txt). Shifts are involuntary; the subject returns at corresponding coordinates and may require retrieval. Contact can carry another person into a shift.

**Opportunity and map:** A tracker resumes transmitting from a closed industrial yard. Find the cooperative returnee, bring food and a flashlight, establish that transport is safe, then escort him through locked service routes to pickup. Recover an optional dropped recorder only if it does not jeopardize the return.

**Return and follow-through:** Medical review and a recorded account create a possible lead, explicitly unverified. Schedule a limited series of repeat pickups with different authored accessibility problems. Do not let the player choose his next dimension or use him as a teleport spell.

**Build / verdict:** A, O, D, K; S can begin with one negotiated follow action. This scores the ordinary-world pickup, not playable shifts. Later X could support a single accidental shared shift. Strong recurring mission source, provided absences respect roster ownership and do not duplicate the resident.

### P08 SCP-3008

**Source:** [references/scp-3008/2026-09-09-revision-31.txt](references/scp-3008/2026-09-09-revision-31.txt). A vast store has survivor communities, a light-governed day/night cycle, dangerous staff at night, and unreliable exits.

**Opportunity and map:** A recovered journal and an intermittent exit sighting justify one rescue attempt. Play a single authored store sector with a restaurant, two aisle routes, and a survivor barricade. Deliver supplies, repair one barricade during the day, then choose between an early evacuation and collecting additional people before closing time.

**Return and follow-through:** Evacuated civilians enter a reception process, not the permanent employee roster automatically. Return a journal and finite supplies; survivors can corroborate another location. A temporary exit window is a declared game abstraction, not a stable canonical route.

**Build / verdict:** O, A, H, W, P, X and a bounded multi-actor threat model. No infinite generation, full settlement economy or simultaneous expedition teams. Excellent later showcase because hauling, shelter, care and tactics all matter. It becomes E5 if unlimited topology or a whole survivor colony is included.

### P09 SCP-2006

**Source:** [references/scp-2006/2026-09-09-revision-47.txt](references/scp-2006/2026-09-09-revision-47.txt). An extremely capable shapeshifter misunderstands fear; staff reinforce harmless horror-film expectations through acting and curated media.

**Opportunity and map:** A small cinema reports an animated prop. In projection room, auditorium and lobby, select a harmless film, arrange an audience response, and invite the entity into prepared accommodation. The tension is whether the team maintains a coherent performance while another task demands attention.

**Return and follow-through:** Schedule screenings and interaction coverage at the base. Keep the curated media shelf away from actual incident footage. Show the resident's current belief and recent interactions openly during development.

**Build / verdict:** S, A, K and a few authored appearance/response states; I only when media transfer actually affects it. Do not simulate unlimited shapeshifting or score real player acting. A small catalog of original fictional films avoids third-party film-rights problems. Very distinctive containment for modest scope, but recurring care must be schedulable rather than a dialogue tax.

### P10 SCP-1437

**Source:** [references/scp-1437/2026-09-09-revision-43.txt](references/scp-1437/2026-09-09-revision-43.txt). A fixed hole ejects objects and documents from other realities; the article does not support safe human travel through it.

**Opportunity and map:** A perimeter team reports a new emergence. On a small intake-yard map, observe a marked impact zone, wait for the event to settle, then classify and collect a finite set of arrivals. The tempting object lies closer to the next possible emergence than the routine documents.

**Return and follow-through:** Bring labeled specimens and conflicting records to separate quarantine/storage areas. Study can generate an authored lead or disprove an assumption. Leave the hole where it is.

**Build / verdict:** O, D, V, K plus a bounded emergence clock and inspectable danger zone. No parallel universes required. Strong recurring content source, but avoid an infinite loot fountain: finite authored batches, finite carrying capacity, and no reward for throwing personnel into it. Revisit state must prevent harvesting the same batch again.

### P11 SCP-348

**Source:** [references/scp-348/2026-09-09-revision-35.txt](references/scp-348/2026-09-09-revision-35.txt). The bowl produces soup around minor ailments, with particularly strong childhood associations and occasional personal messages; it is not a universal cure.

**Opportunity and map:** A clinic reports a bowl repeatedly refilling. Visit a modest house/clinic map, interview the caregiver, observe a voluntary use, and arrange a documented loan or transfer. Decide whether to finish observing a current patient before taking the bowl. The first version returns the bowl and one dated observation; no child simulation is necessary.

**Return and follow-through:** A willing adult staff member with a minor ailment can use it in a care routine. Modest comfort and a rare authored message provide emotional variety; do not promise the source's strongest childhood effects for every adult.

**Build / verdict:** K, small object-use/meal ownership, S for consent. Low cost once study exists. Keep it a personal story and occasional care option, not a replacement for the pantry or tactical medicine. Handling and observing should be the meaningful actions, not an artificial hazard.

### P12 SCP-049

**Source:** [references/scp-049/2026-09-09-revision-122.txt](references/scp-049/2026-09-09-revision-122.txt). Cooperation can become dangerous around perceived Pestilence; lavender can calm it, and transport requires sedation and restraint. The article's late restrictions supersede routine provision of bodies.

**Opportunity and map:** A rural clinic requests help with an unusual physician. Use consultation room, preparation room and service exit. Recover records while keeping distance, calm the doctor through a bounded procedure, then transfer under a monitored restraint protocol. A separate 049-2 threat can reuse the current tactical foundation, but defeating it is not capture of SCP-049.

**Return and follow-through:** Secured resident accommodation, no-contact interviews and material handling become continuing work. Do not treat the journals as instantly readable or implement lethal touch as ordinary melee chip damage without an explicit adaptation.

**Build / verdict:** A, V, S, H, K. Full reanimation/death handling is outside the first slice. High relevance to existing work, but existing 049-2 combat does not make the doctor cheap. Offer an earlier records-only investigation before live transfer.

### P13 SCP-529

**Source:** [references/scp-529/2026-09-09-revision-32.txt](references/scp-529/2026-09-09-revision-32.txt). Josie behaves as a healthy affectionate cat despite missing hindquarters; cheese can create distress if insufficiently supplied.

**Opportunity and map:** A veterinary office reports an impossible but healthy animal. Search the waiting room, cabinets and quiet yard; make a calm approach and bring a carrier close enough for a voluntary lure. Do not turn a routine animal pickup into a combat encounter.

**Return and follow-through:** A resident with a resting spot, ordinary food and occasional social contact makes the facility feel inhabited. Keep cheese out of the normal diet. Mood effects beyond the article's observations are explicit tuning choices, not medical powers.

**Build / verdict:** A in its small-animal form, V and limited resident routines. SCP-999's implementation is a reference, not proof of a generic animal system. Good inexpensive variety once identity/arrival works; limited strategic depth makes it a companion release, not the flagship.

### P14 SCP-1762

**Source:** [references/scp-1762/2026-09-09-revision-51.txt](references/scp-1762/2026-09-09-revision-51.txt). A box releases paper-like visitors and messages; the final archived state includes loss, a last book/crystal delivery, and disintegration of the box.

**Opportunity and map:** For an explicitly earlier-era campaign, visit a house where paper visitors emerge from an attic box. Clear obstructions, wait for them to return, and recover the closed box without separating them. An alternative current-state mission retrieves the surviving book, crystal and commemorative capsule from a closing records office.

**Return and follow-through:** Earlier-era play supports scheduled observation and a short authored correspondence arc. The current-state version supports study and a memorial. Preserving Fantasy through care would be a deliberate alternate ending; do not imply a source-proven repair recipe.

**Build / verdict:** K, O and bounded timed release states; simple cosmetic visitors need not be hundreds of full agents. Moderate emotional value, low systems reuse beyond records. Never make a missed maintenance click secretly trigger the canonical tragedy.

### P15 SCP-1171

**Source:** [references/scp-1171/2026-09-09-revision-19.txt](references/scp-1171/2026-09-09-revision-19.txt). Condensation on a house's windows permits dialogue with a prejudiced otherworldly resident who initially misidentifies the researcher.

**Opportunity and map:** A homeowner reports messages. On a small ground-floor house map, close exterior shutters, take up positions at two windows, and conduct a limited conversation while another agent prevents interruptions. Choose which three questions matter and when to end the exchange.

**Return and follow-through:** Bring a transcript and a contact agreement; preserve the house in place. Subsequent visits compare claims, with a disagreement or corrected assumption changing the next available questions. Do not grant a proven portal, transferable window power, or reliable alien technology.

**Build / verdict:** S, K, O, D. Dialogue writing is the main cost. Strong noncombat contrast if window positions and interruptions matter; weak if the field map only hosts a long menu. Portray prejudice critically without making participation in it a rewarded player requirement.

### P16 SCP-999

**Source:** [references/scp-999/2026-09-09-revision-40.txt](references/scp-999/2026-09-09-revision-40.txt). A playful resident seeks contact, especially with distressed people, and has specific care and dietary needs.

**Opportunity and map:** Since Site 828 already has SCP-999, do not spawn a duplicate as a quest reward. A nearby support depot offers suitable food and care records. Recover a finite, correctly labeled delivery and optional pen supplies from a small mixed-storage map; check the shipment against dietary restrictions.

**Return and follow-through:** Deliver actual supplies and schedule care at the existing pen. For a different starting scenario, a cooperative transfer mission could introduce the same single resident, but that requires A/V and would cost more than the ranked support mission.

**Build / verdict:** Small care supply/use work, K for the observation record; O for a condition-based restock notice. Existing social behavior keeps this cheap. It is useful connective content, but a supply errand needs a genuine stock/handling decision to justify taking agents away. Do not make caffeine mishaps a mandatory tutorial.

### P17 SCP-1545

**Source:** [references/scp-1545/2026-09-09-revision-33.txt](references/scp-1545/2026-09-09-revision-33.txt). Two wearers cannot voluntarily leave the costume, but external removal is possible; neglected needs create the danger.

**Opportunity and map:** Performers at a community hall will not stop their act. Find the costume in a stage/backstage map, clear a resting area, physically assist both occupants out, and provide care. Recover the empty costume only after accounting for both people.

**Return and follow-through:** Secure the costume as an item with a specific two-person-use restriction. The case record explains why a wearer saying they are fine is not sufficient; do not encourage repeated exposure to farm research.

**Build / verdict:** A, H, multi-person occupancy/removal and object-use permissions. Use one staged rescue action with real approach and interruption, not a general wearable possession engine. Good compact rescue puzzle. Explicitly forbid dispatching the inhabited costume as ordinary cargo; its occupants must remain authoritative people with needs.

### P18 SCP-1981

**Source:** [references/scp-1981/2026-09-09-revision-67.txt](references/scp-1981/2026-09-09-revision-67.txt). This is a Betamax tape, not VHS. Each playback differs; filming a playback preserves that particular observation, and some statements resemble future events.

**Opportunity and map:** An archive clerk flags a disturbing recording. Search a small media store for the labeled tape, compatible player, and existing viewing record. Decide whether to document a field playback or pack the equipment for safer base review; preserve the distinction between the anomalous original and an ordinary recording.

**Return and follow-through:** Staff perform bounded view-record-review jobs at a powered station. Corroborating a specific clue may open a mission; most playback content is inconclusive. A repeated playback is not a reliable prediction dispenser.

**Build / verdict:** K, W/V for equipment handling, small playback history and ordinary stress effects. Original, non-graphic text summaries can carry the content. Good research companion, but no need for fully animated footage or an actual broadcast network in the first version.

### P19 SCP-073

**Source:** [references/scp-073/2026-09-09-revision-35.txt](references/scp-073/2026-09-09-revision-35.txt). A cooperative person has exceptional memory, adverse effects on plants/plant-derived material, and reflects inflicted harm.

**Opportunity and map:** Arrange a voluntary move from a temporary safehouse. Survey two exit routes: one through a paper archive and one through a cleared service corridor. Move vulnerable records before escorting the resident, and secure non-organic accommodation at the destination.

**Return and follow-through:** Schedule consensual record backup and consultation; account for suitable meals and material exclusions. His memory is useful, but neither automatic omniscience nor a free skill upgrade for staff.

**Build / verdict:** A, S, K plus material-origin tags and reflected-damage provenance if combat can reach him. Existing concrete/steel resistance is not plant susceptibility. Defer a general vegetation ecosystem, but implement the relevant paper/contact rule honestly. Strong layout/logistics decisions; never make provoking reflected harm the required experiment.

### P20 SCP-2662

**Source:** [references/scp-2662/2026-09-09-revision-17.txt](references/scp-2662/2026-09-09-revision-17.txt). Voluntary containment protects a reluctant resident from persistent intrusive followers; longer-term exposure can affect a minority of staff.

**Opportunity and map:** A temporary safehouse requests relocation after unauthorized visitors arrive. Escort the resident through a service route while agents close doors and divert intruders. The anomaly is the protected party, not the enemy health bar.

**Return and follow-through:** A private room and ordinary amenities are simple; controlled visitor access and staff exposure rotation create the real ongoing task. Use non-graphic intrusions and distinguish ordinary visitors from hostile behavior.

**Build / verdict:** A, S, O, a multi-NPC intrusion model and later I for exposure. Long-term exposure should retain its long timescale, not become instant mind control for mission drama. High facility payoff after escort/access rules exist. No floor breaches or new base levels: arrivals use the planned off-map access route in this adaptation.

### P21 SCP-2952

**Source:** [references/scp-2952/2026-09-09-revision-27.txt](references/scp-2952/2026-09-09-revision-27.txt). A stationary, extraordinarily long animal supports scheduled transit for small travelers; reopening obstructed stops leads to cooperative access.

**Opportunity and map:** A buried stop produces complaints. Dispatch to a compact maintenance plot, remove the obstruction, install observation equipment, and leave an appropriate apology and offering while work is unfinished. Meet a scheduled departure without trapping the passengers.

**Return and follow-through:** Bring a service agreement and observations. A later authorized ride can alter travel time on one specific route; it must not erase ordinary expedition cost everywhere. The animal stays in place.

**Build / verdict:** W, O, D, S; V for offerings and physical equipment. Initially represent the stop at ordinary map scale and show travelers symbolically. X and scale changes are only needed for an interior trip. Charming logistics/diplomacy after field work exists, but bespoke passenger art and perception rules raise cost above a simple repair.

### P22 SCP-701

**Source:** [references/scp-701/2026-09-09-revision-60.txt](references/scp-701/2026-09-09-revision-60.txt). Performances sometimes develop consistent script deviations and a dangerous staged event; not every reading or performance has the same result.

**Opportunity and map:** A drama teacher notices unplanned dialogue before opening night. Inspect dressing-room scripts, compare a rehearsal record, then interrupt the production and escort the remaining staff out. The stage, backstage routes and audience entrance create multiple simultaneous responsibilities.

**Return and follow-through:** Recover scripts and a recording to restricted storage, while a dated intervention record establishes what was actually prevented. A later recurrence concerns another distributed copy, not a resurrected unique trophy.

**Build / verdict:** O, K, A, S, I and a bounded rehearsal/event clock. Do not model a full audience riot first. The initial mission ends before an outbreak; graceful partial success can mean evacuating people but failing to recover every copy. Excellent prevention gameplay once typed outcomes and civilians exist.

### P23 SCP-504

**Source:** [references/scp-504/2026-09-09-revision-48.txt](references/scp-504/2026-09-09-revision-48.txt). Mature detached tomatoes respond once to particular audible humor; seeds, immature plants and compromised fruit differ.

**Opportunity and map:** A produce distributor reports an impossible accident. In packing room, office and loading bay, stop an audible broadcast, separate active fruit from safe seed stock, and pack the fruit using a tested acoustic barrier. An optional remote playback tests one already marked batch without risking a person.

**Return and follow-through:** Separate sound-sensitive storage and a controlled test enclosure create a material-and-routing problem. Seeds remain a distinct low-risk recovery option; growing an entire crop is a later extension.

**Build / verdict:** V, K, P's channel concept extended to bounded sound propagation, projectile impact and single-use object state. Authored sound events replace humor detection; no NLP joke evaluator. Do not treat a sealed corrosion vessel as automatically soundproof. Fun, readable failure modes, but cheap novelty wears off unless handling and sound insulation matter.

### P24 SCP-179

**Source:** [references/scp-179/2026-09-09-revision-54.txt](references/scp-179/2026-09-09-revision-54.txt). A remote solar entity indicates threats and lies beyond ordinary containment reach.

**Opportunity and map:** An observation station loses its calibration during an unusual indication. Repair the ground-side receiver on a small observatory map, restore the recorder before its local buffer is overwritten, and compare two bearings. The receiver failure and buffer are invented mission conditions, not properties of SCP-179.

**Return and follow-through:** Bring calibrated measurements and a potential warning. Corroboration can prioritize one future notice, never provide an exact all-purpose danger radar. Leave the entity where it is.

**Build / verdict:** W, O, K and a small measurement/station interaction. No solar travel. Moderate gameplay, substantial campaign connective value. A low-cost records-only version is possible, but ranks lower because hauling a disk without doing the observation work misses most of the appeal.

### P25 SCP-1000

**Source:** [references/scp-1000/2026-09-09-revision-88.txt](references/scp-1000/2026-09-09-revision-88.txt). Later text explicitly retracts the death-aura and low-intelligence claims and reveals a suppressed civilization and attempts at contact.

**Opportunity and map:** Contradictory trail-camera records lead to a forest research shelter. Gather two pieces of evidence, notice signs of deliberate communication, and choose a respectful meeting position or a nonintrusive withdrawal. Recover a voluntarily offered artifact or only the transcript; do not require capture.

**Return and follow-through:** Reconcile an institutional report with direct evidence. A limited contact agreement can open a later exchange. Show the contradiction to the player, preserving inspectability instead of faking a lethal aura to manufacture suspense.

**Build / verdict:** S, K, O, A for field actors, D for lasting contact. Cultural and narrative review are significant authoring costs. No organic-tech civilization simulation in the first mission. Strong story fit once noncombat objectives matter; poor choice for a generic wildlife hunt.

### P26 SCP-1983

**Source:** [references/scp-1983/2026-09-09-revision-33.txt](references/scp-1983/2026-09-09-revision-33.txt). The farmhouse hides abnormal space; the recovered account describes light-dependent threats and special countermeasures. The final state is presumed neutralized.

**Opportunity and map:** Start with current-state recovery: investigate the monitored farmhouse, retrieve an old recorder and the remaining outpost equipment, verify that the doorway is ordinary. For a declared earlier-era or analogous event, enter one authored abnormal room cluster to close a breach and recover records, with light helping navigation but strengthening danger.

**Return and follow-through:** Evidence justifies maintaining or standing down a remote watch, rather than granting a portable shadow creature. A full internal resolution must openly depart from the article's one-way peril if the team can routinely return.

**Build / verdict:** Full scored version needs X, P, H, V and explicit countermeasure actions. Religious sincerity must not become a simplistic hidden stat or rank religions. Very strong tactical inversion, high cost; current-state cleanup is E1-2 but much less distinctive. Do not start with a dungeon boss.

### P27 SCP-087

**Source:** [references/scp-087/2026-09-09-revision-55.txt](references/scp-087/2026-09-09-revision-55.txt). An anomalously deep dark staircase has unreachable distress sounds and a disturbing presence; the current procedures prohibit further entry.

**Opportunity and map:** A damaged access door prompts a perimeter inspection, repair, and retrieval of an existing recording. An optional explicitly earlier reconnaissance mission uses three authored landing scenes, with a bounded light limit, a trail recorder and a clear decision to turn back before pushing farther.

**Return and follow-through:** Return the recording and a measured reach limit. Successful withdrawal and restored access control are valid outcomes; the objective is not rescuing a child whom the source never establishes as reachable.

**Build / verdict:** O, K, W for perimeter work; X/P/H for the scored reconnaissance version. Represent landing transitions as special field scenes, not new base floors. No infinite staircase, mandatory disappearance or punishment for refusing deeper exploration. Good tension, but less recurring base payoff than the top tier.

### P28 SCP-093

**Source:** [references/scp-093/2026-09-09-revision-39.txt](references/scp-093/2026-09-09-revision-39.txt). The disc belongs on a mirror, changes color with holders, and enables passage. Its testing procedures explicitly address retrieval and recording equipment.

**Opportunity and map:** First retrieve the disc together with a properly prepared mirror mount from a temporary research annex. The worthwhile extension is a base-launched expedition through one authored mirror destination: keep the return apparatus operational, survey a ruined station, and choose between a nearby record and a farther specimen.

**Return and follow-through:** Return through the same operational setup with evidence and cargo. Different observations can justify another authored destination, but do not equate color with a verified morality score; the article's suggested psychological relation is uncertain.

**Build / verdict:** X, V, K, H, O and a real return/tether contract. Extremely reusable once linked maps become a priority, but expensive now. Archive the linked color-test reports before adapting their specific landscapes or inhabitants. One map and one researched route come before a multi-world campaign.

### P29 SCP-1048

**Source:** [references/scp-1048/2026-09-09-revision-48.txt](references/scp-1048/2026-09-09-revision-48.txt). A friendly-looking bear is associated with dangerous replicas; the production process and full material sources remain uncertain.

**Opportunity and map:** Missing scrap and inconsistent sightings trigger a workshop sweep. Compare physical inventory with a camera record, isolate a small storage wing, distinguish the original from one metal replica, and secure the original. An optional scrap sample provides evidence without confronting the replica.

**Return and follow-through:** Controlled access to fabrication materials and reliable inventory inspections matter at the base. For a game rule, explicitly hypothesize that the modeled replica consumes actual tagged scrap and bound its production; do not claim that this explains every canonical creation.

**Build / verdict:** A, D, K, material consumption, multi-actor threat identities and interruption rules. Choose the metal replica; omit the graphic biological variants. Strong eventual emergent incident, but a hidden arbitrary duplicate spawn would undermine the physical simulation. Never confuse SCP-2295 and SCP-1048 identities just for a surprise.

### P30 SCP-096

**Source:** [references/scp-096/2026-09-09-revision-58.txt](references/scp-096/2026-09-09-revision-58.txt). Direct sight and recorded images of the face trigger pursuit; artistic depictions do not. Known barriers do not stop an activated pursuit.

**Opportunity and map:** An unreviewed photographic collection is about to be digitized. On an archive map, isolate playback equipment without opening the images, collect the sealed originals, and account for the copied media. An advanced follow-up retrieves the calm entity under an opaque transport procedure.

**Return and follow-through:** Keep media records and originals quarantined, with safe handling based on actor exposure rather than player UI visibility. A containment room would require non-optical monitoring; current cameras cannot be casually reused.

**Build / verdict:** I, V, O, K; A/P/H for live recovery. Score covers meaningful image handling, not a sealed-box errand. No fight-to-subdue, magic stronger wall or assurance that covering the face cancels a pursuit already triggered. Powerful later showcase, but a poor early encounter while terminal outcomes and image-copy ownership are unresolved.

### P31 SCP-191

**Source:** [references/scp-191/2026-09-09-revision-36.txt](references/scp-191/2026-09-09-revision-36.txt). A medically vulnerable child with extensive artificial components requires power, special nutrition, maintenance and care.

**Opportunity and map:** A clinic requests a specialist transfer during an equipment failure. Repair a safe powered care area, bring the necessary supplies, prepare supported transport, and evacuate without interrupting treatment. Play uses clinic/service-room geography, not a hostile patient.

**Return and follow-through:** Provide private accommodation and a staffed care plan. The reward is a successful rescue and relationship, not a computing asset or labor bonus. A specialist external destination is a legitimate first outcome instead of pretending Site 828 already has pediatric care.

**Build / verdict:** A, H, V, W, supported transport power and specialized recurring care. Keep depiction non-graphic and avoid a minigame about invasive procedures. High emotional value but substantial new medical scope; do not add a whole child population system merely for this mission.

### P32 SCP-745

**Source:** [references/scp-745/2026-09-09-revision-19.txt](references/scp-745/2026-09-09-revision-19.txt). Paired nocturnal predators resemble headlights and target road vehicles; captive survival is short in the documented attempts.

**Opportunity and map:** An isolated roadside recovery beacon activates. Use a stationary road segment with a disabled car, culvert and service shelter. Recover the recorder and stranded occupants while tracking two independently moving lights, then reach a protected pickup point before their approach closes the safe route.

**Return and follow-through:** Bring a witness account and forensic sample, or arrange specialist transport for an already secured specimen in a later version. Do not promise a sustainable pet or a thriving breeding program at the base.

**Build / verdict:** A, H, multi-threat behavior and P. No drivable highway chase in the first mission; that is an explicit simplification of the source's defining hunt. Visually legible but only medium systems payoff. Price a live high-speed pursuit as E5, separate from this fixed-map scenario.

### P33 SCP-342

**Source:** [references/scp-342/2026-09-09-revision-70.txt](references/scp-342/2026-09-09-revision-70.txt). A changing ticket traps its user on the associated journey; the final report broadens the concern beyond mass transit.

**Opportunity and map:** Station staff report repeated disappearances associated with an anomalous ticket. Visit ticket office, platform and lost-property room. Trace the holder, recover the unused ticket before validation, and collect the relevant ledger. The safe objective is interception, not promising a way to rescue someone after activation.

**Return and follow-through:** Store the ticket separately from usable credentials and record its current appearance. A small supervised observation demonstrates a change while unobserved without using it for travel.

**Build / verdict:** O, S/A, K and bounded mutable appearance. Do not apply identity-changing graphics to the object's stable simulation ID. E3 includes preventing use through NPC interaction; a ledger-and-ticket pickup alone is E1. Full train embodiment and irreversible disappearance are deferred, with a prevention-focused failure route chosen before shipping.

### P34 SCP-3001

**Source:** [references/scp-3001/2026-09-09-revision-30.txt](references/scp-3001/2026-09-09-revision-30.txt). A control panel returns with prolonged recordings from a low-reality non-dimension; successful retrieval of the researcher is not established.

**Opportunity and map:** An abandoned research annex reports the reappearance of equipment. Isolate the experimental apparatus, secure the recorder, and preserve the local experiment log before resetting power. The map is the ordinary annex, not the non-dimension.

**Return and follow-through:** Reconstruct the order of failures through physical study. Adopt one testable safety interlock on a relevant future device, or file the evidence for specialist review. Do not invent an immediate rescue technology, immortality perk or universal reality-stability currency.

**Build / verdict:** K, O and one inspectable equipment interlock; W if repairs are playable. E3 assumes consequential analysis, not just collecting a red light. A full isolation survival scenario is E5 with low reuse and risks becoming a different game. Best as an optional investigation chapter after apparatus research exists.

### P35 SCP-4999

**Source:** [references/scp-4999/2026-09-09-revision-71.txt](references/scp-4999/2026-09-09-revision-71.txt). A quiet presence accompanies conscious people who are alone near death; observation and company affect manifestation conditions. It is not established to cause their deaths.

**Opportunity and map:** A hospice camera record shows an unexplained visitor. Investigate after the event on a small ward map, interview staff, recover the recording and remaining cigarette as evidence, and preserve personal effects for the family or custodian.

**Return and follow-through:** The case can encourage companionship for isolated personnel through an ordinary care policy. It does not award an anomaly, revive a patient or offer a repeatable apparition farm.

**Build / verdict:** K, S and O; aftermath avoids implementing death solely for this article. Cheap, emotionally distinct interlude with limited tactical depth. A live manifestation should wait for deliberate end-of-life design, and never reward leaving someone alone to produce it. The successful player action may prevent the encounter entirely.

### P36 Ethics Committee Orientation

**Source:** [references/ethics-committee-orientation/2026-09-09-revision-26.txt](references/ethics-committee-orientation/2026-09-09-revision-26.txt). A tale about institutional oversight, responsibility and the gap between official reputation and actual authority; the speaker's moral claims are a viewpoint, not a neutral truth.

**Opportunity and map:** A review requests a field inspection of a temporary holding site. Interview a willing resident, inspect supplies and care access, and retrieve treatment logs. Resolve an immediate practical omission if the team has the resources. Return with evidence, not a prisoner.

**Return and follow-through:** Review a real recent mission: what risks were known, which alternatives existed, and what happened to the people involved. Require a specific corrective action such as functioning care access or an evacuation provision, then verify it through simulation state.

**Build / verdict:** K, O, S, optional W. First deliver a short authored review of one scenario, not a morality meter, universal ethics engine or punishment for unknown rules. High cross-catalog value after there are meaningful outcomes to evaluate; too early now would repeat the retired static archive problem.

### P37 Document Recovered From The Marianas Trench

**Source:** [references/document-recovered-from-the-marianas-trench/2026-09-09-revision-50.txt](references/document-recovered-from-the-marianas-trench/2026-09-09-revision-50.txt). A survivor's document suggests a previous global catastrophe and reconstruction; it is testimony, not proof of a universal reset mechanic.

**Opportunity and map:** A survey vessel delivers an anomalous sealed document to a dockside receiving station. Agents recover the fragile package and compare its provenance with ship records on a small warehouse map. A second, optional record is in a room awaiting equipment removal.

**Return and follow-through:** Stabilize and date the document, then pursue one independently corroborating archival lead. Its payoff is troubling institutional knowledge and a reason for another mission, not a world-reboot button.

**Build / verdict:** K, O and simple evidence condition. Keep the deep-ocean lift off-map as an authored arrival; underwater gameplay is not necessary to investigate the recovered material. Low implementation cost, but deliberately modest play depth. Best paired with a richer expedition rather than sold as the central game loop.

### P38 SCP-3333

**Source:** [references/scp-3333/2026-09-09-revision-82.txt](references/scp-3333/2026-09-09-revision-82.txt). Repeated lookout spaces conceal impersonation and compromised expedition support; later messages undermine an apparently successful return.

**Opportunity and map:** An outpost repeatedly requests replacement personnel. Begin with the ordinary lookout and stores: compare sign-out records, challenge inconsistent instructions, and extract an authenticated recorder. A later version traverses three authored copies and checks the identities of those returning.

**Return and follow-through:** Return a verified team and a compromised supply-chain record. A false arrival is a persistent containment consequence only after the identity system can preserve player trust and show inspectable evidence.

**Build / verdict:** I, A, K, H, X for the full scored version. Do not simply hide a random enemy under a pawn portrait; true identity, claimed identity and observations need separate state. Base levels remain unchanged. Compelling but high-risk implementation and writing; start with perimeter audit before spatial recursion.

### P39 SCP-953

**Source:** [references/scp-953/2026-09-09-revision-62.txt](references/scp-953/2026-09-09-revision-62.txt). A shapeshifting kumiho combines deception with suggestion; distinguishing features and an aversion to domestic dogs offer countermeasures.

**Opportunity and map:** Inconsistent witness reports lead to a closed hotel wing. Cross-check two accounts, observe a suspect from an independent position, escort civilians out, and prepare a protected route for a specialist containment handoff. Use non-graphic aftermath and a small cast.

**Return and follow-through:** Bring records and a verified identification. Full resident transfer would require safe remote care and a much larger escort; do not silently replace the source's six-person transport requirement with the game's current two-or-three-person party.

**Build / verdict:** S, I, A, H and verified behavioral deterrents; full capture adds V and manifest expansion. Avoid using ethnicity or appearance as a danger heuristic. In-world countermeasures must have evidence, not a folklore guessing quiz. Interesting future investigation, but expensive and editorially demanding for an early roster.

### P40 Taboo

**Source:** [references/taboo/2026-09-09-revision-85.txt](references/taboo/2026-09-09-revision-85.txt). The nameless forest requires varied descriptions, disciplined interaction and a one-direction path returning to its starting point.

**Opportunity and map:** An authorized annual survey needs volunteers. A declared bounded adaptation presents one loop map with three encounters: gain passage, decline an unsafe gift, and record a landmark without repeating a designation. Pack sufficient ordinary rations and complete the path; turning back is not ordinary recall.

**Return and follow-through:** Return a protocol-compliant account and an identity check, not an unrestricted bag of magical treasure. Any name change affects a fictional character while stable internal IDs and readable player inspection remain intact.

**Build / verdict:** X, I, S, H and expedition-specific loadout/return rules. Use authored descriptive choices, not generated free-text policing. The source's individual entry protocol also conflicts with ordinary squad dispatch and needs an explicit adaptation. Excellent future special expedition; do not generalize naming hazards into all UI labels or add base verticality.

### P41 SCP-2521

**Source:** [references/scp-2521/2026-09-09-revision-33.html](references/scp-2521/2026-09-09-revision-33.html), particularly its local thought and test diagrams. The pictorial account distinguishes comprehensible written/spoken descriptions from images and symbols, with different removals demonstrated.

**Opportunity and map:** An isolated records office sends a pictorial warning. On an office/server-room map, use a prepared symbol-based communication protocol, isolate an unsafe transcription job, and recover an approved pictorial packet. Making a textual report is a deliberate character action, never the consequence of opening a tooltip.

**Return and follow-through:** Store and exchange the approved packet through a controlled channel; record handling events without turning the player-facing explanation into a diegetic exposure. Do not promise physical capture of an entity depicted bypassing barriers.

**Build / verdict:** I, O, K, H and explicit media/communication ownership. Very distinctive, very easy to implement unfairly. Accessibility labels must remain safe and clear. No actual speech recognition or scanning the user's text. Original icons need licensing review separate from the article's photographic derivative assets.

### P42 SCP-993

**Source:** [references/scp-993/2026-09-09-revision-50.txt](references/scp-993/2026-09-09-revision-50.txt). An anomalous broadcast affects viewers differently by age, and its source remains unknown.

**Opportunity and map:** A relay station reports a blocked broadcast returning to its outgoing feed. Enter a control-room/transmitter map, avoid viewing the active screen, physically isolate the output, and secure an automated recording. Success is stopping distribution and preserving evidence, not finding a cartoon character in a room.

**Return and follow-through:** Add the recording to controlled media storage and maintain one interception device. Content is represented by non-graphic technical summaries; do not recreate the program or use children as test subjects.

**Build / verdict:** I, W, O, H for an incapacitated operator and a small signal-routing model. Current power cables do not carry media signals. Moderate systems reuse, substantial content restrictions; SCP-1981 is a more tractable first media study. Do not claim disconnecting a local relay eliminates the global phenomenon.

### P43 SCP-2030

**Source:** [references/scp-2030/2026-09-09-revision-56.txt](references/scp-2030/2026-09-09-revision-56.txt). A disguised television series features people recorded as missing or dead; the production site is not located by the article.

**Opportunity and map:** A recovered episode conflicts with a missing-person report. Search a closed rental outlet and adjacent records office for the physical media, transaction record and witness account. Choose whether to spend time following a second lead or preserve the current evidence chain.

**Return and follow-through:** Compare records to establish a contradiction and open one investigation, rather than announcing a known studio raid. A later original studio mission would be clearly speculative and far more expensive.

**Build / verdict:** K, O, S, with I only if distribution is actually simulated. This is an investigative adaptation, not recreation of the source's graphic program. Useful alongside other media cases, but limited base payoff and high writing cost keep it below SCP-1981. Repeated findings must advance the case, not merely fill a trophy shelf.

### P44 SCP-1281

**Source:** [references/scp-1281/2026-09-09-revision-19.txt](references/scp-1281/2026-09-09-revision-19.txt). A damaged ancient biomechanical messenger in the Kuiper belt struggles to deliver a message; the archived ending leaves inactive remains.

**Opportunity and map:** In an explicitly earlier parallel operation, agents restore a terrestrial relay while a specialist remote team makes contact. On an antenna/control-room map, prioritize a cooling-control link and recording integrity over extra diagnostic requests. These ground-side devices are an invented playable support layer, not an Earth landing for the entity.

**Return and follow-through:** Return the recovered message and an account of how communication was handled. The current-era alternative is receiving and preserving an existing record; no resurrection or useful alien power generator is promised.

**Build / verdict:** W, K, O, S plus scripted remote-contact stages. Exceptional narrative tone, modest persistent management payoff. True space exploration and cryogenic biology are E5 and outside this proposal. Preserve uncertainty over whether intervention can save it; do not conceal a predetermined failure behind fake choices.

### P45 SCP-610

**Source:** [references/scp-610/2026-09-09-revision-65.txt](references/scp-610/2026-09-09-revision-65.txt). An infected region requires isolation; contact, biological changes and converted environments are central, not incidental enemy cosmetics.

**Opportunity and map:** A perimeter sensor goes silent. Dispatch to a small quarantine checkpoint outside the main settlement, restore the sensor, recover a drone's sealed sample and logs, then pass through a functioning decontamination route. Optional closer sampling must have an explicit risk and an abort path.

**Return and follow-through:** Send suspect cargo and exposed personnel to separate intake locations. Study may improve detection or sampling procedure, not instantly cure infection. A contaminated return should affect real objects/people, never be an arbitrary dice roll after the mission.

**Build / verdict:** B, V, H, W, K and multiple threats only later. Current corrosion emitters are not infection. High reusable value once quarantine is a chosen development priority, but too many absent safeguards for early release. Do not adapt the linked unarchived field expeditions from memory or make ordinary protective clothing magically sufficient.

### P46 SCP-439

**Source:** [references/scp-439/2026-09-09-revision-33.txt](references/scp-439/2026-09-09-revision-33.txt). A small organism's dangerous lifecycle depends on a sleeping human host, and secure containment requires continued support.

**Opportunity and map:** A closed dormitory reports an unusual specimen. Inspect bedding and maintenance recesses, stop use of the affected sleeping area, and recover a confirmed free specimen in a suitable supported container. Secure existing records rather than deliberately creating a host.

**Return and follow-through:** A sealed, fed, oxygen-supported enclosure and inspection routine make intake and nearby sleeping quarters matter. Suspected exposure is handled through medical isolation and a specialist transfer, not a guaranteed cure.

**Build / verdict:** B, A/V, H, K and a bounded lifecycle. The source's slow hidden biological development is not the same as a radius damage field. Good later cautionary case but high cost and narrow early fun. Depict findings non-graphically and avoid turning severe harm into a crafting recipe.

### P47 SCP-2547

**Source:** [references/scp-2547/2026-09-09-revision-24.txt](references/scp-2547/2026-09-09-revision-24.txt). A town-scale manifestation imposes scarcity and bargaining; the later publicity intervention changes which offerings remain accepted.

**Opportunity and map:** Before a predicted event, deliver supplies to a small town service square. During an explicitly bounded event, negotiate using an approved material offering, distribute water and keep a vulnerable group supplied until departure. Do not promise a vehicle escape after the perimeter is already closed.

**Return and follow-through:** Bring a record of accepted terms, remaining relief supplies and a future preparedness plan. Track that changing publicity can alter behavior; stories are not an eternally valid solution after the article's later intervention.

**Build / verdict:** S, D, O, W, A/H and new water/scarcity state. Represent the wider event off-map; no 4,000-agent swarm or base weather simulation. High social-management potential, but SCP-1295 proves the service model much more cheaply. Restrict offerings to non-exploitative material choices and review the cultural framing.

### P48 SCP-106

**Source:** [references/scp-106/2026-09-09-revision-130.txt](references/scp-106/2026-09-09-revision-130.txt). Corrosion, barrier traversal, layered containment and deceptive apparent inactivity are important; a steel health bar cannot contain the full behavior.

**Opportunity and map:** Inspect a recently evacuated service wing, recover an existing observation device, and restore a stand-off monitoring perimeter. A later containment exercise coordinates light equipment and prepared layered barriers while staff withdraw along separate routes.

**Return and follow-through:** Bring evidence of barrier interactions, not an automatically subdued resident. A full transfer needs a specialized enclosure and long-term operational support. Do not turn the source's abusive recall procedure into playable instructions.

**Build / verdict:** Full version needs P, X, A/V, H and barrier traversal distinct from ordinary corrosion. Existing material wear only supports the early evidence mission. Keep all geometry horizontal and clearly mark that approximation. High spectacle, very high risk; study containment engineering with simpler objects before taking this on.

### P49 Treats

**Source:** [references/treats/2026-09-09-revision-34.txt](references/treats/2026-09-09-revision-34.txt). This companion tale places a SCP-106 response amid costumed crowds and describes bright-light recovery, not a universal proof of safe containment.

**Opportunity and map:** A transport incident coincides with a street festival. On a bounded street/alley map, distinguish verified distress reports from ordinary festivities, guide civilians to a staffed pickup area, and position a light unit to protect the route. Do not reenact the tale's graphic scenes.

**Return and follow-through:** Return with evacuated people, a recorder and a transport-failure report. Success can mean limiting exposure and withdrawing while a specialist team handles the entity.

**Build / verdict:** A, H, P, S, multi-NPC routing and O; full SCP-106 behavior remains a separate expensive dependency. Better as a later mission variant using existing rescue systems than a new core subsystem. Avoid a crowd-identification puzzle where costumes alone label innocent people as targets.

### P50 The Young Man

**Source:** [references/the-young-man/2026-09-09-revision-37.txt](references/the-young-man/2026-09-09-revision-37.txt). A wartime tale connects missing records, an unsettling soldier and corrosive disappearances; it is a possible origin interpretation, not definitive universal canon.

**Opportunity and map:** A reconstruction crew uncovers a sealed military records room. Survey a short abandoned trench/shelter map, retrieve identification records and a field notebook, and avoid disturbing an anomalous residue patch. No live historical reenactment is required.

**Return and follow-through:** Compare records with the current SCP-106 case and label the connection as a hypothesis. A separate source may corroborate or contradict it. Returning evidence is sufficient; the player does not capture a younger version of the entity.

**Build / verdict:** K, O and a bounded residue hazard if physical inspection is included. Little novel engineering, but highly specialized narrative and no recurring facility function. Best as an optional evidence branch after SCP-106 has a reason to matter, not an early standalone release.

### P51 SCP-3393

**Source:** [references/scp-3393/2026-09-09-revision-38.txt](references/scp-3393/2026-09-09-revision-38.txt). An antimemetic entity alters access to records and information; terminal access can be used to locate it indirectly.

**Opportunity and map:** An archive audit finds an account no one remembers. On a small office map, compare physical door activity and access metadata, prepare a monitored terminal, and isolate its room when the anomalous access occurs. The field goal is a verified occupancy event, not shooting an invisible sprite.

**Return and follow-through:** Return protected metadata and a containment status, leaving the entity in the isolated room. Later protection against forgetting could enable ongoing study, but must have explicit limits and costs.

**Build / verdict:** I, K, O, D and actor-specific memory/access state. Current Recorded-map snapshots do not model antimemetics. Keep developer/player truth visible; only characters and diegetic records lose access. Fascinating but directly at odds with near-term information-visibility priorities, so defer until ordinary evidence and authorization work well.

### P52 SCP-3007

**Source:** [references/scp-3007/2026-09-09-revision-69.txt](references/scp-3007/2026-09-09-revision-69.txt). Subjects perceive another environment while retaining some real-world senses; injuries transfer and investigation raises information hazards.

**Opportunity and map:** A clinic asks for help supporting an affected adult. The initial team clears a safe ordinary room, records an episode and returns the patient's account. A later voluntary exploration gives the player two distinct views: a care team attending the body and a bounded perceived bridge route. Do not simply move the person's only position to a new map.

**Return and follow-through:** Return the consenting patient to specialist care and preserve a controlled record. Successful treatment or a cure is not established. The first objective is safe observation, not reaching the final revelation.

**Build / verdict:** Full version needs X, H, I, A, K and explicit concurrent-body/experience ownership. Score reflects that distinctive version; clinic record recovery alone is E2 but much less interesting. Visual addenda require further review. No base floors, physics of falls, or secret UI contamination introduced as incidental work.

### P53 SCP-2399

**Source:** [references/scp-2399/2026-09-09-revision-60.txt](references/scp-2399/2026-09-09-revision-60.txt). An immense damaged extraterrestrial machine repairs itself near Jupiter while the Foundation monitors and blocks communications.

**Opportunity and map:** A terrestrial support station reports loss of a link to the monitoring program. Repair backup power, collect the buffered observation record and restore the uplink on a small station map. The ground link is an invented local contribution; it does not make one squad responsible for fighting the machine.

**Return and follow-through:** Preserve one segment of remote observation and contribute finite supplies or staff time to a broader operation. Any strategic progress should report a limited contribution, not make a short site repair reset the entire canonical reconstruction percentage.

**Build / verdict:** W, O, K, D and a bounded strategic dependency. No spacecraft simulation, antimatter crafting or captured reactor. Reasonable background pressure once the campaign exists, poor near-term fit for personnel-scale containment. Full direct engagement would be a separate game-scale undertaking.

### P54 SCP-076

**Source:** [references/scp-076/2026-09-09-revision-81.txt](references/scp-076/2026-09-09-revision-81.txt). A dangerous recurring humanoid returns through a stone container; the canonical installation is far beyond an ordinary cell.

**Opportunity and map:** First support a specialist facility by recovering its monitoring archive and repairing an outer transfer route. A later dormant-container move uses a prepared heavy-cargo bay, redundant closure work and a withdrawal plan; agents do not carry the stone cube like an archive case.

**Return and follow-through:** Bring records and a completed specialist handoff. Installing the container at Site 828 should be a major containment commitment, not the default reward. Neutralizing an active manifestation is not permanent resolution.

**Build / verdict:** V, H, A, repeated manifestation identity, complex containment and multi-threat tactics. Flooding, vertical shafts and canonical destructive contingencies are outside the current base scope. Keep the first proposal horizontal and indirect. Famous, but poor immediate fun/effort compared with SCP-173 or improving ordinary response and evacuation.

### P55 SCP-835

**Source:** [references/scp-835/2026-09-09-revision-61.txt](references/scp-835/2026-09-09-revision-61.txt). A large immobile marine anomaly needs open-water containment, remote work and management of hazardous outputs.

**Opportunity and map:** An offshore operation sends a sampling-control failure notice. Dispatch to a shore laboratory/service platform map, restore the remote sampler link, secure a sealed returned sample and keep it separate from ordinary cargo. The offshore entity remains off-map.

**Return and follow-through:** Bring a specialist-approved sample and operational data, or forward both directly to a marine facility if Site 828 lacks support. Do not return the entire entity to an underground room or depict the source's graphic internal expedition.

**Build / verdict:** B, V, W, K and bounded remote sampling; underwater diving, tethers, pressure and life support are E5 additions outside this version. Even the indirect mission depends on useful quarantine. Low immediate priority because simpler sample-return anomalies exercise the same systems without marine specialization.

### P56 SCP-2439

**Source:** [references/scp-2439/2026-09-09-revision-36.txt](references/scp-2439/2026-09-09-revision-36.txt). A prisoner-maintained warning describes an infectious idea and a fragile, coercive institutional containment arrangement. Its claims should not be treated as omniscient exposition.

**Opportunity and map:** A welfare inspection encounters unexplained attempts to prevent entry to a maintenance room. Establish a confidential conversation without ordering the warning transcribed, improve immediate living conditions, and obtain a restricted alert for specialist review. Returning less information can be the successful choice.

**Return and follow-through:** Create a protected support obligation and review the institution's practices, not a weaponized idea in the player's inventory. A fuller version must decide what each person knows and how information crosses a boundary.

**Build / verdict:** I, S, K, O and institutional role/knowledge state. Do not implement disposable-person turnover or reward spreading the idea. The story's central point is difficult to preserve with the current six-staff management model. Defer; a care-and-evidence inspection is the only sensible initial adaptation.

### P57 SCP-231

**Source:** [references/scp-231/2026-09-09-revision-85.txt](references/scp-231/2026-09-09-revision-85.txt). A highly sensitive institutional containment story relies heavily on withheld information and vulnerable people.

**Opportunity and map:** A specialist review requests recovery of a sealed research notebook from an abandoned cult records office. Secure the rooms, recover the evidence without exposing bystanders, and send it to an authorized care/review team. Do not stage or elaborate the withheld procedure.

**Return and follow-through:** The result is evidence for investigating safer care, plus a staff support obligation if the campaign includes it. No resident trophy, catastrophe meter tied to abuse, or invented definitive explanation of the redactions.

**Build / verdict:** K, O, I for controlled information and S/H for meaningful support. The retrieval itself could be E1, but an adaptation with responsible, nontrivial consequences is much more demanding. Keep on editorial hold until the game's content boundaries are agreed. It is entirely reasonable to omit playable adaptation after this review.

### P58 SCP-001-O5

**Source:** [references/scp-001-o5/historical/2026-09-09-revision-53.txt](references/scp-001-o5/historical/2026-09-09-revision-53.txt). The historical Factory tale links useful objects to institutional dependence and concealed costs. The current archived URL instead resolves to a removal notice.

**Opportunity and map:** A shipment carries a familiar manufacturer mark that should no longer exist. Inspect a bounded disused loading hall, recover a ledger and one quarantined tool, and choose to leave tempting unverified equipment behind. No full industrial megadungeon is necessary.

**Return and follow-through:** Trace provenance through a short investigation. A tool's use may create a disclosed, testable obligation in an explicitly adapted story; do not make ordinary resource consumption secretly fund an unknowable punishment or reproduce abusive production systems.

**Build / verdict:** K, O, D and bounded artifact-use consequences. Strong campaign theme, weak reason to prioritize this removed work over active sources or original content. Editorial/licensing review before production; preserve author/source history rather than silently substituting names. No recommendation to implement the entire tale's cosmology.

### P59 SCP-963

**Source:** [references/scp-963/historical/2026-09-09-revision-70.txt](references/scp-963/historical/2026-09-09-revision-70.txt). The historical amulet transfers a stored identity on contact, with lasting duplication after a documented duration.

**Opportunity and map:** A sealed evidence locker contains an object whose handling records contradict the current personnel record. Recover it with no direct contact and preserve both records. On the small office/medical map, keep an affected consenting person separate from ordinary cargo and arrange specialist care.

**Return and follow-through:** Return the secured item and a provenance discrepancy, not a resurrection upgrade. A full adaptation would need body identity, mental identity, memories, rights and long-term transfer consequences to remain distinct.

**Build / verdict:** I, A, H, V, K; full behavior is E5 and touches foundational personnel identity. The sealed-object prelude is much cheaper but is not enough to justify a resident version. Editorial hold because of the historical source status and associated character. An original identity-hazard proposal may be preferable, clearly credited where derivative rather than presented as independent canon.

## Additional Candidates

These are **not in the offline catalog** and are provisional suggestions from general familiarity, not source-verified recommendations. Archive and review the current articles and attribution before ranking them alongside the 59 reviewed works. No new downloads or runtime dependencies are introduced by this draft.

| Candidate                                       | Proposed expedition and return                                                                                                                                                                 | Why consider it / new work                                                                                                                                                       | Tentative F / E |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| [SCP-914](https://scp-wiki.wikidot.com/scp-914) | Secure a workshop, recover settings/experiment records, and commission a controlled off-site machine test. Return one labeled output and its actual input history, not a pocket-sized machine. | Strong physical experiment loop. Use a small authored input/settings table with real consumption and no universal item generator. K, W, D and transformation provenance.         | 5 / 4           |
| [SCP-500](https://scp-wiki.wikidot.com/scp-500) | Recover a finite sealed medical supply from a disrupted transfer, then decide which eligible patient receives a dose.                                                                          | Powerful reserve-versus-use decision and medical payoff. H, K, dose accounting; verify limitations before claiming a cure for any particular anomaly.                            | 4 / 3           |
| [SCP-085](https://scp-wiki.wikidot.com/scp-085) | Retrieve a fragile drawing portfolio and provide safe paper-based accommodation; return a cooperative resident and her environment together.                                                   | Distinct containment geometry without combat. A, S, K and a bounded two-dimensional surface interaction; no arbitrary drawing parser.                                            | 4 / 4           |
| [SCP-131](https://scp-wiki.wikidot.com/scp-131) | A low-risk escort from a maintenance wing introduces small cooperative residents.                                                                                                              | Potential observation/companion interaction after P exists. Verify actual observation abilities and SCP-173 interactions before promising a permanent labor-free countermeasure. | 4 / 3           |

Also consider two **original** integration scenarios with no claim of SCP canon:

- **Damaged specimen courier:** A stopped delivery contains one known emitting object inside a wearing vessel. Bring an empty replacement case, transfer safely at the roadside, and return the same specimen/source identity. V plus existing materials/emissions makes this the cheapest meaningful transport prerequisite for several top picks. F4/E2-3; field work is not free. The tradeoff is time spent repacking versus the forecasted remaining protection.
- **Emergency care transfer:** Help a willing patient leave a service clinic while collecting finite medication and records. A/H/O prove escort, interrupted care, arrival admission and partial outcomes without an anomaly's special rules. F3/E3; its value is reducing the implementation risk of SCP-2295, SCP-507 and SCP-191.

## Implementation Discipline

For each selected mission, ship one complete field-to-base consequence before adding another article. Tests should establish real command outcomes: roster conservation, cargo identity, finite resources, safe cancellation, no duplication after partial return/reload, persistent consequences and a reachable exit/rescue outcome. Use authored scenarios as playable integration fixtures, not exact-tick walkthroughs.

Content needs ordinary counterplay and truthful previews. Research must take a worker, reachable apparatus, required materials and time; an evidence record must say what was observed rather than instantly declaring a mechanism. An opportunity should state its goal and known risks, and declining one should not silently doom the campaign. Cooldowns/deadlines operate in simulation time and stop while paused.

Do not assume existing base vessel transport automatically services expeditions, or that declaring power objects on a field map advances the power system. The projection and command boundary must be extended deliberately. Do not retain obsolete save formats to support a new proposal: change the schema and discard incompatible development saves.

Keep the current underground single-level base. Remote buildings, abstracted staircase scenes and off-map transport do not authorize roofs, outdoor base weather, floor penetration, simultaneous base levels, or a strategic world simulator. Defer new information hiding; expose actual simulation causes while tuning. Preserve readable inspection and accessibility for all information-hazard adaptations.

Source text, new derivative writing and art require per-work attribution and appropriate CC BY-SA handling. An article's license does not automatically clear every embedded photograph, film still, commercial brand or music clip. Prefer original compatible assets, retain historical/removal status and do not copy these sources into the generic graphics package.
