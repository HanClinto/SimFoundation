# SCPSiteManager Interface Look-Book

This document records the intended presentation language for SCPSiteManager. It is a design compass, not a requirement to reproduce any historical product literally.

## Core Metaphor

**The simulation is the desktop.**

The player is not looking at a game wrapped in an operating-system skin. The desktop is the player's operational workspace inside the fiction:

- Persistent sites and global tools appear as desktop objects.
- Opening a site reveals a folder-like facility inspector containing its available subsystems.
- Maps, rosters, alarms, budgets, research records, pawns, equipment, and anomalies open as independent modeless inspector windows.
- Several windows should be useful at once. The interface defaults toward comparison and arrangement rather than one full-screen view replacing another.
- Window position, size, open state, view mode, focus, and stacking persist as presentation preferences outside simulation state.

Personnel retain the same skin, hair, and uniform palette across their map sprite, inline selection portrait, Day Planner, and dossier. These colors identify the person; they do not encode hidden health, diagnosis, or an unimplemented equipment loadout.

### Physical Activity

The map shows physical work through objects and posture as well as activity bubbles:

- Meals, bundled building materials, strapped beds, folded furniture, and material containment vessels retain the same artwork when carried and placed. Installed furniture uses its full station illustration.
- Personnel face left or right with their most recent movement, alternate walking and carrying steps, and adopt working, seated, or reclining poses. Routine destinations are not treated as completed actions.
- Adjacent observed tile steps interpolate in presentation only. Teleports, skipped ticks, perspective changes, and lost visibility do not invent travel. Bubbles, selection hit tests, and the follow camera use the displayed position. Pause freezes visual time; reduced motion uses immediate positioning and static poses.
- Projects shows wireframe planned surfaces and vessels, crossed removal targets, and scaffolding with fitting progress. Delivered supplies remain real ground objects. Working effects require an active worker at the work site and respect the Effects toggle. These previews are not installed structures or new collision geometry.
- Concrete cracks, steel wear and dents, ceramic fractures, composite splits, and failed-structure debris expose material condition even without the numeric Condition overlay. Viewing Floors does not paint failed-wall debris over that layer.
- Vessel lids and latches distinguish open from sealed cases; wear, critical damage, and breaches alter the case itself. Existing emission effects stop at an intact sealed vessel and resume when its physical barrier fails. Wear marks are condition cues, not a forecast of an invented gradual leak.

Recorded view uses observed object art and posture. Issued work plans remain available, but unobserved fitting progress and current work effects are withheld. Cosmetic animation neither modifies simulation state nor creates assessments, inventory, equipment, or saved animation state.

Temporary expedition maps and future facilities use the same pattern. They are additional inspectable simulation objects, not routes in a single-page application.

## Historical Touchstones

### Windows 95 and 98

Use the spatial grammar of a desktop: icons, folders, title bars, menus, task buttons, status bars, system trays, and direct manipulation. Controls should look operable and states should be visibly selected, disabled, active, or inactive.

The bottom taskbar is global. Its **SCP** menu owns metagame entry points such as site selection, save/load, settings, and exit-equivalent actions. The bottom-right simulation clock occupies the conceptual place of the operating-system clock and opens global playback controls.

Facilities is a folder inside the SCP menu. Individual sites such as Site 828 are entries within it so the hierarchy naturally extends to multiple managed facilities.

### Encarta 95 and early CD-ROM reference software

The Foundation Library should feel exploratory and multimedia-rich:

- Hierarchical topic trees beside illustrated articles
- Cross-linked records that encourage following a trail
- Small interactive diagrams, audio/video records, maps, and document facsimiles
- Strong article typography inside otherwise utilitarian window chrome
- A sense that the archive contains more than the player currently understands

The knowledgebase is both help system and in-world encyclopedia. Facts unlock through observation and research; unavailable or disputed information should be represented honestly inside the fiction.

Research uses this reference-book language as an evolving investigation archive: illustrated anomaly entries link to dated observations, hypotheses, experiment protocols, and related cases. SCP-9620 is the central unresolved investigation; optional anomaly studies may inform it without becoming compulsory quest steps. Separate established source material, in-world findings, and uncertainty. Do not present the archive as a checklist of foreknown answers.

### Lotus Notes and institutional groupware

Operational windows should feel like tools issued by a large bureaucracy:

- Dense forms, reports, tables, inboxes, approval queues, and audit histories
- Different subsystems with related but not perfectly uniform layouts
- Clear ownership, timestamps, status, and responsible personnel
- Administrative friction used selectively for flavor and meaningful decisions, not repetitive busywork

### Early CD media with diskette leftovers

The world is transitioning between eras. Rich camera feeds and multimedia archives coexist with plain text terminals, printed reports, removable-media language, and awkward legacy subsystems. This contrast supports both cozy nostalgia and institutional unease.

## Window Hierarchy

### Global desktop tools

- SCP menu: new/load/save, settings, global navigation, and application lifecycle
- Simulation Control: pause and speed, with Standard and Minimal views
- Foundation Library: global help, discovered lore, protocols, and multimedia records
- System Monitor: opt-in developer diagnostics only

### Facility folder

A facility inspector behaves like a folder. Its icons represent installed and functioning facility subsystems, including:

- Camera Feed / Surveillance
- Personnel Roster
- Alarm Manager
- Budget Report
- Research Archive
- Future logistics, utilities, medical, security, and containment systems

Subsystem buttons open with a single click, Enter, or Space. Desktop shortcuts retain pointer double-click activation and also support Enter/Space; taskbar and SCP-menu entries remain single-click. These activation rules do not change simulation state.

Subsystem availability is simulation-backed. A physical system can be uninstalled, underpowered, damaged, jammed, sabotaged, or upgraded. Losing the alarm controller can remove automatic speed reduction or pause behavior even though manual pause remains globally available.

Staffing and routine inspectors should emphasize shift coverage, responsibilities, outstanding needs, and exceptions rather than requiring approval of each pawn action. Support progressive detail: a facility summary identifies a missed or uncovered duty, its inspector shows the schedule and available evidence, and personnel records provide assessed context. Report the observed deviation without automatically revealing its hidden cause. Keep optional opportunities and research authorization distinct from the routine job monitor; its final interaction design remains open.

### Object inspectors

Double-clicking or following a link opens the relevant object without closing unrelated work. Inspectors should answer:

- What is this?
- What is it doing now?
- Why is it doing that?
- What does it need or depend on?
- What changed recently?
- What can the player do about it?

## Visual Language

- Use 98.css chrome and familiar desktop controls rather than modern cards or app-dashboard conventions.
- Keep cards out of window content. Prefer fieldsets, tables, panes, trees, lists, ledgers, status bars, and document surfaces.
- Reserve white and lightly tinted document backgrounds for folders, reports, forms, and articles. Maps and media may use darker display surfaces.
- Use color semantically and reinforce it with words, icons, or patterns. Incident meaning must never depend on color alone.
- Keep typography compact in controls and panels. Reports and encyclopedia articles may use period-appropriate serif display typography within their document pane.
- Desktop and subsystem icons should be legible at small sizes, use hard edges, and describe object type before decorative detail.
- Original SVG assets may be cleaner than historical bitmaps, but should respect the restrained geometry and limited visual density of the period.
- Historical fidelity is subordinate to legibility and manipulation. Modern soft shadows, clearer stacking depth, generous hit targets, and other restrained quality-of-life improvements are welcome when they make a dense multi-window desktop easier to understand.

## Interaction Rules

Scene depth remains physical rather than selection-driven: at equal depth, ground objects draw before pawns, so selecting a bed or seat cannot cover its occupant. Selection priority applies only within the object or pawn group; nearer entities still occlude farther ones normally.

### Direct Person Control

For normal clicks without a subject, the floor beneath a lone pawn or object does not count as ambiguity: that entity is selected or inspected directly. Multiple entity hits still open the chooser with the floor included. Shift+F10 explicitly opens the full chooser, preserving access to the underlying floor even when there is only one entity. With an active subject, the floor remains a normal command target for Go Here.

The X at the right of the portrait header means Deselect active pawn. Clicking the active portrait also deselects; explicit Control commands remain idempotent. Deselection clears browser control selection, closes its contextual menu and hides its queue without cancelling any activity or changing draft status. A self-selected pawn highlight clears; an independently selected object/target remains inspectable. Header deselection also works in Recorded view and during placement. With no active pawn, a sole candidate opens directly: a controllable pawn becomes the subject, and any other entity/object/tile opens its inspector. Ambiguous clicks show a headerless subject/inspection chooser, not a command-target tree. One activation selects a pawn as subject or inspects a non-pawn; there are no verb submenus, branch arrows or separate Select Person command in this chooser. Recorded candidates still use observed visibility; an unavailable pawn opens its record instead of claiming control. Each action tile retains its own X for owner-aware cancellation; those controls never deselect the pawn. Follow remains an independent camera choice.

Each map has one selection-and-orders area containing portrait shortcuts, target details and the action tray. Clicking an inactive portrait selects and highlights that person on the map, updates the inspected target and makes them the command recipient without drafting or moving them. The camera snaps to their displayed position without changing zoom. With Follow checked, it stays checked and tracks the newly selected pawn; with Follow unchecked, this is a one-time snap only. Recorded view uses the observed position rather than hidden live coordinates; off-map pawns without a displayed position do not fabricate a camera destination. Portrait deselection leaves the camera still. When actor and target are the same, duplicate portrait/name/activity details are omitted; needs and Orders remain, and the header name opens inspection. When they differ, the active person's header stays visible and the compact target section is explicitly labelled Target; its name is the inspection link, without a separate Inspect button or empty feedback row. Another pawn's target row offers Control to switch recipients deliberately without a camera snap. Clicking an object or opening a dossier leaves the actor selected and preserves Follow.

Target clicks use a Subject > Object > Verb hierarchy styled with the existing 98.css menu extension. The active person's portrait and name head the popup without a repeated breadcrumb. Visible overlapping targets and the underlying floor have separate icon-labelled branches. A sole target is chosen and expands automatically; multiple targets wait for explicit activation, never hover. First activation chooses and expands an unchosen branch; activating the chosen row opens its inspector. Chosen rows remain highlighted and their tooltip changes from Choose target to Inspect plus the target name. There is no separate Inspect menu item. Expansion keeps the popup anchored with bounded scrolling instead of repositioning it under the pointer. Expanding a branch never issues an order. Right arrow enters its verbs; Left collapses them and returns to the target without forgetting the chosen object. Clicking elsewhere on the map dismisses the popup without opening another one on that click. Select Person remains outside the command tree. A future optional Adjective/modifier level can qualify a verb when the simulation supports a real choice; no placeholder modifiers are shown.

Ground offers Go Here and Hold Position; people offer Stabilize; the adversary offers Attack and Engage From Here; field cargo offers Recover to Extraction. Attack includes physical approach to a firing position; Engage From Here holds the current position. Unsupported personal-use actions are omitted. The presentation remains independent of action descriptors. Disabled reasons update without replacing keyed controls.

Base beds, meal seats and break seats offer Sleep, Eat and Relax respectively. The Player-labelled routine uses the clicked furniture, existing physical travel/doors and the normal eating/rest/relaxation executor. Packed, damaged, reserved or unreachable furniture gives a disabled reason; pending entries revalidate when starting and acquire no speculative seat reservation. Eating collects one physical meal and cannot be cancelled while carrying it to the seat. Explicit Sleep/Relax is not discarded merely because the schedule or mood would not currently select it. The tray and map cues show the routine activity rather than the internal tactical Hold used to keep control. Completion or safe cancellation advances pending work; loss of access leaves a stopped entry with Retry/Cancel. No field routine facilities or new preference behavior are implied.

Commands default to Add to Queue without a placement preview. The map toolbar's Orders menu selects Add to Queue or Do Now for that window's browser lifetime, outside the contextual popup. Do Now safely replaces the current action while retaining pending work. The queue holds at most eight intentions including the current one. A horizontally scrolling tray shows target thumbnails with verb captions and individual X controls. The highlighted current action stays pinned at the left; pending tiles can be dragged before/after one another or to the end. Alt+Left/Right and Alt+Home/End provide keyboard reordering. Tooltips name targets and destinations. Retry and Clear Pending remain available below the tray. Construction still uses Confirm/Cancel. Double-click continues to inspect, dragging pans, and menus stay within their map viewport. Recorded and placement modes disable edits. Cancellation preserves spent supplies and physical cargo ownership; field cargo is put down where its carrier stands. Pending reorder changes only intention order, never the running executor or reservations.

Undrafted base staff temporarily leave autonomy for a valid direct move or stabilization and resume it after completion and recovery. Drafted staff continue holding; explicit Hold or engagement takes draft ownership. Cargo, appointments, casualties, field recovery and expedition phases keep their ownership protections. See [decision 004](decisions/004-direct-person-control.md) for input, ownership and future queue contracts.

Inspector tactical orders and expedition recovery commands are explicit ownership takeovers: accepted commands clear the affected person's manual queue. Map Do Now instead preserves pending intentions. Both paths use the existing tactical/recovery executors and their safety checks; field-map adapters delegate to the root controller. Object relocation remains a worker-owned logistics job rather than a pawn intention. Inspection alone, subject switching, Follow and Recorded-view changes do not take ownership or alter queues.

Action tiles use a shared progress contract with action-specific measurements and an elapsed-time fallback. Active Eat, Sleep and Relax show a restrained whole-tile percentage background fill and approximate remaining in-game minutes once activity at the furniture begins. The accessible progressbar retains its value and estimate. Source labels use compact badges beside the unchanged 40px icon, with full labels in tooltips and accessible names; verb captions retain their 10px type and 13px line height. The 126px-tall tile keeps its current step and bottom readout inside its bounds. Sleep estimates the remaining rest deficit to95 using net recovery0.30 per minute; Eat/Relax use their existing12/30-step durations. Go Here/Retreat, routine travel, job travel and field recovery travel show remaining A\* route tiles to their current destination, with a plain background and no percentage or arrival-time claim. Meal collection counts the current pantry leg, then the seat leg. Door opening may take extra time; inaccessible destinations say No route, never zero tiles. Tactical approach retains elapsed time until its executor exposes an appropriate route measurement.

Other current actions, including Idle, Hold, mission transit and blocked intentions, show elapsed in-game minutes. Elapsed means time on the current intention, including blocked/waiting time; pause does not advance it. Pending entries remain unmetered and acquire their timer only when current. Routine travel and execution share one action clock even when the displayed measurement changes. Tooltips retain elapsed time alongside specialized measurements, and state when simulation is paused. Tile dimensions stay fixed. Schema44 saves identity/map-scoped action start times so window selection, reopen and save/load do not reset them. Percentages and routes remain derived; routine execution rules are unchanged.

The current action tile also shows its current execution step below the verb, such as Walk to pantry, Carry meal to seat or Open door. Execution details expands the current nested path and source (for example Eat / player > Collect meal > Walk to pantry > Open door). Only implemented current phases are shown, not a predicted future step list or a history. Steps reference the parent's identity and cannot be individually reordered or cancelled; the parent intention remains the queue item and retains its clock. Door steps are emitted by actual movement execution, remain visible while paused on that tick, and clear on later ticks or parent replacement. Routine/job/recovery progress stays with its existing owner. Schema44 accepts the optional parent timing door-step metadata; no new queued prerequisite or schema bump is added.

The tray is not limited to manual orders: active Eat, Sleep, Relax and Work/appointment actions appear even with no player queue. Current tiles identify their producer as Need, Schedule, Autonomy or Job; manual entries show Player. Add to Queue leaves that automatic action current and shows player intentions to its right until the owner finishes. Do Now requests safe interruption instead. All player intentions waiting behind automatic work are pending and can be reordered or cleared. Automatic current tiles are not draggable; their X control gives a reason when cargo or a clinical appointment prevents cancellation. The detail strip continues to show the real activity during a wait, rather than claiming the first manual entry is already running.

An available person with no commitment shows Idle / Available using their portrait, without a cancel button or a queued gameplay task. Blocked routine discovery or unclaimed cargo shows Waiting with the real reason, not Idle. Existing tactical orders and recovery are shown even if issued through an inspector rather than the queue. Cancelling legacy movement stops it without resetting recovery; a ready base Hold can release tactical control when safety checks permit. Expedition assembly, transit, regrouping and cargo recovery show Mission ownership. Transit is inspectable from the field portrait strip without fabricating a map position. Mission phase cancellation stays with Expedition Operations. Incapacitated/stabilized personnel show their condition and cannot dismiss it as an order. These are derived views under schema42, not new stored intentions or changes to autonomous selection. Speculative future autonomous choices are not displayed.

- Target desktop browsers and a minimum 1280x800 virtual workspace. Narrow viewports pan across the desktop rather than reflowing into a mobile application.
- Windows are draggable and resizable when their content benefits from space. Preserve the user's chosen dimensions during drag and reload, including deliberately tiny layouts; minimums should protect only recoverable title-bar access rather than enforce a designer-preferred content size.
- Closing a window does not destroy its simulation object or reset its preferred geometry.
- Desktop and folder icons use the conventional select/open rhythm; taskbar and menu commands act immediately.
- Active and inactive title bars make focus and stacking obvious.
- Every managed window uses the same identifying SVG in desktop or folder launchers, its title bar, and its taskbar entry. Icon-consistency checks should compare all launch surfaces against the registered window icon. The taskbar lists open windows only; its pressed entry tracks the focused window, and closing a window removes its entry.
- Utility windows may provide named density modes such as **Standard** and **Minimal** instead of one compromise layout. Simulation Control uses compact square media-player controls: pause, play, and progressively faster forward glyphs.
- Global simulation time continues while modeless windows are rearranged unless paused by the player or alarm policy.
- Raw tick counts, seeds, internal IDs, and deterministic machinery belong in developer tools, not ordinary operational views.

## Tone

Routine operation should feel competent, tactile, and slightly cozy: a collection of familiar tools arranged by the player into a working desk. Unease comes from what those tools report, from gaps in the archive, and from systems failing under pressure rather than from making every screen visually ominous.

Humor may emerge from bureaucratic language confronting impossible events. Avoid parodying the interface so heavily that the facility stops feeling functional.

### Editorial voice

The Foundation writes as though anomalous events are real, classifiable workplace conditions. Its voice is precise, restrained, procedural, and emotionally controlled. It does not wink at the player, explain the joke, or describe itself as sinister.

Three rules govern institutional copy:

1. The Foundation never tries to be funny.
2. Horror is described as an operational exception, medical finding, compliance issue, or maintenance concern.
3. The more alarming the event, the calmer and more specific the language becomes.

Cold does not mean vague. Reports identify what happened, when it happened, how confident the Foundation is, and what action is required. Bureaucratic phrasing may reveal institutional detachment, but it must not hide information the player needs to make a decision.

The institution and its personnel have different voices. Forms, alerts, protocols, and official reports remain controlled. Personal notes, interviews, memories, and dialogue may be frightened, compassionate, irritated, or funny. This contrast preserves the game's cozy human center without making the Foundation itself conversational.

### Writing by surface

| Surface            | Voice                                              | Typical content                                                |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------- |
| Buttons and menus  | Short, literal commands                            | `Schedule Evaluation`, `Open Medical Chart`, `Restrict Access` |
| Status bars        | Factual state plus time or scope                   | `Signal lost — last contact 14 minutes ago`                    |
| Alerts             | Consequence first, action second                   | `Containment pressure rising. Engineering response requested.` |
| Personnel dossiers | Administrative and evidence-aware                  | Assignment, clearance, confirmed and suspected findings        |
| Medical records    | Clinical, person-specific, non-sensational         | Injury location, confidence, treatment, prognosis              |
| Incident reports   | Chronological and dispassionate                    | Observations, damage, casualties, unresolved causes            |
| Research records   | Cautious and revision-friendly                     | Hypothesis, evidence, protocol change, confidence              |
| Foundation Library | Formal reference prose with controlled uncertainty | Established facts, disputed interpretations, redacted context  |
| Personal records   | Individual voice rather than house style           | Interviews, messages, memories, complaints                     |

### Knowledge language

**Perspective rule:** the simulation-oriented map explicitly offers World and Recorded views. World exposes physical state and labels Engineering reads as simulation state; Recorded uses observations and timestamps. This distinction is deliberate, not a side effect of disabling an overlay. Personnel assessments remain evidence-limited records; World mode does not fabricate diagnoses or update survey history.

Facility observability follows the same rule. Personnel presence and functioning, placed cameras provide coverage subject to their sensing limits. Without current observation, show timestamped remembered terrain, facility condition, and anomaly sightings rather than live state. An unexplored area is unknown; a previously observed area is remembered, not guaranteed unchanged. Map rendering, selection, tracking, inspector links, and anomaly records must all respect that boundary. Authoritative simulation activity continues outside observation. The initial observation layer implements local sight, remembered tiles and entity sightings, and camera enable/disable controls; power and communications failures remain later extensions.

Use epistemic labels consistently. These words are gameplay states, not decorative flavor:

- **Confirmed:** supported strongly enough for operational use
- **Suspected:** evidence exists, but the conclusion remains uncertain
- **Ruled out:** not supported by the named assessment and its evidence; later evidence may overturn it
- **Unassessed:** no suitable evaluation has been completed
- **Unknown:** the Foundation lacks current information
- **Stale:** once-useful information is too old to treat as current
- **Last observed:** a timestamped fact that makes no claim about the present

Never use a healthy-looking blank state to mean unknown. Prefer `No current assessment` over `Normal`, and `No finding reported` over `None` when the underlying state may be hidden.

### Humor and horror

Humor should come from understatement, procedural mismatch, and institutional priorities. It should not come from jokes about injured personnel, meme references, genre-aware dialogue, or deliberately incompetent controls.

Good examples:

- `No actionable abnormality detected.`
- `Candidate history contains statistically unusual survivorship.`
- `Probability distortion suspected. Continue routine observation.`
- `Telemetry unavailable. Last acceptable reading: 14 minutes ago.`
- `Employee medically cleared. Contaminated footwear retained for analysis.`
- `Containment exposure remains within revised personnel guidelines.`

Avoid exaggerated redaction, constant classification codes, ominous all-caps warnings, and jargon in every sentence. One dry line beside an otherwise useful report is stronger than making every label a punchline.

### Copy hierarchy

Operational text should follow this order:

1. State the observable fact.
2. State confidence, source, or timestamp when uncertainty matters.
3. State the consequence or required action.
4. Add restrained institutional context only if it changes interpretation.

For example: `Elevated heart rate detected. Wearable telemetry, 2 minutes ago. Medical review recommended.` This is clearer and more unsettling than either a generic `WARNING` or a paragraph of atmospheric prose.

## Anti-Goals

- Mobile-first or responsive dashboard layouts
- One full-screen page replacing another for every task
- Generic SaaS cards, oversized headings, floating pills, or marketing-page composition
- Decorative fake controls that appear actionable without an honest disabled or preview state
- Fourth-wall game telemetry in normal facility tools
- Exact copying of proprietary historical icons, media, sounds, or layouts
- Nostalgia that reduces readability, keyboard access, or clear state feedback
- Simulating administrative work that has no meaningful decision, consequence, or narrative value

## Current Prototype Decisions

- Storage and Hauling owns floor-area designation, accepted-item checkboxes, capacity and target inputs, meal-serving policy, and active/incoming stock status. Its relocation preview uses the same map placement contract as physical objects. The Storage overlay marks administrative boundaries without hiding Objects or Activity; area selection opens the policy record. Stock moves only through worker hauling, and relocating a designation leaves old stacks in place until moved.

- Furniture and supplies are selectable physical objects. The Objects and Supplies inspector owns orientation, partial-stack quantity, Move / install, Pack in place, Locate and pre-pickup cancellation. Placement reuses the map's generic request interaction. Installed objects use the existing bed/table/seat assets; packed inventory and supply stacks use count-marked crates, and carried cargo is attached to its pawn. World and Recorded perspectives retain their established distinction.

- Pawn activity uses original pixel-icon bubbles at stable screen sizes: an action or intent bubble plus an outward-mood badge when awake. Action cues come from routine/job state, not default biography text. Sleeping, eating, breaks, travel, hauling, engineering, clinical work, research, security work, blocked needs, and active social contact have distinct symbols. Hover gives a plain-language label; clicking selects the pawn and double-clicking opens its record. Selected-pawn status text also exposes the labels for keyboard use.
- Activity is an independent Layers toggle, enabled by default with Objects. Bubbles disappear below 45% zoom and for unseen pawns in Recorded view; visible emotion uses recorded outward appearance, not psychiatric diagnosis. World view can show unmet hunger/rest intent. Sleeping suppresses mood; masking/reserved behavior remains respected. Crowd layout prioritizes actions, offsets bubbles around other indicators and pawn silhouettes, and omits secondary cues when space is unavailable.

- Fresh sites use coherent room-sized examples of all four material families on both floors and walls. Room finishes live in the simulation, not special rendering rules. The lab and outer shell retain concrete; medical areas demonstrate ceramic, utilities and storage steel, and quarters/security composite. Saved sites are not silently refinished when the starting layout changes.
- Disabled replacement controls show their current reason beside the action. Opening Engineering without a tile shows an empty-selection state and a Choose tile command, rather than an unexplained disabled button.

- Installed materials are visible in the normal Site base map, not only the Materials base. Concrete uses muted casting seams and aggregate marks; steel uses cool metal panels, highlights, and rivets; ceramic uses a pale grout grid; composite uses dark green ribbed panels. Walls have matching shaded sides, while floors use flat versions of the same treatments. Detail appears at 55% zoom and above; material colors remain at lower zoom. Doors retain a contrasting threshold marker. Appearance follows installed state or the last recorded observation, never a pending replacement order.

- Inventory, pawn identity, and anomaly identity icons use 32x32 display boxes with labels outside the icon. Larger anatomy, uniform, and chamber images are reference illustrations, not oversized identity icons.
- Placement starts in its owning inspector, with only a temporary Confirm/Cancel bar in the map. Clicks pin the supplied footprint; changing layers never changes placement. The permanent Inspect/Plan Laboratory/Place Camera selector is removed.
- The Layers panel provides World/Recorded perspective, Site/Materials base maps, Floors/Structures, and independent Condition, Rooms, Objects, Coverage, and Projects toggles. Condition outlines compose over material colors. Engineering follows the chosen physical perspective; clinical records do not.
- Day Planner has directly selectable Work/Free/Sleep paint modes and drag painting. Preset application names the selected person and reports the full-day change. Hourly skill coverage counts scheduled recorded skills, not exclusive job assignment or guaranteed availability.

- Occupational Health is a facility subwindow for clinical duty assignment, routine review cadence, appointment status, and chart access. Assessment buttons create referrals; they no longer immediately reveal findings. Clinical appointments require a distinct attending clinician and patient, so coverage and staff availability matter.

- Personnel reference views now use original SVG equipment plates, a labeled uniform reference, and an anterior medical illustration with an accessible body-region index. Art is not copied from historical reference software. The uniform reference is not yet a composited loadout portrait.
- Exact needs/stress/fear percentages and unassessed active-effect names are not ordinary dossier content. Recorded findings retain their assessment/observation status; absence of a report is not a healthy result.
- The current Work Orders ledger is an inspection experiment, not approval of a universal special-task workflow. Routine autonomy and optional investigations remain distinct design layers.
- The experimental-engineering direction and authored-before-generated anomaly policy are recorded in [containment-design.md](containment-design.md). Source snapshots and adaptation notes are indexed separately in [references/README.md](references/README.md).

- Site 828 opens as a facility folder.
- Camera Feed owns the isometric map window.
- Construction is a separate modeless facility inspector. It owns project status and cancellation; Plan and Locate coordinate with the generic map placement request. The scenario-only research-laboratory selector is removed.
- Work Orders owns proposed, available, active, and completed facility jobs. Authorization is a player decision; qualified pawn selection and progress are simulation-owned and inspectable.
- Anomaly Registry owns resident-anomaly and experiment protocol state. SCP-9620 reports the current authorized phase and earned observations; SCP-999 reports current supervised contact, recovery timing, and the last completed personnel interaction.
- Alarm Manager owns live facility incident status and response configuration. Escalation opens it automatically; Yellow incidents reduce simulation speed to 1x and link directly to response Work Orders.
- Simulation Control supports Standard and Minimal views.
- The taskbar clock opens Simulation Control and reflects run/pause state.
- The SCP menu provides explicit Save Site and Load Site commands backed by the same local record used for autosave. Settings remains visibly unavailable until implemented.
- Foundation Library demonstrates the Encarta-like article/tree split and now hosts facility-level research capabilities such as Anomalous Psychometrics.
- Personnel Roster and pawn inspectors project assessment-limited personnel state. Mood and Sanity appear as coarse behavioral impressions until an evaluation records bounded estimates; old evaluations remain timestamped. Several inspectors can remain open for comparison. The fake Budget Report and unsimulated alarm-hardware panel have been removed.
- Personnel inspectors use a compact corporate ID/dossier header with manila-style Summary, Equipment, Skills, and Influences tabs. Summary reports Physical Health only as an assessed range and launches separate modeless Medical Chart and Assessment Record windows.
- Equipment and carried inventory use the same fixed portrait-oriented icon tile: a recessed pictogram field, short caption, and item-description tooltip. Empty equipment and inventory cells retain the same geometry so changing loadout never shifts the dossier.
- Medical Chart combines a selectable body-region map with a findings list. Regions visualize assessed Injury Effects rather than owning hit points; unknown, assessed-clear, suspected, and confirmed states remain visibly distinct.
- Dossiers show only self-disclosed or assessed Trait conclusions. Behavioral evidence can appear in Assessment Record before the Trait it supports is known; research may promote that evidence to a suspicion, while targeted screening can confirm it without revealing hidden numeric parameters.
- Work-preference Biases remain hidden until a structured evaluation reports named tendencies and bounded ranges. Exact authoritative Bias values do not appear in ordinary UI. Skill levels for active personnel are labeled as official training records; they are not presented as live measurements of current performance.
- Work Orders show required Skill, assigned pawn, deterministic assignment rationale, progress, and completion state. Completed work updates the pawn's activity and official Skill XP without exposing hidden selection inputs.
- Personnel Influences show active Effects and their expiration ticks. SCP-999 contact produces a visible timed memory Effect rather than an unexplained direct mood bonus.
