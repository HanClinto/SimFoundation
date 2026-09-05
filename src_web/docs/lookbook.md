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

**Global fog-of-war rule:** ordinary interfaces show only facts justified by observation, records, sensors, or assessments. Never render an authoritative simulation value merely because it exists in the snapshot. Exact values and causal contributors belong in debug tools unless a named player-facing source supports them.

Facility observability follows the same rule. Personnel presence and functioning, placed cameras provide coverage subject to their sensing limits. Without current observation, show timestamped remembered terrain, facility condition, and anomaly sightings rather than live state. An unexplored area is unknown; a previously observed area is remembered, not guaranteed unchanged. Map rendering, selection, tracking, inspector links, and anomaly records must all respect that boundary. Authoritative simulation activity continues outside observation. The current live-map prototype does not yet implement this requirement.

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

- Occupational Health is a facility subwindow for clinical duty assignment, routine review cadence, appointment status, and chart access. Assessment buttons create referrals; they no longer immediately reveal findings. Clinical appointments require a distinct attending clinician and patient, so coverage and staff availability matter.

- Personnel reference views now use original SVG equipment plates, a labeled uniform reference, and an anterior medical illustration with an accessible body-region index. Art is not copied from historical reference software. The uniform reference is not yet a composited loadout portrait.
- Exact needs/stress/fear percentages and unassessed active-effect names are not ordinary dossier content. Recorded findings retain their assessment/observation status; absence of a report is not a healthy result.
- The current Work Orders ledger is an inspection experiment, not approval of a universal special-task workflow. Routine autonomy and optional investigations remain distinct design layers.
- The experimental-engineering direction and authored-before-generated anomaly policy are recorded in [containment-design.md](containment-design.md). Source snapshots and adaptation notes are indexed separately in [references/README.md](references/README.md).

- Site 828 opens as a facility folder.
- Camera Feed owns the isometric map window.
- Work Orders owns proposed, available, active, and completed facility jobs. Authorization is a player decision; qualified pawn selection and progress are simulation-owned and inspectable.
- Anomaly Registry owns resident-anomaly and experiment protocol state. SCP-9620 reports the current authorized phase and earned observations; SCP-999 reports current supervised contact, recovery timing, and the last completed personnel interaction.
- Alarm Manager owns live facility incident status and response configuration. Escalation opens it automatically; Yellow incidents reduce simulation speed to 1x and link directly to response Work Orders.
- Simulation Control supports Standard and Minimal views.
- The taskbar clock opens Simulation Control and reflects run/pause state.
- The SCP menu provides explicit Save Site and Load Site commands backed by the same local record used for autosave. Settings remains visibly unavailable until implemented.
- Foundation Library demonstrates the Encarta-like article/tree split and now hosts facility-level research capabilities such as Anomalous Psychometrics.
- Personnel Roster and pawn inspectors project assessment-limited personnel state. Mood and Sanity appear as coarse behavioral impressions until a psychological evaluation records bounded estimates and frozen contributors; old evaluations remain timestamped rather than silently tracking current truth. Several pawn inspectors can remain open for comparison. Budget remains an explicitly provisional preview until its simulation exists.
- Personnel inspectors use a compact corporate ID/dossier header with manila-style Summary, Equipment, Skills, and Influences tabs. Summary reports Physical Health only as an assessed range and launches separate modeless Medical Chart and Assessment Record windows.
- Equipment and carried inventory use the same fixed portrait-oriented icon tile: a recessed pictogram field, short caption, and item-description tooltip. Empty equipment and inventory cells retain the same geometry so changing loadout never shifts the dossier.
- Medical Chart combines a selectable body-region map with a findings list. Regions visualize assessed Injury Effects rather than owning hit points; unknown, assessed-clear, suspected, and confirmed states remain visibly distinct.
- Dossiers show only self-disclosed or assessed Trait conclusions. Behavioral evidence can appear in Assessment Record before the Trait it supports is known; research may promote that evidence to a suspicion, while targeted screening can confirm it without revealing hidden numeric parameters.
- Work-preference Biases remain hidden until a structured evaluation reports named tendencies and bounded ranges. Exact authoritative Bias values do not appear in ordinary UI. Skill levels for active personnel are labeled as official training records; they are not presented as live measurements of current performance.
- Work Orders show required Skill, assigned pawn, deterministic assignment rationale, progress, and completion state. Completed work updates the pawn's activity and official Skill XP without exposing hidden selection inputs.
- Personnel Influences show active Effects and their expiration ticks. SCP-999 contact produces a visible timed memory Effect rather than an unexplained direct mood bonus.
