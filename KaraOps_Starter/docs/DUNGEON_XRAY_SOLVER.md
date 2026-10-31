# Dungeon X-Ray and Intelligent Walkthrough Solver — Technical Design

This ADDENDUM complements `HUNTER_MASTER_SPEC.md`; it adds geometry, puzzles, secret mechanisms and formal feasibility semantics. It is NOT evidence that all mechanics are solved or that a generated dungeon is currently alive.

## Source-grounded entry points (confirm against the user's LOCAL checkout)

- `src/world/dungeon/dungeonLayout.js` — assembled dungeon blocks, coordinates, water levels, entrance/exit markers.
- `src/world/rdbLayout.js` — per-block geometry, static/action doors, action objects and chain data, enemies/treasure markers.
- `src/world/actionSystem.js` — action runtime, `nextOf`, `chainTargets`, trigger gating, special doors, movers and effects; **do not execute actions against the live game** to discover outcomes.
- `src/systems/dungeon/dungeonSense.js` — `isSecretMover`, `playerTriggers`, `senseSecrets`, chain-only secrets.
- `src/systems/dungeon/dungeonEcho.js` — `chainMovers`, effect descriptions, directional descriptions.
- `src/systems/automap/automapModel.js` and `automapFloors.js` — true mesh rows, storeys, floor footprints, stairs and coordinate transforms.
- `src/ui/automap/automapSheet.js`, `src/ui/ink/inkDungeonGL.js`, `src/ui/ink/inkDungeonSolid.js` — existing 2D/3D visual representation; prefer reuse/refactoring pure geometry logic over embedding entire client UI wholesale.
- `src/systems/wayOut.js` — known-trail routing precedent, collision/height constraints, and teleporter graph concept; it does not automatically solve an unknown dungeon.
- `src/scenes/dungeonContext.js` — authoritative composition of the actual dungeon view and action objects; check curated blocks, world data patches, online sizes, runtime state and disabled-door rules.

## Typed intermediate representation (IR)

Implement one serializable, versioned `DungeonAnalysisIR` emitted from the worker (not raw game engine objects):

- `identity`: world pixel, map ID, template ID, online size, source fingerprint, ARENA2 fingerprint, mod/setting profile.
- `structure`: placed RDB blocks, transformed geometry, model bounds, walkable polygons/cells, floors, stair transitions, entry/exit points, water/vertical traversal rules.
- `interactables`: keys, positions, kinds, `triggerFlag`, action verb/flag, `nextKey`, locks, known states, transitions, movement swept geometry and location in block coordinates.
- `targets`: mobile type, fixed/random origin, elite copy identity, world-local 3D spawn position, confidence and any runtime-dependent suppression.
- `graph`: immutable movement edge candidates + conditional door/teleporter/ladder/lever edges, all with evidence/collision provenance.
- `state`: doors, switches, moving walls, key/skill/spell assumptions, known vs unknown runtime state; separate simulation state from observed live state.
- `notes`: schema revision, warnings, unsupported mechanics, data mismatches, performance metrics.

Never embed proprietary BSA byte buffers in JSON, logs, caches or distributable artifacts. Only derived runtime structures necessary for the view, in user-local memory/cache.

## Core analytic passes

1. **Layout reconstruction**: reproduce `dungeonLocationFor` (online size & curated patches) + `layoutDungeon`; transform positions with the same orientation, block origins, model matrices and per-block scaling as DFO. Validate on named/sample known dungeons and compare entrance marker offsets, object positions and floor footprint.
2. **Traversable geometry**: derive walkable floors from genuine model triangles; build connectivity with collision/clearance, max step rise, ceiling height, water/air assumptions, one-way jumps and stair slopes. A floor with matching 2D XY/XZ overlap is NOT automatically connected; height and intervening obstacles matter.
3. **Actions and secrets**: instantiate an inert representation of action objects and resolved links; compute inverted dependencies (e.g. click lever A -> chain of relays -> moves special wall B). A `secret` must pass the game's genuine criteria (chain-target movable, no direct player trigger, at start) or be labeled `suspected` with a reason. Preserve no-trigger and special-door distinctions.
4. **Dynamic transitions**: model only action semantics inspected and tested from DFO: open/unlock/close/lock door, change mover state, teleporter entry & actual destination, pressure triggers, attacks, script/global variables where provable. Actions with unknown effects mark adjacent route decisions `unknown`, not passable or impossible.
5. **State-space search**: search `(position_cell_or_polygon, mechanism_state, inventory/ability_model)` with A*/Dijkstra/weighted multi-goal planning; cap states/time/memory and detect cycles. Precompute static connected components, then add conditional edges for state transitions; prune equivalent states. The solver should not fire actions on a DFO instance.
6. **Explanations**: for every step, show world-local coordinates, floor, triggering object, expected change, whether it is verified/predicted/conditional, why the action is necessary, and expected route segment. Link the result to a highlight on 2D/3D maps.
7. **Multi-target route**: for 2+ target packs, prioritize coverage and efficiency (travel length, switches, hazards, detours) and offer exit guidance. Approximate optimizers must say `heuristic route`, not `proven shortest`. Support partial success and skip disconnected targets.

## Formal outcome semantics

**At target level** (NOT just one status for whole dungeon):

- `reachable`: modeled current start state has a validated route whose edges and preconditions are fully accounted for.
- `reachable_with_conditions`: validated route exists only with explicit conditions (key, skill threshold, spell, switch sequence, one-time trap, etc.); show conditions individually.
- `proven_unreachable` (display `Not Possible`): exhaustive reachability proof across **complete** graph and complete applicable action/ability model, respecting declared assumptions. Include a machine-readable proof witness: start reachable component or explored state closure, blocking frontier, why each possible transition was excluded. Do not claim universal impossibility beyond stated rules.
- `unknown`: not proved possible or impossible due to unmodeled mechanic, missing/unknown live state, incomplete geometry, solver budget exhaustion, uncertain teleporter, disabled/missing asset, inability to verify traversal assumptions. Explain the exact reason.
- `analysis_error`: corrupt/mismatched assets, source incompatibility, parser exception or failed internal invariant; show diagnostic without leaking account data.

**At dungeon level**:

- `reachable` when all requested objectives are reachable in the same compatible plan.
- `partially_reachable` when at least one objective has a validated route and some do not; show exact numerator/denominator, plus per-target statuses. Distinguish a target `unknown` from `proven_unreachable`.
- `reachable_with_conditions` for all requested objectives but some condition is required.
- `proven_unreachable` only if **none of the requested objectives can be reached** AND a complete proof establishes all are unreachable under the complete explicit rules.
- `unknown` when objectives remain undecidable or reconstruction is incomplete and no stronger useful conclusion is sound.
- `analysis_error` on failed engine/data checks (not proof of impossibility).

**Important nuance:** A modeled lock without keys is `reachable_with_conditions` if key acquisition is an explicit obtainable step supported by evidence; otherwise either `proven_unreachable` under an explicitly constrained 'no lock bypass' model if completeness can be established, or `unknown`. Do not quietly assume the user's magic cannot bypass a door.

## UX and interaction contract

- On a selected result, tabs: **Overview**, **Interior 2D**, **Interior 3D**, **Secrets & mechanisms**, **Walkthrough**, **Evidence**.
- 2D first: per-floor map, pan/zoom, clickable markers, clickable door/wall/lever chain highlight and route overlay; works without WebGL.
- 3D optional until proven: rotatable cutaway using actual mesh, per-floor slices, clickable highlights, same route/marker data. The 3D canvas must show `not implemented` rather than a decorative illustration until validated.
- Walkthrough goal choices: `Fastest path to one pack`, `Collect all reachable packs`, `Secrets & treasure`, `Exit safely`.
- For each unreachable or unknown result, show a reason list and highlight a blocking frontier/object on the map if graph evidence exists. Provide `Try another dungeon` and source/data diagnostics.
- User manually records reality (`Saw 3 dragonlings`, `Door locked`, `Teleporter went here`). Store observations with timestamps and version fingerprints; avoid silently treating them as live universal truth.
- Feasibility results are influenced by character abilities/settings. Explicitly expose a profile (levitation, climbing, Open spell, lockpicking, underwater capability, etc.) and label unmodeled abilities as unknown, not disabled by assumption.

## Performance, boundaries and delivery

- Compute in a worker; budgets/cancel/progress per stage; retain responsive Electron renderer. Two-pass world scan then costly interior reconstruction only on selected / shortlisted candidates. Cache geometry by asset/version/layout; cache counts by level/mod; cache routes by state/abilities, invalidate selectively.
- No client modification, no gameplay control, no direct or forged server interactions. Portable EXE reads files the user selected; minimize exposed renderer IPC.
- Keep source reuse separate from shipping game code assets. Source may have runtime imports tied to browser game context: isolate pure functions in a backend-compatible adapter rather than importing scene hosts blindly into Electron main.
- Do not assign arbitrary success probability. For predicted enemies, label `Fresh layout expectation`; for live population, label `Not verified` unless user has direct legitimate observations.
