# Authored Anomaly Catalog

Internal designations identify original game content and do not claim to be SCP Wiki entries. This catalog is developer knowledge, not an automatically unlocked player encyclopedia. Prefer proven authored scenarios before procedural combinations.

## AN-001: The Chalk Knot

Creator: SimFoundation project, authored with GitHub Copilot, 2026-09-05. Original fiction and mechanics; no source article. Project content and its original illustration are released under CC BY-SA 3.0, consistent with the SCP setting. Artwork: `src/adapters/browser/assets/an-001-chamber.svg`.

### Gameplay Question

Can the player inspect a spatially meaningful enclosure, distinguish floor and structural condition, and maintain compatible materials under ongoing local exposure?

### Actual Prototype Behavior

- Stationary source at (70, 58), inside a five-by-five enclosure spanning (68, 56) through (72, 60). Every installed floor and perimeter structure is an ordinary ceramic surface. The western door at (68, 58) starts sealed and can be operated from Engineering.
- The general exposure system applies a corrosion dose of 0.2 per minute to cardinally reachable surfaces within Manhattan radius 4. Intact walls and sealed doors receive contact but block propagation. A new opening exposes further surfaces on the next tick. Corner segments become exposed only when contact can reach them.
- Damage per surface is dose multiplied by `(10 - resistance) / 10`, rounded to hundredths. Concrete, steel, ceramic, and composite use the same catalog throughout the map. The shared API also supports impact, but AN-001 does not currently generate impact damage.
- Failed structures stop blocking movement and sight; their floor remains independent. Failed floor finishes expose soil. No primary/secondary integrity counters or special map coordinates control damage.
- Engineering orders replace a single installed layer, drawing from the common 160-unit construction stock. Collection, same-carrier delivery, and engineering fitting are physical jobs. Replacement does not repair neighboring tiles. Automatic maintenance uses current observed condition <=55, preserving the recorded material.
- Recorded structural failures raise the same Orange alert anywhere in the facility. Recorded low structural integrity raises Yellow when no higher incident owns the alarm. Repair clears only the structural alert, not unrelated incidents.
- The archive is now read-only. The earlier protocol authorization, protective-isolation checkbox, two-barrier allowance, and scripted Findings workflow were removed rather than carried into the generalized system.

### Deliberate Limitations

This is a bounded contact-field approximation, not fluid transport, accumulated contamination, structural loading, fire, or a moving specimen. Soil is the implicit base layer; installed finishes and structures hold material/condition. The source remains active while simulation time runs. Inspection, access, and replacement are the available management tools; a future isolation procedure must be represented physically, not as an instant archive button. General damage and repair APIs work on any installed tile, including completed annexes.
