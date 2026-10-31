KARAOPS ULTIMATE DUNGEON HUNTER — CODEX HANDOFF

This ZIP contains INSTRUCTIONS and ACCEPTANCE TESTS, not a new application or game assets.

1. Keep your working KaraOps VS Code / Codex project open. Do not overwrite it with an older skeleton ZIP.
2. Extract this ZIP INSIDE the root of your working KaraOps project, so CODEX_START_HERE.md and docs/ are present.
3. Make sure KaraOps Settings points to your real local Daggerfall Online SOURCE checkout and your user-owned ARENA2 folder.
4. Open Codex in the KaraOps project root, select appropriate multi-step coding mode, and paste the prompt below.
5. Have Codex verify Stage 1 as a working vertical slice before building its advanced solver. Avoid accepting fake data or fake 'Not Possible' results.
6. Verify the resulting release\\KaraOps-<version>-Portable.exe on your own Windows machine.

CODEX PROMPT:

"Read CODEX_START_HERE.md and ALL four docs: docs/HUNTER_MASTER_SPEC.md, docs/HUNTER_VALIDATION.md, docs/DUNGEON_XRAY_SOLVER.md and docs/SOLVER_TEST_MATRIX.md. You're inside my current validated KaraOps project; preserve it. Implement the Hunter as a true deterministic game-data scanner and enemy predictor, then build accurate 2D dungeon reconstruction, secrets/action graph, feasible state-aware walkthroughs and honest reachability proofs with tests. Build a portable EXE only, never an installer. Do not stop at a plan, do not fabricate outputs, and mark unfinished modules clearly. Audit real local source/ARENA2 first. Prioritize a working Dragonling end-to-end vertical slice, report each milestone's actual test results and final EXE path. No game-client mods or network manipulation."

DFO source reference: https://github.com/Lattymoy/daggerfall-js-source
