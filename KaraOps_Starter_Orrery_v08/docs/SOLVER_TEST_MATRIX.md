# Dungeon X-Ray & Solver — Acceptance tests

## Static reconstruction parity

- [ ] Build 2D floor plan from real user-owned ARENA2 files for at least 3 actual dungeons, including a multi-level dungeon. Compare bounding geometry, floor counts and entrance to DFO's actual in-game automap.
- [ ] Confirm world -> dungeon -> block -> mesh transforms and coordinate orientation; validate enemy marker positions and labels against game-generated markers.
- [ ] Preserve online-sized / curated / procedural variant; reject mismatched version or mod profile rather than drawing the wrong layout confidently.
- [ ] Display actual 2D map under Electron packaged EXE with pan, zoom, floors and data-derived markers; no synthetic data in production UI.
- [ ] 3D view uses actual geometry and has a measured resource ceiling; correct cutaway, stairs and stacked floors, no invented visual geometry.

## Secrets, actions, route logic

- [ ] Secret mover found by chain-only trigger semantics; direct-interactable wall NOT mislabeled secret.
- [ ] Reverse chain correct across relays and repeated RDB block instances; no collision between duplicated block-local positions.
- [ ] Click lever -> unlock/open/move secret wall -> new route: route before action blocked, after action open, walkthrough lists lever before passage.
- [ ] Door locked by current assumptions: route states exact key/skill/spell condition; unknown abilities never automatically ruled out.
- [ ] One-way floor drop cannot be used for reverse return route.
- [ ] Teleporter cycles terminate; directed teleport exits correct; unknown destination yields `unknown` not a fake edge.
- [ ] Moving wall, lift and pressure plate cause distinct state updates; delays/timing either modeled explicitly or flagged uncertain.
- [ ] Multiple target Dragonling packs on different floors: shortest validated route for single goal and sensible multi-goal covering route with step explanations.
- [ ] Only locally traversable geometry connects walkable cells; no through-wall, different-height same-XZ, closed-door or unsupported water shortcuts.

## Outcome classification / failure proofs

- [ ] One reachable target -> `reachable` with validated path.
- [ ] Target requires proven switch -> `reachable_with_conditions` and explicit switch instructions.
- [ ] Three packs, two reachable, one **proven** disconnected -> `partially_reachable` with `2/3` and reason.
- [ ] Completely disconnected target component and complete action graph -> `proven_unreachable` with blocking frontier witness.
- [ ] Timeout/state cap -> `unknown`, never `proven_unreachable`.
- [ ] Unmodeled custom script, door state, teleporter or missing geometry -> `unknown` with reason.
- [ ] Corrupt BSA/parser/source mismatch -> `analysis_error`, never `Not Possible`.
- [ ] Unknown current dungeon lifetime/clear state -> no `Live` guarantee; still show fresh-layout prediction separately.
- [ ] Manual observations are localized to matching dungeon/version; stale observations invalidate or warn.

## Packaged quality

- [ ] Front end stays responsive during heavy geometry/path solving; scan and solver cancellation always stop and free resources.
- [ ] `npm test`, `npm run typecheck`, `npm run portable`; portable EXE launches with no `node` on PATH, no installer, and preserves `KaraOpsData` beside moved EXE.
- [ ] Existing v0.1 navigation/settings and any already-validated v0.2 Hunter features still pass regression checks.
- [ ] No copied copyrighted BSA data in repo, logs, caches shipped with EXE or generated QA artifacts.
- [ ] Test report explicitly lists samples, pass counts, validation limitations, real game mismatches, action semantics not yet modeled and status of each module.
