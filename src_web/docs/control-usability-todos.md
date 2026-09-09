# Control Usability Follow-Ups

Tracking: [interaction overhaul #23](https://github.com/HanClinto/SimFoundation/issues/23).
Status: implementation in progress. Check items only after their scoped checks pass.

## 1. Consistent Personal Order Submission

- [ ] Remove ordinary inspector paths that silently clear a person's pending queue.
- Base Tactical Response personal-order paths have been removed; expedition personal/recovery controls remain open work.
- Route personal commands through the map's Add to Queue / Do Now policy, rather than changing low-level legacy controller semantics indiscriminately.
- Keep explicit draft/release and mission lifecycle ownership transitions separate from personal intentions.
- Acceptance: opening an inspector or handing control to a map leaves queue, routine, cargo, draft status and supplies unchanged. Do Now preserves pending entries; Add to Queue waits for the current owner. Protected cargo, clinical work and mission phases still reject unsafe interruption.
- Validation: controller/queue tests, inspector-to-map integration, base and field handoff, saved-state equality before any actual command.
- Depends on item 2. Legacy APIs may remain for compatibility/tests, but ordinary UI must not invoke them as hidden replace-all commands.

## 2. One Personal Command Surface

- [x] Tactical Response: replace Move/Hold/Retreat/Engage/Stabilize and separate patient chooser with Control on Map for the selected responder.
- [ ] Expedition Operations: replace duplicate Field Orders and per-person Recovery commands with map handoff; retain assembly, loadouts, dispatch, recall, mission status and recovery reporting.
- Handing off opens the correct map, selects the subject idempotently, centers on its displayed position, preserves the Follow checkbox, and focuses the canvas. It must not create work or enter placement.
- Keep Draft/Release in Tactical Response as deliberate duty transitions; derive their eligibility from real previews (item 5).
- Remove hard-coded tactical movement origins and ambiguous Extraction point-as-movement UI along with those obsolete command paths.
- Acceptance: map exposes actual target verbs including Attack versus Engage From Here; no duplicate generic Engage or personal Move/Confirm workflow remains in these inspectors. Recorded handoff remains inspection-only; field handoff verifies mission/map identity and presence.
- Validation: tactical and expedition view tests, map handoff tests, desktop/narrow-window browser workflow.
- Base checkpoint verified: repeated handoff preserves queued work and supplies; map selection centers the subject without drafting, issuing orders or entering placement. Recorded retains Locate; Control is disabled there. World handoff refuses an active placement or a Recorded map with a specific reason. Browser confirmed Lena selection, canvas focus, unchanged saved state and 350px layout without overflow. No sandbox capability removed yet.

## 3. Clear Command Mode and Inspector Names

- [ ] Replace the closed toolbar label Orders with a compact visible Queue / Do Now mode control using the existing menu/radio pattern or segmented control.
- [ ] Rename the selected-person Orders inspector link to Tactical or Response; ensure base/field routing still reaches the appropriate inspector.
- Acceptance: the active submission policy is visible without opening a menu; keyboard semantics and per-map independence remain; no two unrelated controls are both labelled Orders.
- Validation: menu mode persistence, keyboard selection, base/field independence, narrow toolbar layout.

## 4. Consistent Object Location and Inspection

- [ ] Rename Focus personnel to Find Object (it includes people, furniture, supplies and utilities).
- [ ] Define locator behavior explicitly: choosing an entry locates/inspects the target without silently changing the command subject. With Follow enabled, retarget the camera to the located entry rather than snapping back to the previous one.
- [ ] Remove or consolidate the redundant Open Record toolbar button while retaining keyboard and empty-selection inspection affordances.
- Acceptance: portrait selection remains subject selection; object lookup remains target selection. Both locate predictably, use observed coordinates in Recorded view, and handle absent/off-map entries without invented positions. Name links retain inspection access.
- Validation: pointer/keyboard locator, Follow on/off, Recorded, selected target independent of subject, no queue mutation, small toolbar.

## 5. Truthful Availability and Reasons

- [ ] Remaining inspector actions derive enabled state and explanations from the same preview/validation as execution.
- Audit Draft/Release, mission assemble/dispatch/recall, and retained recovery/lifecycle controls after duplicate personal actions are removed.
- Disabled actions expose a specific tooltip/reason rather than an unrelated generic busy explanation. Recheck on execution to handle stale state.
- Acceptance: preview is immutable; enabled/disabled agrees with execution for tested snapshots; cargo, clinical, incapacitation, team ownership and map availability have meaningful reasons. Recorded exposes no live-only state.
- Validation: table-driven preview/execution cases and UI tests for disabled reasons; avoid broad controller refactoring without a failing contract.

## 6. Separate Sandbox Creation From Operations

- [ ] Move Place 049-2 and encounter creation controls out of Tactical Response into an explicitly named Sandbox surface using existing sandbox conventions.
- Retain threat observations/condition and relevant locate/inspection in operational windows. No new encounter mechanics or default scenario spawning.
- Acceptance: ordinary staff operations do not create test threats; sandbox access remains discoverable, explicitly administrative, and uses existing placement/validation. No loss of the current authoring capability.
- Validation: sandbox placement and rejection, tactical absence of spawn controls, Recorded restrictions, no accidental encounter creation on navigation.

## Delivery Boundaries

- Preserve 98.css, shared map subject/target semantics, queue ownership, deterministic simulation and save compatibility.
- Do not merge construction/object-hauling work into pawn intentions or remove their Confirm/Cancel placement controls.
- Publish isolated validated checkpoints and update this ledger plus #23 with completed scope and remaining work.
- Request review only for a concrete product decision that cannot be resolved from these rules. First published checkpoint: tactical handoff before the larger expedition/sandbox migration; no blocking product question identified.
