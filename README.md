# SimFoundation

SimFoundation is a repository for simulation games set in and around the SCP
Foundation universe. The current focus is **SCPSiteManager**, a persistent
management campaign about physical expeditions, care, containment and research
that enables useful equipment, including learning from costly incidents.

## Projects

### SCPSiteManager

Location: [`src_web/`](src_web/)

SCPSiteManager is the active project. Its fresh 98.css operational desktop wraps
the same deterministic simulation as its CLI. People, cargo, injuries, evidence
and consequences persist across retained sites and reusable travel.

- [Product and game design](src_web/README.md)
- [Technical architecture](src_web/docs/architecture.md)
- [Tiered roadmap](src_web/docs/roadmap.md)
- [GitHub issue backlog](https://github.com/HanClinto/SimFoundation/issues)

Play at [hanclinto.github.io/SimFoundation](https://hanclinto.github.io/SimFoundation/).
The browser connects preparation, recovery, home study, physical crafting,
medical care, live custody, apparatus cycles and remote duties across eleven
existing bounded SCP adaptations. See the game guide for current limits and
the distinction between reference material and earned findings.

### Legacy Godot Prototype

Location: [`src_dotnet/`](src_dotnet/)

The original Godot 4/C# prototype demonstrates multiple selectable actors and A\* pathfinding. It is retained as a reference implementation and source of early design experiments; new SCPSiteManager systems should not depend on Godot runtime code.

- [Prototype notes and demo](src_dotnet/README.md)

## Shared and Extractable Work

Reusable isometric SVG templates and composition metadata will begin under [`packages/open-iso-gfx/`](packages/open-iso-gfx/) with no dependency on SCP-specific game content. The working package name is **OpenIsoGfx**. Keeping it self-contained allows it to be extracted into an independent public-domain project later without rewriting SCPSiteManager.

Existing prototype sprites and downloaded reference material are not automatically part of OpenIsoGfx. Only original work with explicit compatible provenance may enter that package.

## Repository Direction

The intended dependency direction for SCPSiteManager is:

```text
browser adapter -> application controller -> headless simulation
```

The simulation owns gameplay and deterministic time. The browser owns spatial
rendering, 98.css windows, input, persistence and wall-clock scheduling. The
old browser is isolated as `browser_legacy`, not coupled to the replacement
through compatibility facades. See the architecture document for the contract.

## Licensing

The repository currently retains its historical MIT license while the project-wide SCP attribution and CC BY-SA structure is prepared. SCPSiteManager uses the SCP Foundation setting and its public release must comply with the SCP community's licensing requirements.

OpenIsoGfx is intended to contain only original assets and metadata that can be released separately under CC0. Until its dedicated license and provenance manifest are committed, treat that package as pre-release work rather than a public-domain distribution.

Do not copy third-party or ambiguously licensed prototype assets into new runtime or reusable packages.
