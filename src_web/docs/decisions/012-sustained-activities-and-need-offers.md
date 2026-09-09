# Sustained Activities And Need Offers

## Context

The user approved concrete Sleep/Relax examples before settling the need-action interface, noting that one action can help several needs and that useful work such as research can raise stress. A hunger class pointing to Eat would couple needs to actions; one exclusive needId on each action provider would also hide multi-need benefits.

## Decision

Keep needs responsible for urgency/progression and actions responsible for effects. All positive deficits compete descending by value then ID. Action providers offer an available action and its next productive tick's relief for the requested need. The highest-urgency satisfiable need wins; strongest relief breaks ties between actions, with registration order for equal relief. Positive costs are applied by execution, never advertised as relief. No weighted utility planner or preemption is introduced.

Add Facility as a physical entity with catalog-authored activities (duration and signed need changes). Sleep, Relax and Research share a shallow FacilityAction implementation because their approach/work/session mechanics are identical. Concrete research behavior increments local desk progress. The generic helper has no action-specific effect switch. Facilities and pawns remain in the same site entity collection.

Shared FindTarget now serves Eat and facility activities: nearest eligible reachable target by distance then ID. Facility offers derive multi-need reductions from activity data; Eat still derives nourishment from consumer/material compatibility. No need classes import actions, and core imports no named catalog entries.

## Activity Contract

Only productive ticks apply effects and increment saved workTicks; elapsed still includes walking/blocked time. Sessions have bounded catalog durations, not instant restoration. Normal physiology ticks first. Signed effects clamp existing needs without adding absent ones. Work can add stress/fatigue while producing progress and satisfying another need.

Facility occupancy is derived from a current activity with workTicks > 0. Travellers do not reserve it; first productive actor wins. Completion/cancellation releases it without a duplicate reservation store. Active blocked users retain their commitment. Used facilities cannot be picked up or transferred. Autonomy off preserves current sessions. Explicit cancellation does not undo past output or need changes. Saved sessions replay exactly; newly enqueued commands reset workTicks.

## Scope

Catalog Bed supports Sleep, Armchair supports Relax, and ResearchDesk supports study with local progress. Staff gain fatigue/stress; curiosity is optional. Research is a minimal example of productive but stressful activity, not a technology tree, specimen workflow, or quest economy. Social interaction, animations and browser binding remain absent. The authored RestAndResearch site is a headless integration fixture through the ordinary catalog loader.

Snapshot version 4 discards older development saves; parsing remains root/version/try-catch only. The simulation README records numeric tuning and limits. Tests cover actual hungry/no-food sleep, multi-need selection, occupied alternatives, cancellation, off-autonomy completion, lost/unreachable targets, research tradeoffs, transfer guards and reload continuation.
