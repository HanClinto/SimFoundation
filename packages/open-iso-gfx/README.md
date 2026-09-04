# OpenIsoGfx

OpenIsoGfx is the working name for a reusable library of simple, layered isometric SVG characters, equipment, props, structures, and composition metadata. It begins inside SimFoundation so SCPSiteManager can exercise the format before the library is extracted into an independent project.

The name and public API are provisional.

## Boundary Rules

- This package has no dependency on SCPSiteManager, SCP lore, 98.css, or simulation code.
- Assets use generic concepts such as `worker`, `lab-coat`, `helmet`, and `storage-cabinet`; game-specific catalogs map those concepts to game entities.
- Source SVGs and metadata are authoritative. Generated previews and optimized SVGs are disposable build products.
- Every asset has explicit provenance and license status in `catalog.json`.
- Third-party reference material stays outside this package unless it is deliberately imported with compatible licensing and complete provenance.
- Consumers depend on stable asset IDs and attachment contracts, never internal file layout or arbitrary SVG element order.

## Intended Contents

```text
open-iso-gfx/
  README.md
  package.json
  catalog.json
  schemas/
    asset.schema.json
  src/
    characters/
    equipment/
    props/
    structures/
  previews/             optional and generated, not authoritative
```

Asset directories will be created with the first original templates rather than populated with placeholders.

## Character Composition

A humanoid is assembled from layers that share a view box, isometric origin, pose, direction, and named anchors. Initial layers are:

1. Ground shadow
2. Rear equipment
3. Base body with tintable skin regions
4. Lower-body clothing
5. Upper-body clothing
6. Footwear and gloves
7. Hair and facial features
8. Head equipment
9. Held items and front equipment
10. Status or interaction effects

The renderer may tint declared palette channels and compose layers, but it must not infer gameplay statistics from SVG content.

## Rigging and Animation

SVG is the only initial art format. It can technically embed bitmap images through `<image>`, but OpenIsoGfx does not need a bitmap pipeline or raster backend. Initial assets should use ordinary vector geometry so their parts, palette channels, and transforms remain inspectable and editable.

SVG does not provide a portable skeletal-animation standard by itself. OpenIsoGfx therefore divides responsibility deliberately:

- The catalog defines a rig's joint hierarchy, pivot coordinates, attachment anchors, supported directions, and poses.
- SVG files expose stable, semantic group IDs for body parts and equipment layers.
- The renderer selects pose/direction groups and may apply transforms to joint groups for visual interpolation.
- The simulation supplies semantic visual state such as direction, pose, and action progress; it never addresses SVG groups or animation frames.

Animation timelines do not live in SVG SMIL, CSS, or scripts. Keeping playback outside the asset makes pause, speed changes, testing, and Canvas composition predictable. The initial implementation may use a few authored pose groups such as `stand`, `walk-1`, `walk-2`, `work`, and `down`; a richer keyframe format can be added only when those poses prove insufficient.

Embedded bitmaps remain possible for a future asset that genuinely needs one, but they must be declared in provenance and cannot replace required semantic groups or anchors.

## Compatibility Contract

Each asset catalog entry declares:

- Stable ID and semantic version
- Asset kind and supported equipment slot
- Source SVG path
- Supported directions and poses
- View box and isometric origin
- Joint hierarchy, pivot points, and named attachment anchors
- Semantic SVG group tags used for composition and tinting
- Tint channels and draw layer
- Compatible rig ID
- Creator, source, license, and modification history

The machine-readable contract lives in `schemas/asset.schema.json`. SCPSiteManager may add stricter validation in its own content layer, but should not add game-specific fields to this package.

## Licensing Direction

The intended independent library is CC0-1.0 so other games can use it without inheriting SCP-specific licensing. During incubation the package remains marked `private` and its catalog rejects assets whose provenance is not explicit. Before public distribution:

1. Confirm every included contribution can be dedicated under CC0.
2. Add the complete CC0 legal text and contributor declaration.
3. Record attribution for reference works even when attribution is not legally required.
4. Remove `private` only after package validation and a clean provenance review.

SCPSiteManager can combine CC0 OpenIsoGfx assets with its separately licensed SCP-derived game content.

## Extraction Checklist

- No imports or paths reach outside this directory.
- Tests and build commands run from this directory.
- No SCP names, logos, uniforms, or setting-specific symbols appear in generic assets.
- Every catalog entry validates and resolves to a source file.
- Any generated previews or optimized SVGs can be recreated from committed source.
- License and contributor provenance are complete.
- SCPSiteManager consumes the package through its public catalog/loader boundary.
