# Contributing to SimFoundation

SimFoundation currently contains an active browser game, a legacy Godot prototype, and an incubating reusable graphics package. Keep changes within the ownership boundary of the feature being implemented.

## Start Here

1. Read the [SCPSiteManager product specification](src_web/README.md).
2. Read the [architecture contract](src_web/docs/architecture.md) before changing simulation boundaries.
3. Choose or create a GitHub issue with a scope tier, owner, dependencies, exclusions, and acceptance criteria.
4. Keep the first change small and validate the narrow behavior before expanding it.

## Project Boundaries

- `src_web/` owns SCPSiteManager game, application, and browser-specific code and content.
- `src_dotnet/` is the legacy Godot/C# prototype. Do not add dependencies from the web game to it.
- `packages/open-iso-gfx/` owns generic isometric SVG sources and composition metadata. It must not contain SCP-specific concepts or depend on game code.
- `src_web/resources/` is ignored local reference material. Do not build runtime dependencies on it.

SCPSiteManager follows this dependency direction:

```text
browser adapter -> application controller -> headless simulation
```

The simulation must remain importable in Node without DOM, Canvas, storage, timer, or network globals.

## Definition of Done for a Change

- Player-visible behavior and exclusions match the issue.
- Gameplay rules live in the simulation rather than a renderer or inspector.
- New authoritative state is serializable and versioned where necessary.
- Deterministic behavior has direct headless tests.
- Browser changes translate input into commands and render snapshots/events without mutating them.
- New assets include provenance and pass the relevant package contract.
- Documentation changes accompany new public commands, data formats, or architecture decisions.
- Focused tests, type checking, and formatting checks pass.

## Assets and Licensing

Do not copy files from local references into committed runtime directories without reviewing their source and license. Every committed asset needs an explicit creator, source, license, and modification history.

OpenIsoGfx is intended for an eventual CC0 release, but it remains private and unlicensed during incubation. Only contribute work that you have the right to dedicate under CC0. SCP-specific artwork and content belong to SCPSiteManager and follow its separate SCP/CC BY-SA licensing structure.

## Architecture Decisions

When a change alters a cross-category contract, add a short decision record under `src_web/docs/decisions/`. Record the context, decision, consequences, and alternatives considered. Do not use decision records for ordinary local implementation choices.

## Pull Requests

Keep pull requests scoped to one independently testable outcome. Include the commands used to validate the change and call out any deferred or untested behavior. Do not combine unrelated cleanup with feature work.