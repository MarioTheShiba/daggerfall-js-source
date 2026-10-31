# Hunter verification report — v0.4.0 navigation increment

Date: 2026-10-31, Europe/Bucharest. **Working bounded walking/navigation increment; the full milestone remains incomplete.** Existing v0.3 Hunter, source diagnostics, population parity, map, caching, settings and portable packaging are preserved. No 3D viewer, live overlay or gameplay automation was added.

## Current executable

`C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.4.0-Portable.exe`

- Windows x64 portable only, unsigned; **110,668,700 bytes**.
- SHA-256: `E007410F22E4DDBD179CCEDE2576D0B482864A229B59C62EDF90055204E71AD9`.
- DFO fingerprint: `88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804` (unchanged).
- World-data fingerprint: `6d04c8e3bae75ff395d9ffb540cda3671b0c9f8cd573b7c0e53c9c9eed767f8b` (unchanged).
- ARENA2 hashes and original population regressions remain identical to v0.3. No original BSA/model buffers are bundled. Runtime needs the selected DFO and ARENA2 folders; no external Node/npm or installer.

## Implemented and tested scope

Source collider-triangle navmesh candidates are replayed through the real DFO PlayerMotor at 60Hz. Routes include actual coordinates and floor changes, ordinary-door/Open-spell conditions, target destinations and independently calculated returns. Goals support a selected marker, marker-to-marker start, selected tour and species base objectives. Route traces and source-backed walking instructions render on the existing 2D X-Ray; no walkthrough is invented for rejected routes. Manual ordinary-door declarations trigger recalculation. Source action namespaces, chain links, secret criteria and teleporter destination positions are indexed.

Only supported ordinary door chains are executed in the offline model. Unsupported automatic triggers, water, dynamic puzzle transitions, wrong-height nav endpoints, collision rejection and missing sampled connectivity remain **Unverified**, with diagnostic reasons. Failed speculative paths restore locks, collider state and activation counters. All real analyses have `completeModel:false`; none are labeled Not Possible. Existing complete abstract-graph tests cover genuine disconnected/partial proofs, but are **not** evidence of real-dungeon completeness.

## Automated results

| Check | Result |
| --- | --- |
| `npm.cmd test` | **18/18 passed**; all prior unit regressions retained, new navigation validation at main/worker boundaries. Complete graph impossible/partial/unknown/error tests retained. |
| `npm.cmd run test:hunter:local` | **7/7 passed**; source populations and all existing parity gates unchanged. |
| `npm.cmd run test:geometry:local` | **9/9 passed**; four real dungeons, exact source transforms/floors/enemy coordinates, cache/version/invalid-data checks. |
| `node --test tests/navigation-local.mjs` | **9/9 passed**; actual source thin-wall collision and one-way drop fixture, action-chain/secret/namespace parity and cycle safety, motor-validated partial tour, single/return/closed-door contrast, selected tour/between-marker routes, deterministic state, two other real dungeons, cap uncertainty and cache invalidation. |
| Typecheck and portable build | Passed. Windows x64 portable target only. |

Total: **43 automated tests passed**, plus Electron interaction suites. Real action-bearing samples cover 21 links, 37 non-None action records, 2 teleport records and 11 source-classified secret movers; destination and chain tests use source namespace/position resolution without pretending to traverse those mechanisms. The standalone Node driver emits the source module's experimental localStorage warning; tests pass without browser storage.

## Desktop and portable runtime verification

- Final compiled development app: passed real scan, X-Ray controls, navigation calculation, route SVGs, walkthrough display, matching-profile cache hit, invalid navigation rejection, manual door-state recalculation, cancellation, missing-folder recovery, bookmarks, settings/history restart, sandboxed renderer and no observed external requests/TCP connections.
- **Final EXE**, SHA above: passed the same suite and a clean restart. Hawkwing calculation 2,841ms, 19,186 replay frames, 8/25 objectives and 120 computed steps. Repeated navigation returned a matching-input cache hit. First/repeat X-Ray requests 2,096/1,919ms, repeat cache operation 5ms; input revalidation remains part of each job.
- **Relocated final EXE**, only EXE copied to `%TEMP%\KaraOps-v0.4-Navigation-Validation`: passed the same suite, manual door recalculation and settings/bookmark restart. EXE hash matched. First/repeat X-Ray requests 1,980/1,671ms, repeat cache operation 13ms. Child app PATH contained only Windows/System32, with Node/npm absent; external test driver still uses Node/Playwright. Folder settings remain adjacent in that relocated folder's KaraOpsData.
- Final EXE native-dialog regression: **two launches passed**, selecting both the actual ARENA2 and DFO folders through Windows dialogs, navigating all retained pages, verifying adjacent settings JSON and persistence after restart. Both launches reported version 0.4.0, no renderer Node access, no renderer errors, no external requests or TCP connections. Evidence: final two `smoke-results.jsonl` records.
- One earlier simultaneous portable/native run passed navigation but failed its relocated restart connection. GUI suites were then run sequentially; the driver now waits for portable-launcher cleanup before restarting. Both final original and relocated runs passed. This test-harness failure is not silently counted as a passing run.
- Ordinary launches have no debugging port; test drivers explicitly request loopback CDP. No live DFO gameplay was automated.

## Real dungeon navigation evidence

Manual effective level 30, classic DEX+MUDEX, fresh static layout. Door opening enabled, declared Open holder level 30, maximum drop 1m. Counts below concern **base objective markers**, not Elite copies; ordinary Hunter totals remain unchanged.

| Dungeon | Source nav cells / polygons | Base objectives validated | Result / return |
| --- | --- | --- | --- |
| Castle Hawkwing (766,88) | 504,300 / 6,529 | **8/25 Dragonlings** | Partially reachable; remaining 17 Unverified; final tour return Unverified. |
| Hawkwing, single `enemy:87` | same | **1/1** | Reachable with conditions; outbound 20.66m, separately replayed return 20.73m. With door opening disabled: target Unverified. |
| The Dunistair Pit (774,119) | 378,225 / 4,502 | **6/22 Dragonlings** | Partially reachable; independently validated conditional return. Includes a real Open-spell threshold condition. |
| Curated record 3 (810,50), first source species | 504,300 / 5,292 | **0/2** | Unverified: source door `act:0:11772` has an unsupported action chain; no invented passage. Return at unchanged start is zero-distance, not evidence of target reachability. |

Hawkwing tour replays 19,186 motor frames and indexes 61 mechanisms. Successful legs traverse map floors 2 through 7 (zero-based source sheet indices), with height transitions taken from motor traces. Recent standalone calculations took approximately 2.4–3.2s; performance varies under concurrent packaging. Missing routes are not a census of genuinely unreachable targets. Source bake has narrower effective radius than the player; final capsule replay is mandatory and rejects insufficient clearance.

Evidence: `release/verification/navigation-parity.json`, `navigation-electron.jsonl`, `navigation-restart.jsonl`, navigation screenshots, plus retained Hunter/geometry QA artifacts. Evidence contains derived coordinates/statistics only, no raw BSA/model buffers. Assets and DFO source remain external/read-only; parent `src` and `vendor` Git status is unchanged.

## Limits and remaining work

No exhaustive combined puzzle-state search, teleporter traversal, mover/lever/plate/timing solver, lockpick RNG, swimming, jumping, climbing or levitation model. No shortest-route guarantee, alternate-route completeness proof or real-dungeon impossibility proof. General door/switch/mechanism manual state editing is limited to ordinary doors in this increment. Full puzzle walkthrough and 3D controls remain disabled. The known v0.3 normal-preserving automap adaptation and active-pack/live-state uncertainty remain documented below.

No live game session was driven or observed during this work. Validation compares source algorithms, actual local assets, real motor behavior and the packaged desktop UI; it does not establish live gameplay parity for all routes. The next stage must model and validate directed action transitions, replan across alternative corridors and prove model completeness before offering Not Possible for real dungeons.

---

# Historical v0.3.0 / Stage 2A verification

Date: 2026-10-31, Europe/Bucharest. Existing Stage 1 Bay features preserved; correctness pass and static/fresh-layout **2D X-Ray implemented**. Wider-world/active-pack/live-state parity remains outside the verified scenario. No 3D, secret solver or walkthrough engine has been started. The historical v0.2 report follows below.

## Current executable

`C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.3.0-Portable.exe`

- Windows x64 **portable only**, unsigned, 110,658,239 bytes.
- SHA-256: `06CD58BC71D4E9E556D6FC4FD466157E25E2DF32FF7EB44BD3B2443CE7A7F339`.
- DFO source fingerprint: `88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804`.
- World-data inventory fingerprint: `6d04c8e3bae75ff395d9ffb540cda3671b0c9f8cd573b7c0e53c9c9eed767f8b`.
- The selected DFO checkout and user-owned ARENA2 remain external runtime inputs. No separately installed Node/npm, installer or game automation is required.

## Stage 1 correctness results

The earlier completion terminology was incorrect: **75 is the Elite-expanded Dragonling count**, not the pre-Elite base count. At effective level 30, classic DEX+MUDEX selection, Elite Castle Hawkwing (766,88) has:

| Population | Pre-Elite base | Elite-expanded |
| --- | ---: | ---: |
| All resolved species | 59 | 177 |
| Dragonling (34) | 25 | 75 |
| Dragonling origin | 0 fixed + 25 resolved random markers | Three source copies per base record |

Unresolved markers: **0**. Deliberately excluded candidate markers: **0**. The UI and result schema now separate these categories. Invalid/undefined encounter selections are not added to resolved counts; deliberate source water/record vetoes are separate exclusions. Regression tests preserve the field-tested result.

Source onlineLane confirms DEX and Meaner Monsters are forced on online. AlternateRandomEnemySelection is **not forced**; its default is false, and the selected value remains explicit. Effective level is a manual input and must match game group/mentor context. Existing tests cover three table scenarios and both classic/alternate branches, actual table seed, water/fixed/random behavior, and order independence.

World-data inspection read and fingerprinted 15 local files/packs (including Beautiful Cities' 1,021 and Beautiful Villages' 7,526 named entries). No named RDB override was present. This does not prove town/location edits cannot affect the spawn index or template order; browser active-pack/layout-pin state remains unknown. The original-data-plus-curated scenario is explicit in the UI. Changed/missing audited generator/geometry files stop prediction with SOURCE_VERSION_MISMATCH. Source/asset/pack changes between a scan and map request stop reconstruction and require a rescan.

## Automated verification

| Command / check | Result |
| --- | --- |
| `npm.cmd test` | **16/16 passed**, including all 12 prior unit/regression tests plus cache/mismatch/unresolved-count coverage. |
| `npm.cmd run test:hunter:local` | **7/7 passed**, retaining all prior source-data parity cases. |
| `npm.cmd run test:geometry:local` | **9/9 passed**, four real dungeons, Hawkwing terminology regression, cache reuse, invalid dungeon/missing normals diagnostics, and a real worker scan/map-version mismatch rejection. |
| `npm.cmd run typecheck` / `npm.cmd run portable` | Passed. |
| Development application interaction suite | Passed: real scan, counts, floors, unchanged view coordinates across floor changes, marker inspection, all/target species filter, Elite-copy toggle, pan, button/wheel zoom without page scroll, cache reuse; existing cancellation, missing-folder recovery, bookmarks and restart persistence also passed. |
| Final portable EXE | Passed the same Hunter/X-Ray interaction and recovery suite; first map 1,602ms, repeated map 1,316ms with 3ms cache operation, no renderer errors or external requests/connections observed. |
| Relocated portable EXE | Only EXE copied to `%TEMP%\KaraOps-v0.3-XRay-Validation`; same real map, cache, interactions, invalid-folder recovery and bookmark/settings restart checks passed with Node/npm absent from child PATH. First/repeat map 1,609/1,634ms, cache operation 9ms. |
| Retained native folder/navigation regression | Two launches passed native selection of both actual folders, navigation, adjacent settings and restart persistence. |

Total: **32 automated tests passed** (16 unit/regression + 7 Hunter parity + 9 geometry parity), plus development/original portable/relocated application suites and native-dialog regression. The test driver uses Node/Playwright externally; the portable application uses embedded Electron Node for its worker. Node was not uninstalled from the PC. Ordinary launches do not enable the test-only loopback debug port.

Concrete evidence: `release/verification/hunter-parity.json`, `geometry-parity.json`, `hunter-electron.jsonl`, `xray-electron.jsonl`, and `xray-development.png` / `xray-portable.png`. QA summaries contain hashes/statistics only, not BSA buffers or distributable mesh data. Derived maps are stored only in the user's local bounded cache for the view.

## Real geometry samples

| Pixel / dungeon | Blocks | Model rows | Authored floor triangles | Storeys → map floors | Base → expanded enemies, all species |
| --- | ---: | ---: | ---: | ---: | ---: |
| 766,88 / Castle Hawkwing | 8 | 488 | 3,426 | 13 → 10 | 59 → 177 |
| 774,119 / The Dunistair Pit | 5 | 281 | 2,009 | 9 → 8 | 52 → 156 |
| 785,100 / The Cave of Morkucheus | 14 | 828 | 4,852 | 14 → 10 | 103 → 309 |
| 810,50 / curated record 3 | 8 | 380 | 2,528 | 10 → 6 | 55 → 165 |

Tests independently assemble source host meshes and origin×placement matrices, then compare floor bounds, storeys, occupancy counts, boundary chains, source marker positions, independently rebuilt collider/Elite-copy positions and nearest-storey assignment. ARCH3D seam repairs match dataPipeline.patchSeams before mesh conversion. Missing/invalid meshes and unsafe raster budgets produce diagnostics, never substitute drawings.

**Known source automap discrepancy:** dungeonContext supplies authored normals but buildAutomapModel drops them. Its normal-less floor extraction yields 16 storeys in each tested sample by admitting ceilings. KaraOps preserves those normals and uses the source's normal-aware extraction, yielding the counts above. Source code is unchanged. The difference is visible in map warnings and recorded explicitly; this is not a claim of pixel-identical output from the unmodified game's automap index.

The one-metre raster is DFO's own PLAN_CELL; it can omit thin details and is not exact collision geometry. Hawkwing has 3 expanded records whose coordinates do not project onto their assigned sheet's raster cells (other samples: 2/4/4). They remain at their source coordinates, with projection diagnostics and inspectable XYZ, rather than being snapped to apparent floor. These counts include all species and are not proof of inaccessible objectives.

## Cache and performance

Source, pack and all six ARENA2 contents are checked before each job. ARENA2 hashing/parsing shares the same byte snapshot. Scan and geometry caches also include the KaraOps adapter-code hash, schema, request, effective level and mod scenario; atomic/checksummed entries are bounded to 12 / 64MB total. Corrupt or wrong-key entries regenerate; partial/error scans are not cached. No live availability or traversal conclusion is cached.

Local Hunter suite: initialization 1,904ms; radius-20 scan 217ms, 91 eligible/reconstructed dungeons, zero errors; radius-50 scan 533ms, 511 reconstructed, zero errors; suite RSS 613MB. Latest geometry/parity work including independent oracle assembly took 164/71/90/40ms across the four samples. With inputs already verified/loaded, repeated geometry work measured **28ms uncached versus 3ms cache hit**. Full new-worker UI map opens still take approximately 1–2 seconds because input verification/loading is deliberately retained. All timings are machine/run dependent.

## Remaining limitations and next gates

- No manual live automap/game comparison was performed; validation uses real local data and source algorithms/oracles. Actual browser pack/settings state, dungeon lifetime, cleared enemies and moving mechanisms are unknown.
- The map includes floor/room/corridor fill, boundary walls, at-rest doors, source stair/ramp joins and predicted enemies. It does not prove movement/collision connectivity, locks, ability requirements or reachability. No route lines, impossible-objective claims or invented positions are produced.
- Original-data-plus-curated **Iliac Bay** remains the supported world scenario. Wider-world registry/road/zone support and active-pack/layout-pin parity remain open.
- 3D, secret-door/mechanism solver and intelligent walkthroughs remain disabled. The earlier abstract proof-policy tests remain separate from real geometry.

## Historical v0.2 verification (retained baseline; count terminology superseded above)

Date: 2026-10-31 (Europe/Bucharest). Platform: Windows x64. Status: **working Iliac Bay Stage 1 base-population slice; full Stage 1 acceptance still open**. See `HUNTER_IMPLEMENTATION_AUDIT.md` for boundaries, source trace and remaining work.

## Final artifact

`C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.2.0-Portable.exe`

- 110,647,992 bytes; Windows x64 portable target only, no installer or updater.
- SHA-256: `9CCB30BCDF5A0A9161FF1A4504E7CB72068C4AFD3F39AF5AEF96CA21E2F88487`.
- Unsigned, default Electron icon. Old v0.1 artifacts are retained as the validated baseline.
- Runtime algorithms and data remain external in the user's selected DFO and ARENA2 folders. Node/npm is not needed by the executable.

## Inputs / reproducibility

- DFO checkout: `C:\Users\mario\Documents\GitHub\daggerfall-js-source`
- Git HEAD: `ae0e0ab9fb3e8020a374070553e9756ee627cad4`; `git status --short -- src vendor` was empty after implementation.
- Content fingerprint (DFO source JS/JSON plus vendored road bytes): `88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804`.
- ARENA2: `C:\Program Files (x86)\Steam\steamapps\common\The Elder Scrolls Daggerfall\DF\DAGGER\ARENA2`.
- Full SHA-256 hashes of MAPS.BSA, BLOCKS.BSA, ARCH3D.BSA, WOODS.WLD, CLIMATE.PAK and POLITIC.PAK are recorded in `release/verification/hunter-parity.json` and runtime provenance. No file contents are copied into the distribution or report.
- Validated scenario: explicit effective level 30, classic selection, DEX+MUDEX, elite-only, original world-data assets with generated curated blocks. Level and scenario are editable; no live settings are inferred.

## Automated results

| Check | Result | Evidence |
| --- | --- | --- |
| `npm.cmd test` | **12/12 passed**, 0 failures/skips | Request validation, source-independent worker cancellation/errors/history, existing security/portable regressions, directed-graph proof-policy cases. |
| `npm.cmd run typecheck` | **Passed** | Strict main/preload/shared and renderer TypeScript projects. |
| `npm.cmd run test:hunter:local` | **7/7 passed**, 0 failures/skips | 1,000 hash checks including negative/out-of-Bay pixels; world-lane alias regression; 1,681 spawn-host comparisons; real layouts/populations across profiles; curated adapter oracle; table order; fixed/random/water/level logic; bounded scan/filter checks. |
| `npm.cmd run portable` | **Passed** | electron-builder 26.18.0, Electron 45.2.0, Vite 8.3.5/electron-vite 6.0.0; backend `.mjs` resources included beside ASAR. |
| Development Hunter smoke | **Passed** | Renderer heartbeat continued while worker ran; real scan, disabled advanced controls, invalid request rejection, bookmark, cancellation, missing folder failure, restored settings, subsequent scan recovery, full restart persistence. |
| Final portable Hunter smoke | **Passed** | Same real scan and persistence/error/recovery checks in delivered EXE, 91 eligible dungeons simulated, 0 parser errors, expected top result. |
| Relocated portable Hunter smoke | **Passed** | Only EXE copied to `%TEMP%\KaraOps-v0.2-Hunter-Validation`; worker loaded real external source/data, wrote adjacent data, restarted and retained bookmark/settings. Child PATH contained Windows/System32 and Windows only. |
| Original native-picker regression | **2/2 runs passed** | Actual Windows folder selection for both real folders, Settings/Overview navigation, Dragon Radar/World Atlas nonfunctional labels, adjacent settings JSON, and restart persistence in v0.2.0. No renderer errors, remote requests or external TCP connections in the snapshots. |

The executable smoke driver uses Node/Playwright outside the tested application. Its portable child has no Node/npm on PATH. A test-only loopback debugging port is enabled by the driver; ordinary launches do not enable it. The PC still has Node installed; it was not uninstalled. External DFO/ARENA2 folder dependencies are intentional and tested separately from installed Node.

## Measured scans / real samples

Final local test run: initialization **1,401 ms**, radius-20 scan **189 ms**, 1,257 pixels → 110 kept elite hash candidates → 91 world-gated → 91 reconstructed → **0 errors**. Radius-50 scan: **453 ms**, 7,845 pixels → 599 hash candidates → 511 world-gated/reconstructed → **0 errors**. Process RSS at the end of the multi-scan/oracle suite: **611 MB**. These measurements are machine/run dependent; each new worker reloads inputs rather than using a persistent cache.

Final delivered EXE radius-20 scan: **323 ms** after initialization; relocated EXE: **190 ms** after initialization. Both reproduced the same top result.

| Pixel | Actual source template name (elite clone) | Blocks | Predicted Dragonlings |
| --- | --- | ---: | ---: |
| 766,88 | Castle Hawkwing | 8 | 75 |
| 774,119 | The Dunistair Pit | 5 | 66 |
| 786,81 | Ruins of The Old Ashsly Hovel | 13 | 57 |
| 787,100 | Ruins of The F'uth Farmstead | 8 | 51 |
| 785,100 | The Cave of Morkucheus | 14 | 27 |

Each sample's block names/origins/start flag and target marker data were compared against direct source layout/population assembly under three table profiles × two selection arms. A separate real curated sample **(810,50), curated record 3, 8 blocks** matched the game world-data door. No parity mismatches were waived. These counts are base fresh-layout predictions, not claims of current population or accessible targets.

## Safety / uncertainty / limits

- Existing settings remain the same two path keys in `settings.json`; Hunter requests/bookmarks/manual observations live separately in `hunter-history.json`. Atomic writes, source/asset/request stamps and a 500-record cap apply. Restart checks verified settings and bookmarks in the original and relocated EXE directories.
- Sandbox, context isolation, disabled renderer Node integration, web security, denied remote navigation/new windows/permissions and main-frame IPC checks were preserved. Worker requests are bounded and no renderer filesystem/command endpoint was added.
- Successful portable runs observed **0 renderer HTTP/HTTPS/WebSocket requests** and **0 external TCP connections in runtime snapshots**. Loopback debugging is excluded. This is bounded observational evidence, not a proof about every transient connection. Packaged browser requests and worker fetch are denied. No game/account/session/network data is accessed.
- Release inspection found no embedded BSA/WLD/PAK files and no installer distribution. DFO src/vendor remained unchanged; ARENA2 hashes remained stable across repeated runs.
- Full live-game checks have **not** been performed. No dungeon was entered or controlled by KaraOps. Source oracle results are not a guarantee that a dungeon is alive, that enemies are uncleared or that an objective is reachable.
- Impossible and partially reachable cases currently test **synthetic complete directed traversal models** in the future proof-policy core. A disconnected objective has a closure witness; a 2/3 fixture returns partial reachability; missing mechanics, unknown teleport edges, unknown abilities and exhausted budgets cannot prove impossibility. These tests do **not** establish real BSA dungeon impossibility. The production Hunter always returns reachability `unknown` until later reconstruction stages pass.

## Remaining acceptance gates

| Area | Status |
| --- | --- |
| Iliac Bay deterministic base scanning, online sizing, curated blocks and encounter scenarios | Implemented and source-parity tested within stated scope. |
| External world-data pack / full active-mod template order | Unverified; explicit original-data scenario only. |
| Wider-world negative/out-of-Bay scanning, registry, TESA roads and zone/quest exclusions | Not implemented; outside-scope requests rejected. Source hash/ID tests alone do not enable this feature. |
| Persistent cache, fine-grained invalidation and cache speedups | Not implemented; fresh workers prevent stale module/selector reuse. |
| Bookmark/visit entry and persistence | Implemented; deletion, clear timestamps and cooldown management remain unfinished. |
| Interior floors / true 2D mesh map / pan-zoom / 3D | Not implemented; actual block placement and base marker coordinates only, clearly labeled. |
| Collision/action graph, secret/mover/switch/teleporter analysis | Not implemented; controls disabled. |
| Validated stateful walkthrough, ability profiles, farming efficiency and proof of real dungeon impossibility | Not implemented; controls disabled, no routes or gold/hour invented. |
| Live manual source/game comparison | Pending user-controlled game observations. |
| Dragon Radar | Remains disconnected and unimplemented in KaraOps. |

## Changed files / evidence locations

- Existing integration: `src/main/index.ts`, `src/preload/index.ts`, `src/shared/types.ts`, `src/renderer/src/App.tsx`, `style.css`, `electron-builder.yml`, `package.json`, `package-lock.json`, `README.md`.
- New backend: `src/main/hunter/{engine.mjs,worker.mjs,service.ts,reachability.mjs}`.
- New contracts/UI: `src/shared/hunterTypes.ts`, `src/renderer/src/hunter/Hunter.tsx`.
- Tests: `tests/hunter.test.mjs`, `hunter-service.test.mjs`, `reachability.test.mjs`, `hunter-local.mjs`, `hunter-electron.mjs`; skeleton/electron smoke checks updated for the now-working Hunter page.
- Documentation: this report and `docs/HUNTER_IMPLEMENTATION_AUDIT.md`.
- Concrete outputs: `release/verification/hunter-parity.json`, `hunter-electron.jsonl`, Hunter UI/block screenshots, and existing smoke-results JSONL/screenshots. No proprietary asset buffers are included in these artifacts.

The portable EXE is a useful validated bounded slice, not completion of KaraOps Ultimate Dungeon Hunter. Finish the remaining Stage 1 gates before advancing the disabled geometry and solver stages.
