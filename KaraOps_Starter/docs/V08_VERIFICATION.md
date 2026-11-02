# KaraOps v0.8 — Elite Breach Orrery

Verification date: 2026-11-02 (Europe/Bucharest).

## Delivered behavior

The existing KaraOps_Starter application now has an Orrery Solver navigation entry and overview card, with Elite Breach, Abyss Dungeon and manual calibration modes. The staged Abyss solver in `files/` and the sibling `KaraOps_Starter_Orrery_v08` were inspected and left unchanged. Their deterministic algorithm is reused through the same triangular-gearing solution, backed by pinned authoritative DFO pure functions. The staged CDP observer is deliberately not integrated: this request excludes debugging-port extraction.

- Decimal uint32 breach seed (including zero), Hall 1–10000, automatic circle/slot, and current-source hall-kind/twist verification. Non-Athenaeum halls produce an explicit diagnostic, rather than a fictional puzzle. Hall 10000 is an application resource bound, not a claimed game depth limit.
- Exact six initial hours, targets, gearing and shortest signed handle counts. Each instruction names Daggerfall, Sentinel, Wayrest, Orsinium, the Underking or the Blades. Right/forward and left/backward are relative to facing that stone.
- Fresh-puzzle generation enters a compact run view showing all six current/target pairs, hall/circle, remaining turns, fray and next instruction. “Edit setup and clocks” returns to editable observations.
- Individual manual press confirmations advance all six geared hours and recompute remaining instructions. No press, movement or other action is sent to the game. Confirmations are user assertions, not observed game state.
- Enter all current hours and used fray for a partially completed puzzle, then recalculate in one click. Edits invalidate the old route until recalculated.
- Manual calibration without a seed: capture six hours before a named forward turn, make that turn in-game, enter the resulting six hours and record its gearing row. Repeat for all six handles, enter the targets from the plaques, then solve. These measurements consume fray; no free/reset turn is assumed. Cyclic/non-source-compatible or invalid measurements produce a diagnostic, never a claim of impossibility.
- Source-derived normal/Fraying I/Fraying II budgets for Elite, and source-derived 48/36 budget for Abyss omens. A route exceeding remaining fray is flagged and its progress button disabled. Concord exactly at the fray limit is accepted, matching the relay's check order.
- A separate `karaops.orrery.v08` Electron-profile localStorage entry retains manual inputs/calibration across reload. It does not change folder-settings or Hunter schemas. Saved observations/calibration apply only to the puzzle the user measured; remeasure for a different manual puzzle. A fresh generator reset is a local reset and must only be used after an untouched puzzle or confirmed in-game snap.

## Source audit and provenance

Read current official repository files on 2026-11-02, in addition to the selected read-only DFO working tree. Exact upstream Git blob SHAs are recorded in [ORRERY_SOURCE_BLOBS.json](ORRERY_SOURCE_BLOBS.json). This avoids conflating the current online reference with the older Hunter population fingerprint.

Authoritative formula confirmed in both `src/systems/eliteGates/spireOrrery.js` and the relay's Athenaeum branch in `src/net/eliteGates/egBrain.js`:

```js
orreryOf((egSeed(seed, 0x0a7e + spec.h) % 2147483646) + 1,
         egOrreryTurns(spec.c))
```

`spec.c = Math.ceil(hall / 5)`. The relay additionally supplies `egFrayOf(circle, rank)` for the Fraying decree; this changes the snap limit, not the random draw. `egOrreryTurns` grows from 16–28 to 24–36, capped from Circle 21 onward. The former deep-circle generation hang is avoided by using this capped authoritative implementation. Current `EG_SPEC` is 10. Circle-plan history, variants and Scriptorium substitutions are preserved by the actual pure planner, rather than assuming every third hall is an Orrery.

`src/scenes/eliteGates/egOrrery.js` confirms facing-relative handles and live display hours from the game integration. `sdBrain.js` confirms 700 ms settling, Concord-before-snap and unit-triangular gearing. A unit-triangular matrix has determinant 1 modulo 12: handle residues are unique, and summing each residue's shortest signed representative gives the global minimum press count. This does not optimize walking time between stones or model a remote player's simultaneous actions/refused clicks.

`scripts/prepare-orrery-reference.mjs` verifies input Git blob hashes and extracts only pure declarations into `src/renderer/src/orrery/source.ts`. No runtime checkout, network, Node or Git is needed by the Orrery. DFO's MIT license is already distributed at `resources/hunter/DFO-LICENSE.txt`. No game art or ARENA2 bytes were added. The reference input files are private, ignored test evidence under `release/verification/v08/oracle/`; reproducing extraction/source-oracle tests requires restoring the exact official file blobs listed in the manifest. Ordinary unit tests and the built application do not require that oracle directory.

## Live integration investigation

The existing v0.7 opt-in receiver accepts only schema-1 identity, player pose, projection and viewport fields. `liveProtocol.ts` allowlists these fields and strips extras. There is no supported puzzle publisher carrying a breach seed, hall, clock hours or fray in this checkout/integration. DFO's internal `F.pg.st` / `objs.orr` are implementation state, not a supported external read-only telemetry interface.

Accordingly, this release uses manual entry. No automatic live detection is claimed. No receiver schema changes, game-side deployment, debugging-port connection, packet inspection, memory access or gameplay automation were performed. A future supported integration must explicitly publish puzzle identity/source version, seed/hall, accepted clock state and fray, with opt-in authentication/freshness. That needs developer integration and actual game-runtime validation before being labeled live.

## Verification results

**115 automated tests passed, zero failures/skips:**

- `npm.cmd test`: 59 unit/contract tests (52 retained, 7 new Orrery tests).
- Full retained real-source/ARENA2 suite: 53 tests, approximately 110 seconds.
- `npm.cmd run test:orrery:local`: 3 additional independent source/oracle tests. 57 seed/hall/rank cases, 30 at Hall 100+. Sources include untouched official `orreryOf` / `orreryStep`, full local `spireOrreryOf`, `egCirclePlan`, `egOrreryTurns` and `egFrayOf`. Every source replay reaches Concord without a snap.
- Unit coverage includes all 216 Abyss omen slots, extreme uint32 seeds, Circle 56+, partial states, six-row measured calibration, corrupt/unsupported calibration, forward/backward turns, solved states, rejected hall identities and exact fray-boundary order. A coupled two-clock subproblem is exhaustively enumerated independently to verify shortest press counts.
- Staged Abyss regression preserves initial hours, targets, gearing and counts for slots including 123 and `Number.MAX_SAFE_INTEGER`.
- `npm.cmd run typecheck` passed as part of portable build. Portable-only Windows x64 packaging passed.

Packaged application UI tests (`node tests/orrery-electron.mjs`) passed Elite Hall 8, Hall 103/Circle 21 Fraying II, Abyss, partial-state recalculation, refusal of an over-budget plan, six real calibration-form measurements, individual press tracking to Concord, navigation-away retention and profile reload. The test drives KaraOps' own isolated packaged application; it never connects to DFO. Sandbox/context isolation remain enabled, Node integration disabled, no renderer network requests/errors, copied folder settings byte-identical. Private screenshots and results: `release/verification/v08/ui/`.

Native Windows UI Automation passed against the actual final portable EXE in an isolated folder, with Node/npm absent from its child PATH and no debugging port. Elite seed 123/Hall 8 reached Concord after 16 individually confirmed presses, and Abyss slot 123 retained its identity after a turn. A second, relocated identical EXE passed the retained large-dungeon search/map/navigation check at (785,100), including map retention through cancellation/retry. Copied folder settings stayed byte-identical; TCP snapshots had no external connections/listeners. Private evidence: `release/verification/v08/native/native-orrery.json` and `relocated-native/native-hunter.jsonl`.

These application/source checks are not a claim of actual in-game puzzle execution, accepted turn timing, supported live telemetry or server-state observation. Two initial UI harness failures were selector issues (an icon in the navigation name, and a split accessibility version label), corrected before final successful checks.

Commands:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:orrery:local
node --test tests/hunter-local.mjs tests/geometry-local.mjs tests/navigation-local.mjs tests/world-local.mjs tests/world-host-local.mjs tests/jackpot-local.mjs tests/navigation-v07-local.mjs
npm.cmd run portable
node tests/orrery-electron.mjs
# Always use an isolated EXE/data copy for desktop checks:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/native-orrery.ps1 -ExecutablePath <isolated-exe>
```

## Release artifact and protected data

Portable path: `C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.8.0-Portable.exe`.

- Size: **110,780,901 bytes**.
- SHA-256: **`8C62A9BEA2153153342DD98895AD60E381CB62530437CF4A7FD8354D9B4FA0BB`**.
- Implementation commit: `bce1ea3456` (full SHA in the private build record).
- Windows x64 Electron payload; portable target only. No installer, external Node or source checkout required for Orrery solving. The normal portable launcher has a PE32 header around the x64 application payload. The EXE is unsigned (no signing certificate configured).
- All **12 protected artifacts/data files** (frozen v0.6/v0.7 EXEs plus ten original settings/history/notes/capture JSON files) are byte-identical before/after. Desktop tests used isolated data copies. DFO `src/` and `vendor/` have no working-tree changes; original ARENA2 was only read by the retained regression suite.
- Private final build record: `release/verification/v08/build.json`. Release binaries, profiles and test evidence are Git-ignored; preserve them separately from source commits.

## Remaining limitations

- Manual inputs/confirmations must match the actual current puzzle and fray. Simultaneous players, refused clicks, resets and stale calibration require re-reading/recalculation.
- Pinned current-source law; changed server/client source or custom rules require a source update or measured calibration. Seed/hall alone cannot establish a live game's source identity.
- Manual targets must be read from the plaques; automatic riddle/OCR recognition is not implemented.
- No live puzzle detection or automatic puzzle interaction. No in-game runtime trial was performed in this session.
- Prior Hunter, navigation, live-bridge and Aurum limitations remain as documented in V07_VERIFICATION.md. Exhaustive world scanning remains deferred.
