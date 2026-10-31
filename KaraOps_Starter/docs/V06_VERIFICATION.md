# KaraOps v0.6.0 verification

Date: 2026-10-31, Europe/Bucharest.

## Portable executable

C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.6.0-Portable.exe

Size: **110,763,954 bytes**. SHA-256: **F6A5A9C4C7828F8BD6B82CE03809DB73083D7C1C470EA542605586BC1D912D64**.

Built with npm.cmd run portable: TypeScript checks, production Electron/React build, electron-builder Windows portable target with x64 payload. The Electron application PE machine is 0x8664; electron-builder's standard self-extracting launcher is 0x014c. No installer target was built. No external Node/npm/Git is needed at runtime. Original ARENA2 data remains external. The EXE is unsigned, as in earlier milestones.

## Automated verification

**93 tests passed, zero failed or skipped:**

- npm.cmd test: 41 tests, including all original 20 unit tests plus 21 new family/Legendary/ranking/library/export/approval/UI-contract checks.
- node --test tests/hunter-local.mjs tests/geometry-local.mjs tests/navigation-local.mjs tests/world-local.mjs tests/world-host-local.mjs: all 41 original real-data tests passed. The original v0.5 total of 61 is fully preserved.
- node --test tests/jackpot-local.mjs: 11 new real-source/ARENA2 and worker tests passed.
- npm.cmd run typecheck and npm.cmd run portable passed.

New checks cover every source family and member, unclassified species, distinct Dragonling IDs 34/40, base/Elite scaling, minimum population and purity, province/species/weighted/Legendary ranking, all source Legendary pick intervals, King's Mark warrior association, exact conditional versus unknown unconditional odds, 100-row limits, library checksum and migration, compatible-query overlap deduplication/conflicts, complete-capture protection, CSV/JSON fields, approval omission of coordinates and route points, coffer hashing/eligibility, source-helper mismatch diagnostics, obstruction, next-pile fallback, fixed/random preference, absent floor/mover support, no valid placement, successful placement versus disconnected abstract graphs, and incomplete real navigation remaining Unverified.

The private oracle imports the **untouched full fetched DFO aurumCacheHost.js**, independently of the packaged pure-declaration adapter. For reproducibility: node scripts/prepare-aurum-oracle.mjs exports pinned game source/metadata into release/verification; then run the local test above. This changes neither the game checkout nor original assets. Public fixtures contain no original ARENA2 data.

## Source and coffer parity

Working DFO HEAD main: 1d51aadbbd. User-fetched upstream/main: **090f4288666940c9b47f08cf0264d9a40ad29097**. They are deliberately distinct: fetching did not put Aurum files in the working tree. The portable app's audited coffer reference comes from the fetched commit, while population imports use the selected checkout.

Population source fingerprint: **88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804**. World-data inventory: **6d04c8e3bae75ff395d9ffb540cda3671b0c9f8cd573b7c0e53c9c9eed767f8b**. Audited coffer reference fingerprint: **489c1cc4caef8f01f0073047468665bb6fe587fd45f3f4b64b0fa06fd300410b**. TEXTURE.216 is separately hashed for coffer cache identity. Reused helpers must match the fetched reference, with CRLF/LF normalized; isHallMapId is compared as its exact AST declaration. Newer incompatible source refuses coffer prediction rather than silently guessing.

| Real dungeon tile | Map ID | Source treasure piles | 2D sheets | Placement parity |
| --- | ---: | ---: | ---: | --- |
| 766,88 | 1137342 | 7 | 10 | identical coordinates; placement verified |
| 774,119 | 1168350 | 1 | 8 | identical coordinates; placement verified |
| 785,100 | 1149361 | 16 | 10 | identical coordinates; placement verified |

Exact coffer positions are intentionally omitted from this player-facing report. No explicit DFO developer approval was established. Default UI, ordinary exports and map/route data withhold those positions. Internal offline test artifacts can contain them. Navigation is a separate result: Hawkwing coffer walking analysis reached zero coffer objectives and returned **Unverified**, with an incomplete model, never Not Possible. Closed doors, at-rest movers and original texture sizing are the placement assumptions. Active visual replacements, live geometry/state, unsupported movement or puzzles are not established.

## Population and coverage regressions

Castle Hawkwing (766,88), effective level 30, DEX+MUDEX, alternate off, Elite: **25 base / 75 expanded Dragonlings**, **59 base / 177 expanded enemies overall**, zero unresolved or excluded markers. Family distribution: dragon 25/75; beast 17/51; brute 17/51. Existing navigation still validates 8 of 25 base Dragonling objectives and leaves the rest Unverified; its multi-target return remains Unverified. The previously verified enemy:87 single-target round trip still passes.

The original ten radius-20 circles still examine **12,570 pixels and 574 eligible Elite populations** across all source theatres, with Cyrodiil generated spawns excluded by source law. This is sampled coverage, not exhaustive Tamriel coverage.

The new all-population capture at (780,100), radius 20, retains **91 of 91 analyzed populations**, rather than only the 8 Dragonling-bearing rows. Eleven ranking categories reranked that compact dataset in **0.68 ms** in the recorded local run, without discovery or geometry. Capture population work took about 0.23 seconds after source/world initialization. Private worker tests captured Hawkwing, restarted a worker, reranked from the saved library with no source paths supplied, and reconstructed a gated coffer successfully.

Query unions combine only matching source/assets/world-data, effective level, encounter profile, alternate and Elite settings. Overlapping map IDs are counted once; conflicting counts are rejected. Other versions/levels are excluded. Coverage records retain constituent requests; unexamined coordinates are explicitly unexplored. Existing ordinary result-cache/history files are preserved. Legacy retained rows can migrate distributions; discarded candidates cannot be recovered without rescan, and legacy rows missing treasure/loot evidence do not receive Legendary scores.

## Performance, persistence and limitations

Heavy discovery, capture, ranking and coffer/navigation work runs in the cancellable existing worker, bounded at 1536 MB old generation with the existing 360-second watchdog. The library allows at most 24 queries and a 23 MB payload per query, refuses silent eviction, and prevents partial refreshes from replacing completed coverage. Calculation caches retain their existing independent byte/entry bounds and now invalidate on Jackpot/Aurum adapter changes. Settings retain the existing two-folder schema; approval and manual account notes are separate files.

Legendary acquisition is **source-opportunity scoring**, assuming one stated compatible item roll per corpse/layout pile, baseline Luck/find, non-champion and captured source quality/level. Exact selection chances are conditional on that compatible item already being Legendary. Actual item generation counts, template mixtures, live room/bonus/cap state and user equipment are unobserved. No precise expected drops per kill, dungeon or hour, guaranteed Legendary, or endless Aurum farming is claimed. Browser-only custom Legendary registrations are outside the loaded catalog.

Coffer routes reuse the existing validated walking model. Secret/mover timing, teleport traversal, swimming, climbing, levitation and other unmodeled transitions remain Unverified. Narrow/raster-missing connections do not prove impossibility. No live comparison to a connected game was performed. 3D, exhaustive world scanning, client modification, network/account claims and automation remain unavailable.

## Packaged application checks

Native Windows UI Automation is used; no debugging port or live game connection is involved. Final native checks and relocation results are recorded below. Raw evidence is stored locally in release/verification, including native accessibility trees, screenshots, export and v06-local.json.

Final primary-folder native test passed: real Bay scan, Hawkwing 75/177 regression, 2D map and navigation, 91-population capture, Legendary reranking, captured inspector/map, verified coffer placement, Unverified coffer walking route with exact-position gate closed, and CSV export to KaraOpsData/KaraOps-Jackpot.csv. Saved settings remained byte-identical; saved coordinate inputs survived restart. Node/npm were removed from the child PATH. No listener or external TCP connection was present in the KaraOps process snapshot. Evidence: native-hunter.jsonl (entry with jackpot=true and the final EXE hash), native-jackpot-tree.txt, native-jackpot.png, exported CSV and native-bay screenshots.

The final worker persistence test also seeds an actual old-format cache envelope, imports it through the production migration operation without discovery, verifies that missing loot metadata yields an explicit Unverified count, and confirms that a compatible full capture replaces the incomplete duplicate for Legendary ranking. The UI exposes this as Import retained legacy cache; discarded candidates and incompatible versions remain unrecoverable. Invalid signed-coordinate drafts disable new population capture.

Final relocated-folder run also passed using the identical F6A5A9C4C7828F8BD6B82CE03809DB73083D7C1C470EA542605586BC1D912D64 executable, renamed KaraOps.exe inside release/verification/relocated-v06-final. It loaded the copied folder settings and capture library, preserved the previously saved negative search coordinates across restart, scanned High Rock at (689,-210), and opened its real dungeon map. Settings remained byte-identical; Node/npm were absent from the child PATH; no listening/external TCP endpoint was observed. The final primary-folder native run additionally imported three compatible retained cache snapshots through the new UI action. Both final records are the last two native-hunter.jsonl entries.

Approval-enabled coffer visualization was not enabled in the native tests because no explicit DFO developer permission was established. Private placement/parity and approval-redaction tests passed; public exact-position and coffer route overlays remain gated. No live-game or live-account verification is claimed.
