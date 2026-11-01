# CODEX MISSION — KaraOps Ultimate Dungeon Hunter

**READ FIRST:** `docs/HUNTER_MASTER_SPEC.md`, `docs/HUNTER_VALIDATION.md`, `docs/DUNGEON_XRAY_SOLVER.md`, and `docs/SOLVER_TEST_MATRIX.md`.

You are working inside the user's **EXISTING, already validated KaraOps Electron/React/TypeScript project**, NOT creating another starter project. Preserve working settings, architecture, and portable Windows x64 packaging. Do not replace the application with an earlier ZIP. Inspect the current `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`, tests, package scripts, and git status first.

## Mission

Build a **read-only, offline-first Elite Dungeon Hunter** that lets the user pick an enemy species (default Dragonling, mobileType 34), find real game-generated dungeon candidates, reconstruct the actual online dungeon's geometry and enemy markers from DFO's local source and user-owned ARENA2 data, and ultimately plan an explainable route through real mechanisms, including doors, hidden passages, action chains, switches, stairs and teleporters.

The product must distinguish **calculated fresh-layout predictions** from **observed live state**, show verifiable provenance, and NEVER invent a dungeon, monster count, secret door, route or success guarantee.

## Operating constraints

- **Windows portable EXE only**, built via existing `npm run portable`. No installer, updater, remote services, or requirement for separately installed Node at runtime.
- DFO source is a **read-only user-selected local checkout**, not a directory to edit; ARENA2 is user-supplied and never embedded in the EXE/repository.
- No game-client modifications, packet injection, forged network requests, account/session access, automatic play or server-side bypass. Do not wire the Dragon Radar into this phase.
- Keep renderer sandboxed with strict, typed, validated preload IPC. Heavy scans and dungeon geometry calculations must execute in a cancellable Node-capable backend/worker process; never block UI.
- Reuse the checked-out game's generation and layout algorithms wherever practical; respect their dependency boundaries. Include source/build fingerprints and active mod/settings assumptions.
- Always differentiate `reachable`, `reachable_with_conditions`, `partially_reachable`, `proven_unreachable`, `unknown`, and `analysis_error`. **Only claim 'Not Possible' after a complete proof under explicitly modeled rules**. Unmodeled puzzles, timeouts, unknown dynamic states and code/data errors yield `unknown` or `analysis_error`, NOT impossible.

## Execute in GATED stages (do not fake later stages)

**Stage 0 — Audit / interface contracts.** Inspect current KaraOps and checked-out DFO code, trace full live dungeon generation path and secret/action graph. Document exact source paths, models, gaps, coordinates, mod forks and how the portable EXE will load local DFO modules/asset files. Commit no asset files. Define typed schemas for candidate, geometry, enemy marker, action object, traversability edge, puzzle state, route steps, reason/proof and confidence.

**Stage 1 — Real Dungeon Hunter vertical slice (priority).** Implement deterministic two-pass world scanning, candidate validation, true online-layout generation and encounter simulation. Display genuine results in the existing KaraOps UI: species selector, elite filter, location inputs, progress/cancel, confidence, nearest town, coordinates and per-target counts. Add local parity tests and packaged EXE verification. If work cannot go further, finish THIS stage working instead of shipping broad mock features.

**Stage 2 — Actual Dungeon X-Ray.** From selected candidate, rebuild full geometry using the user's `BLOCKS.BSA` and `ARCH3D.BSA`. Expose all traversable storeys and dynamic object anchors. Implement **accurate floor-based 2D view first** (zoom/pan/layers), then rotatable 3D using existing DFO automap machinery only after 2D parity is validated. Overlay predicted enemies, doors, treasure markers, entrances, exits, teleporters and secret/moving walls. No fake interior drawings. Display geometry provenance.

**Stage 3 — Mechanism graph and feasibility.** Index DFO's action objects and chain links; identify chain-activated secret movers using equivalent `isSecretMover`, `playerTriggers`, `ActionSystem.nextOf/chainTargets`. Build a walkable graph constrained by real collisions, height and door states. Model confirmed action semantics and teleporter directions as state transitions, not flat shortcuts. Compute target reachability, partial reachability and proof reasons. Propagate uncertainty whenever state or a mechanic is incomplete.

**Stage 4 — Explainable walkthrough solver.** Add 'Route to target', 'All target packs', and 'Secrets/treasure' goals. Search the combined (position, switches, doors, inventory/ability assumptions) graph using explicit costs and caps. Produce map-highlighted steps with mechanism coordinates and directions, explain why each switch matters, show route alternatives and a safe return path when possible. Never claim a route valid without validating its edges against the game model.

**Stage 5 — QA and portable build.** Run unit/integration/property/parity tests, compare at least several sampled candidates against real user-owned DFO game data, test impossible/unknown/partial scenarios, measure scan and solver performance. Run `npm test`, `npm run typecheck`, `npm run portable`, then launch, relocate and retest the resulting EXE with valid/invalid folder settings. Report exact paths, test counts, measured timings, source fingerprints and any unimplemented features.

## Deliverables for EACH stage

- Actual implementation, not UI placeholders masquerading as completed features.
- Automated tests with failing-before/fixed-after behavior where appropriate.
- `docs/HUNTER_IMPLEMENTATION_AUDIT.md` and `docs/HUNTER_VERIFICATION_REPORT.md` updated with facts, omissions and concrete local evidence.
- Explicitly list what remains unimplemented and keep its controls disabled or labeled `Coming later`.
- Continue to the next stage when the previous one truly passes, within your available work budget. If you hit a real blocker, provide a minimal reproducible case and an honest partial delivery. Do not stop at planning alone.
