# Current priority update ? 2026-10-31

The user superseded the exhaustive-scanning roadmap below. v0.7 now targets navigation reliability and a developer-authorized live companion. Exhaustive Tamriel scanning is deferred. Read docs/V07_VERIFICATION.md and integration/DFO_UPSTREAM_PROPOSAL.md first for the implemented navigation fix, opt-in receiver/SDK, actual verification and remaining producer/HUD/GPS blockers. Developer approval was reported by the user; no DFO source changes or game integration deployment were performed. Preserve the frozen v0.6 release described below.

---

# KaraOps v0.6.0 release checkpoint / v0.7 handoff

Checkpoint date: 2026-10-31, Europe/Bucharest.

## Frozen release identity

- Project: `C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter`.
- Git repository root is the **parent DFO checkout**, not a separate KaraOps repository.
- All v0.6 implementation changes are committed in **`a269f52b6336f5b1b1b29bad10c48f7589dfa4e2`** (`v6`). Its changes are confined to `KaraOps_Starter/`.
- The repository was clean before this documentation checkpoint. The separate commit adding this file changes documentation only; its SHA is reported in the checkpoint response. To resolve it later, run `git log -1 --format=%H -- docs/NEXT_SESSION_HANDOFF.md` from the project directory.
- Portable EXE: `C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.6.0-Portable.exe`.
- Size: **110,763,954 bytes**.
- SHA-256: **`F6A5A9C4C7828F8BD6B82CE03809DB73083D7C1C470EA542605586BC1D912D64`**. Rechecked at this checkpoint; unchanged.
- The EXE, `release/`, runtime data and private test evidence are Git-ignored. Preserve them separately; checking out the implementation commit does not restore the binary or user data.
- Windows x64 Electron payload, electron-builder portable target only. The standard self-extracting launcher has a 32-bit PE header; the application payload is x64. No installer, external Node/npm/Git runtime, updater or live-game integration.

This checkpoint does not rebuild, refactor or change application functionality. Existing verification results below are the recorded release results, not tests rerun for this documentation checkpoint.

## Read first next session

Read `CODEX_START_HERE.md`, `README.md`, `docs/V06_VERIFICATION.md`, `docs/HUNTER_IMPLEMENTATION_AUDIT.md`, and `docs/HUNTER_VERIFICATION_REPORT.md`. Consult the Hunter master specification, validation and solver documents for preserved geometry/navigation assumptions. Historical report sections describe older commits and binaries; this handoff records the committed v0.6 release.

DFO source and original ARENA2 remain **read-only**. Do not fetch, switch, merge or modify the parent game checkout as an incidental implementation step. Audit any user-provided source update explicitly and keep prediction provenance separate from reference revisions. No game connection, memory reading, packet interception, remote debugging bridge, account/session access, claim automation or gameplay automation.

## Architecture and persistence

- `src/main/index.ts`: Electron lifecycle, portable data directory, sender-validated IPC, native exports and local settings. Packaged renderer network requests are denied.
- `src/preload/index.ts` and `src/shared/*Types.ts`: narrow typed bridge; sandboxed React renderer has no direct Node access.
- `src/main/hunter/service.ts`: exclusive cancellable worker orchestration, request validation, settings/history integration and coffer approval redaction. Existing worker limits: 1536 MB old generation and a 360-second watchdog.
- `worker.mjs`: offline jobs for discovery, geometry, navigation, captures, ranking, cache migration and selected coffer analysis. Source-free reranking reads saved captures without rerunning discovery.
- `engine.mjs` / `world.mjs`: source imports, fingerprints, original ARENA2 parsers, source-derived Tamriel geography/roads/gates, deterministic layouts and encounter populations. Searches remain bounded circles with radius at most 50.
- `geometry.mjs`: source-derived floors, walls, doors, stairs and actual expanded enemy positions. `actions.mjs` builds source action relationships and collider buckets. `navigation.mjs` validates candidate walking routes using DFO's capsule motor; incomplete models never prove impossibility. `reachability.mjs` has explicit complete-graph proof semantics for applicable tests.
- `jackpot.mjs`: source family/species distributions, conditional Legendary selection and reference-roll opportunity rankings, top 100, compatible-query union and exports.
- `library.mjs`: checksummed schema-1 capture persistence. Maximum 24 queries and 23 MB payload per query; no silent library eviction. Complete captures cannot be replaced by partial reruns.
- `cache.mjs`: independent bounded calculation cache, keyed by adapter/source/assets/world-data/request. It is disposable computation storage, **not an exhaustive coverage ledger**.
- `aurum.mjs` / `aurum-source.json`: pinned pure Aurum rules, helper-version checks, original treasure reconstruction, collider placement and approval-gated results. `DFO-LICENSE.txt` accompanies the source reference.
- `src/renderer/src/hunter/{Hunter,Jackpot,XRay,Navigation}.tsx`: existing Hunter, reusable rankings, 2D map and route interface.

Portable data is beside the EXE in `KaraOpsData/`: `settings.json` retains only ARENA2/source paths; `hunter-history.json` holds saved requests/manual observations; `hunter-cache/` is disposable; `jackpot-library/` holds saved captures; `coffer-approval.json` and `coffer-notes.json` hold separate local attestations/manual notes. Preserve these files and existing schemas. Exports default to `KaraOpsData/` through the native Save dialog.

## Completed v0.6 features

- All ten source theatres, signed world coordinates, deterministic map IDs, source spawning predicates and explicit offline eligibility/live-availability distinctions.
- Base versus Elite-expanded populations, exact species counts, all source `FOE_FAMILIES`, unclassified species, family percentages, dungeon/template identity and provenance. Warriors, casters and rogues remain separate.
- All-population captures retain zero-Dragonling candidates. Species/family/count/purity/weighted/Legendary rankings have configurable minimum population, province filtering, top-100 results, inspector links and CSV/JSON export.
- Compatible saved circles can be combined with map-ID deduplication. Different source/assets/world-data/level/scenario inputs are excluded; conflicting duplicate populations are rejected. Full records supersede incomplete legacy duplicates.
- Retained legacy cache import validates checksum/schema and source/assets/world-data identity without repeating discovery. Missing loot metadata is visibly Unverified; discarded candidates cannot be recovered by migration.
- Source-supported Legendary associations and conditional weights, including King's Mark favoring warriors. Acquisition rankings are explicitly reference-roll opportunity models, not fabricated per-kill odds.
- Offline Aurum eligibility/identity/hash, treasure ordering, seeded icons, original sizes/floor landing, eight-direction clearance and pile fallback. Selected coffer walking analysis is separate from placement. Exact positions/piles/floors/routes stay withheld without explicit recorded DFO developer approval. None was established for this release.
- Existing 2D geometry, navigation, settings, observations, fingerprints and portable packaging preserved.

## Source/data identity

- Population source fingerprint: `88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804`.
- World-data inventory fingerprint: `6d04c8e3bae75ff395d9ffb540cda3671b0c9f8cd573b7c0e53c9c9eed767f8b`.
- Aurum reference revision: `090f4288666940c9b47f08cf0264d9a40ad29097`, from the user's fetched upstream history. It is deliberately distinct from the selected working-tree population source.
- Audited Aurum reference fingerprint: `489c1cc4caef8f01f0073047468665bb6fe587fd45f3f4b64b0fa06fd300410b`.
- ARENA2: `C:\Program Files (x86)\Steam\steamapps\common\The Elder Scrolls Daggerfall\DF\DAGGER\ARENA2`. Original assets remain external and unmodified. `TEXTURE.216` is separately fingerprinted for coffer caching.

## Recorded verification and commands

**93 automated tests passed, zero failures/skips**, preserving all 61 v0.5 tests:

```powershell
# 41 unit/contract tests
npm.cmd test

# 41 original real-data tests
node --test tests/hunter-local.mjs tests/geometry-local.mjs tests/navigation-local.mjs tests/world-local.mjs tests/world-host-local.mjs

# 11 new real-source/ARENA2/worker tests
npm.cmd run test:jackpot:local

npm.cmd run typecheck
```

The Jackpot local suite uses the private untouched fetched-module oracle under `release/verification/aurum-oracle/`. If absent, prepare it with `node scripts/prepare-aurum-oracle.mjs`; this needs local Git objects and exports a copy inside the project without modifying DFO. `scripts/prepare-aurum-reference.mjs` regenerates the packaged pinned reference only when an intentional audited reference update is required, not as routine validation.

For a future changed release, build with `npm.cmd run portable`. Do **not** rebuild the frozen v0.6 merely to resume work. Native desktop verification uses Windows UI Automation, not a debugger:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/native-hunter.ps1 -ExecutablePath release/KaraOps-0.6.0-Portable.exe -Jackpot
# On an isolated relocated EXE with copied KaraOpsData:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/native-hunter.ps1 -ExecutablePath <relocated-exe> -World
```

Native tests launch the app and update research request/history/capture/export data; use an isolated data copy for future reruns. Back up any existing export before exercising the Save dialog again.

Recorded results:

- Castle Hawkwing `(766,88)`, effective level 30, DEX+MUDEX, alternate off, Elite: **25 base / 75 expanded Dragonlings; 59 / 177 total enemies; zero unresolved/excluded markers**.
- Existing walking analysis validates 8 of 25 base Dragonling objectives; the remainder and multi-target return remain Unverified. The independently checked `enemy:87` round trip still passes.
- Original ten radius-20 circles: **12,570 visited pixels, 574 eligible Elite populations**. This is sampled coverage, not exhaustive Tamriel coverage.
- New `(780,100)`, radius-20 capture: **91/91 populations retained**, including the 83 without selected Dragonlings; ordinary selected-species results contain 8 dungeons. Eleven ranking categories rerank the compact dataset in under 1 ms in recorded local runs, excluding initialization.
- Real coffer coordinates match the untouched fetched implementation for `(766,88)`, `(774,119)` and `(785,100)`. Private fixtures also cover obstruction, fallback, absence, disconnected complete graphs and incomplete evidence. Hawkwing coffer placement succeeds; its walking route remains **Unverified**, not impossible.
- Real worker tests cover restart/source-free ranking, production old-cache migration, missing-metadata reporting, deduplication and coffer redaction.
- Final EXE passed native original-folder Jackpot/Legendary/inspector/map/navigation/coffer/export checks, including three retained cache imports. The identical EXE passed relocated High Rock search/map checks at `(689,-210)`. Folder settings remained byte-identical, signed coordinates persisted, Node/npm were absent from the child PATH, and TCP snapshots showed no KaraOps listener/external endpoint.
- Detailed evidence: `docs/V06_VERIFICATION.md`; ignored local `release/verification/v06-build.json`, `v06-local.json`, final matching-hash entries in `native-hunter.jsonl`, accessibility trees, screenshots and CSV.

## Remaining limitations

- **No resumable exhaustive world campaign or validated global jackpot champion exists yet.** Current coverage is saved bounded circles. Top 100 means best among the analyzed compatible populations only.
- The 24-query library and calculation LRU cannot serve as a full-world database or crash-safe coverage ledger.
- Source default geography/original assets are modeled; live spawn clocks, server availability, browser world edits/packs, quests, runtime clears and account state are not observed.
- Legendary opportunities assume a stated compatible reference item roll, baseline Luck/find, captured level and source quality. Real item counts, template mixes, room terms, bonuses, champions and unconditional drop expectations remain unknown. Browser-only custom/unrolled rewards are outside the tested catalog.
- Coffer placement assumes original texture sizes and closed doors/at-rest movers. Placement success does not establish reachability or claim availability. Reward is 10 Aurum once per account/dungeon, maximum 10 coffers per UTC day; manual notes are not server observations.
- Exact coffer display remains approval-gated. Permission-enabled native visualization was not enabled or certified; only private placement/parity/redaction tests were run.
- Navigation remains an incomplete walking model. Unsupported secrets/mover timing, teleport traversal, water, climbing, jumping, movement magic, missing raster spans and timeouts remain Unverified. No live-game parity claim; no 3D viewer or complete puzzle solver.

## v0.7 milestone: resumable exhaustive Tamriel-wide scanning with validated global jackpot rankings

Do not expand geometry, the puzzle solver, 3D or Aurum permissions as part of this milestone. Preserve v0.6 behavior and work in tested increments:

1. **Audit and define the exhaustive domain.** Recheck source contracts and enumerate the exact supported generated-dungeon coordinate/theatre domain, inclusive signed boundaries, world lanes, exclusions and template scope from authoritative source. Distinguish excluded cells, unexplored cells, eligible populations and live availability. Do not silently include unsupported static/lair/quest/hall/other dungeon kinds. Prove that the partition covers the declared domain; do not allocate a giant world grid.
2. **Design a versioned scan manifest and transactional ledger.** Persist campaign ID, deterministic partition/cursor, complete source/asset/world-data/adapter/scenario/level identity, per-partition status and counters, unique world/map IDs, population records, errors and retry state. Define atomic checkpoints, schema migration, disk-full behavior and crash recovery before scaling up. Verify packaged Electron runtime support before choosing the disk-store implementation; avoid adding an unverified dependency. Keep the current capture library/history intact.
3. **Implement bounded incremental execution and resume.** Process deterministic partitions off the renderer thread through the existing source discovery/population adapters. Checkpoint completed work; pause/cancel/crash/restart must not lose acknowledged progress or duplicate populations. Refuse incompatible fingerprint resumes and preserve the old campaign separately. Bound worker concurrency, memory, disk buffering and per-job time; reconstruct full maps/coffers/navigation only on demand.
4. **Build global ranking over retained populations.** Retain the distributions needed for all ranking categories rather than discarding candidates outside each local top 100. Deduplicate overlapping/resumed work by authoritative identity. Rank compatible campaign populations with deterministic ties and minimum-population controls, without rescanning. Preserve exact conditional-versus-unknown loot semantics. Provide source/configuration and coverage provenance with exports.
5. **Make exhaustiveness an evidence-based state.** Report declared scope, unique visited/excluded/eligible/analyzed counts, unfinished partitions, failed/unresolved populations and retries. Rankings remain provisional while coverage or population evidence is incomplete. Claim a global champion only after all relevant partitions are accounted for, population failures are resolved, and completeness is validated under the stated offline assumptions. Never equate a source-complete offline census with live availability or proven reachability.
6. **Validate small before large.** Use a bounded fixture domain to compare resumable results and rankings with an independent uninterrupted source traversal. Test signed/theatre boundaries, partition seams, overlaps, duplicate IDs, interruption at every checkpoint phase, corrupt/partial checkpoints, disk-full recovery, changed fingerprints, concurrent-worker ordering, retries and stable ranking ties. Include population-metadata gaps and source-version refusal. Preserve all 93 tests and Hawkwing's exact counts.
7. **Scale only after correctness passes.** Benchmark several real provincial partitions with explicit counts/time/RAM/disk usage. Compare against v0.6 circle populations and source gate logic. Verify native progress/cancel/resume and portable relocation without external Node. Only then run a full campaign, publish its manifest/coverage proof and validate its global rankings. A long scan still in progress must be reported as incomplete, not as an exhaustive result.

Before the next release, update verification/audit documents, run checks justified by the changes, and build a new portable Windows x64 EXE. Leave this v0.6 EXE and checksum intact for rollback.
