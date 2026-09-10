# SCPSiteManager

[Play on GitHub Pages](https://hanclinto.github.io/SimFoundation/).

SCPSiteManager is a persistent, deterministic SCP-management campaign presented
as a Windows 95/98 operational desktop. The browser and CLI use the same session,
physical commands, people, equipment, evidence and consequences. The desktop
owns presentation; the simulation owns what happens.

## Start playing

The campaign starts paused. Open a site folder, select a worker by portrait or
the **Worker** list, then inspect a person, object or facility. Inspection never
issues work or changes the command recipient. **Choose floor destination** lets
you select the floor beneath objects; map keyboard focus supports arrows and
Enter. Selecting a destination also does not issue an order.

Orders append to the visible action queue. Current and pending work show their
actual target, elapsed/productive ticks and blockers. **Cancel** removes that
intention, not spent supplies or existing physical ownership. **Finish current
commitments** advances complete world ticks until the captured work finishes,
blocks or raises an alarm. It is not a planner or a promise of success.

**Run**, **Pause**, **Step** and speed are global. Every retained site and transfer
continues while another site is inspected. New warnings, escapes, breaches and
deaths stop running/finish after the complete tick. The persistent notice offers
**Locate incident** and **Open response desk**. Acknowledgement does not fix an
incident; deliberate resumption is allowed.

The two modeless windows can be dragged and resized for comparisons. Operations
groups **Travel**, **Work & duties**, **Response desk**, **Research records** and
**Alarm history**, rather than creating an application for every anomaly.
The contextual inspector separates **Record**, **Orders**, **Care & cargo** /
**Cargo & gear**, **Response** and **Apparatus**, keeping the worker and visible
queue outside those sections. **All details** is an optional expanded view.
The **SCP > Facilities** folder lists every actual site. The desktop supports
a minimum 760-by-620 workspace; smaller browser viewports scroll that workspace
rather than hiding controls.

## Connected management

- **Prepare and travel:** choose actual staff/passengers, inspect readiness and
  carried equipment, assemble at the loading area, then review and depart with
  the real manifest. Routes are reusable without a lifetime ticket budget.
  Blocked arrivals remain in transit with their injuries, custody and cargo.
- **Recover and study:** retrieve Blackwood's journal and specimen, return and
  physically deliver them beside the comparison bench, then study with the
  independent sources. The earned finding opens Kestrel; the reusable field kit
  enables its survey. Nothing restocks because you change maps.
- **Care and logistics:** collect portions, hand over cargo, pack fragile objects
  in a real case, fit/repair/refill equipment, escort walking people or carry
  casualties. Stabilization, blood/postoperative care, wound care and ordinary
  home admission are distinct work with actual supplies and persistent records.
- **Contain and engineer:** capture a living subject into supplied holding, study
  it and spend physical parts on a slower-wearing restraint for awake care.
  Alternatively, actively record an actual impact, recover the device and
  analyze its evidence to enable protective equipment. Evidence can outlive the
  observer. Research does not erase casualties, injuries or spent resources.
- **Maintain coverage:** recurring service and direct-watch assignments use
  actual workers, supplies and rest. Guarded relief requires overlapping active
  observation. Finite lockdown and the two pre-existing reserve responders are
  fallback responses, not permanent safety or generated replacements.

## Existing SCP adaptations

These are bounded adaptations, not complete source-article simulations. Source
descriptions, attribution and adaptation limits are available in entity records;
earned findings remain separate from reference material. No article photographs
or sculpture/movie images are imported.

| Adaptation | Connected browser story                                                              |
| ---------- | ------------------------------------------------------------------------------------ |
| SCP-1867   | Physical collection, independent corroboration and Kestrel follow-up                 |
| SCP-1370   | Intact exhibit recovery, display observation and closed-door withdrawal              |
| SCP-507    | Cooperative return, separately protected log, review and admission                   |
| SCP-2295   | Independent organ work on returned patients, followed by ordinary postoperative care |
| SCP-3008   | Retained day/night sector, walking/carry evacuation and home treatment               |
| SCP-294    | Explicit real liquid sources, paid samples, comparison and a recorded refusal        |
| SCP-914    | Actual input, independent irreversible machine cycle, output recovery and fitting    |
| SCP-1295   | Supplied remote counter, recurring service and worker relief                         |
| SCP-2006   | Personally trained hosts and distinct physical programmes                            |
| SCP-173    | Three-person supervised work, direct watch, guarded relief and safe withdrawal       |
| SCP-131    | Actual supervised passenger visits supporting, not replacing, the human protocol     |

The [campaign guide](src/simulation/catalog/campaign/README.md) describes the
rules and normal CLI equivalents in more detail. Test-only walkthroughs are
never imported or executed by gameplay.

## Saves and desktop preferences

Use the **SCP** menu to Save, Load, Export or Import. Save is explicit. Browser
game state uses `simfoundation.web.session.v1`; window geometry uses
`simfoundation.web.desktop.v1`. Neither reads legacy saves.

Export/Import share the CLI's current-version session JSON. Development saves
are disposable: invalid or incompatible versions produce an explicit error,
not a migration or silent overwrite. Loading is paused. Layout and playback
preferences are not simulation state.
Successful replacement clears session-bound alarms and selections, while keeping
the desktop arrangement. Failed imports leave the current session and its
incidents intact. Window positions and stacking are retained separately.

## Development

Use the Node version in `.nvmrc` (at least 22.12):

```sh
cd src_web
nvm use
npm install
npm run dev
```

`npm run check` runs formatting, type checking, the retained headless/legacy
suite and a production build. `npm run test:browser` uses Playwright with an
installed Google Chrome to exercise real normal-input gameplay. Set
`WEB_BASE_URL=https://hanclinto.github.io/SimFoundation/` to exercise Pages
instead of starting Vite. Browser artifacts stay under ignored `test-results/`.

The existing Pages workflow publishes successful `main` builds using Vite's
`/SimFoundation/` base. `version.json` identifies the actual deployed commit.
There is no application backend.

## Ownership and current limits

`adapters/browser` contains desktop/map mechanics and cohesive contextual views.
It calls shared application operations; it never parses CLI output.
`simulation/core` owns generic mechanics and `simulation/catalog` owns named
definitions. The previous adapter and bindings live in `browser_legacy` and
`application/legacy`, using `simulation_legacy`. Only attributed presentation
assets and deployment checks are shared with the archived adapter.

The current wrapper deliberately exposes inspectable state. Camera/clinical fog,
a general backpack system, automatic perfect staffing rotas, a full economy,
expanded construction/utilities and additional SCPs are not implemented by this
rebuild. Map artwork is still restrained, category-based original art. Scripted
browser success establishes connected access, not subjective fun or final balance.

See [architecture](docs/architecture.md), the [look book](docs/lookbook.md),
[replacement engine guide](src/simulation/README.md) and [web rebuild tracking
issue #106](https://github.com/HanClinto/SimFoundation/issues/106).
[Archived prototype notes](docs/legacy-browser-notes.md) preserve the former
product specification; their features and save schemas are not current promises.
