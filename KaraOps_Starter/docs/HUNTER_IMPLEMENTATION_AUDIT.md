Current v0.9 addition: [Orrery observation research and verification](V09_VERIFICATION.md). Optional CDP puzzle observation is implemented and source/fixture tested; actual game runtime remains unverified. Existing engine results and limitations below remain applicable.

Current addition (2026-11-02): [v0.8 Orrery audit and verification](V08_VERIFICATION.md). Adds an independent offline Elite Breach/Abyss solver to the existing application; Hunter, navigation, source fingerprints and telemetry remain unchanged. Historical sections below remain applicable to those engines.

# v0.7 implementation audit

The user's revised milestone is navigation reliability and a developer-authorized live companion; exhaustive scanning is deferred. See [the current verification and implementation record](V07_VERIFICATION.md) and [upstream integration proposal](../integration/DFO_UPSTREAM_PROPOSAL.md). Historical release records below are preserved.

---

# v0.6 implementation audit ? 2026-10-31

The existing v0.5 scanner was extended in place. No DFO source, ARENA2 file, game client or account state was modified. All work remains offline.

The user's fetched upstream/main is 090f4288666940c9b47f08cf0264d9a40ad29097. The working checkout remains main 1d51aadbbd, with the same tested src/vendor population fingerprint 88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804. The new Aurum files are present only in the fetched revision. Relevant layout, collider, motor, action, identity, floor landing, texture-size and loot-pile helpers were compared with that revision. Runtime coffer analysis verifies their normalized source hashes; isHallMapId is checked by its exact extracted declaration because unrelated wire code changed.

jackpot.mjs imports FOE_FAMILIES, foeFamily, allLegendaries, foundAmong, legendariesFor, corpseSource, dungeonFamily, dungeonRarityTier, rarityChances and plain-foe cap weights from the selected checkout. Families include separate warrior, rogue and caster sets; unknown/custom species remain unclassified. Elite-expanded counts are separate from base markers. Library captures retain every reconstructed eligible population, including zero-Dragonling candidates. Ranking uses compact distributions, never raster/geometry reconstruction. Compatible saved query union deduplicates map IDs and rejects inconsistent populations. JSON and quoted CSV exports preserve source/configuration/coverage; expected actual drops remain null/UNKNOWN.

The Legendary reference model assumes one eligible roll of a stated compatible item per modeled corpse/pile, Luck 50, find x1, captured effective level, source Elite quality, non-champion and baseline room quarter weights where applicable. These are stated comparison assumptions, not an observed real drop process. Browser-only custom Legendary registrations are not automatically activated. Exact conditional target selection is distinct from unknown unconditional loot odds.

The fetched lootRarity change excludes unrolled custom Legendary records from random rolls. Those browser-only custom registrations are outside the tested built-in catalog; all loaded built-in pools and requested family associations are unchanged. No acquisition score is claimed for unrolled/custom-only rewards.

Aurum reconstruction uses only selected dungeons. scripts/prepare-aurum-reference.mjs reads pinned Git objects without changing the checkout; the portable app carries the reference and MIT license and needs no Git executable. aurum.mjs uses AST-selected, audited pure declarations; account/session/claim/host activation code is never compiled or invoked. Source random treasure ordering and online icon seeds, TEXTURE.216 classic dimensions, fixed-marker centre conversion and random floorLanding are reproduced. The existing ActionSystem builds closed door/at-rest mover buckets, with static mesh grouped under the actual dungeon bucket. Actual aurumCacheFoot handles the eight directions, bounding gaps, walls, floor/ceiling, other piles, doors and movers, and returns verified placement or verified absence under that at-rest reconstruction.

Approval is a separate coffer-approval.json file, preserving the existing two-path settings schema. It requires explicit authority/evidence and defaults closed. The worker and main process both withhold exact foot, floor, pile and navigation result coordinates when approval is absent. Manual notes in coffer-notes.json are not account observations. Source-motor route checks can remain Unverified despite successful placement. Approved results can reuse the existing 2D marker and route visualization; no approval was established here, so the actual delivered UI remains gated.

Private parity tests import the untouched full fetched Aurum module from a read-only Git archive exported inside release/verification. This is separate from the packaged AST adapter. Tests compare hashes, identity, eligibility, synthetic blockers/fallback and three real dungeon coordinates. Test oracle preparation is reproducible with node scripts/prepare-aurum-oracle.mjs; it does not edit or switch the game checkout.

Persistent captures are bounded and checksummed; library entries are not LRU-evicted. Old calculation cache keys invalidate on the changed adapter. Retained legacy rows can migrate family/species metrics, but absent treasure/loot metadata disables Legendary scoring for incomplete legacy rows. The Import retained legacy cache action validates old cache checksums/schema, source, assets and world-data identity, then imports distinct retained query snapshots without discovery. Different selected-species queries receive distinct migration IDs. Partial/corrupt/incompatible entries are excluded; missing loot metadata is visibly Unverified. Previously discarded candidates require a fresh capture. A compatible full capture takes precedence over an incomplete legacy duplicate in query unions. Existing settings/history remain intact. Query unions cover saved compatible circles only, not the world. Unsupported secret, teleporter, water, movement-magic and raster cases still propagate Unverified.

Historical audits follow.

---

# Hunter implementation audit — v0.5.0 Tamriel discovery

Date: 2026-10-31. The existing project is extended; v0.4 maps, source population scenarios, cache, settings and bounded navigation remain intact. No game source/assets, client, packets or gameplay were modified.

## Source audit

The latest **local** checkout is `8d11c0f075` (`v.4`). Compared with the preceding v0.4 baseline checkout `ae0e0ab9fb`, there are no differences under game `src/` or `vendor/`; the newer commit adds KaraOps and an unrelated spawn log. Whole-source fingerprint remains `88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804`. No fetch/pull or live-game connection was made. This is a local-checkout audit, not a claim about a remote repository's latest state.

Audited world contracts now additionally pin worldGrid/worldLanes, trace/fit/relief/ground, province geography/biomes, country/lair/capital/Arena places, regional roads/worker/paths, the actual spawn/Tamriel host integration, Cyrodiil's zone, and filed-land rules/data. Current source landEdits.json contains no edits. Changed core contracts still stop prediction; whole-source, local pack and all ten required ARENA2 file fingerprints remain part of every job/cache key.

## Source composition and scope

- `world.mjs` composes real source functions and exposes ten theatres from worldGrid. Source `preloadTamrielTrace` reads the user's TMAP00I0.IMG/TAMRIEL2.IMG, ART_PAL.COL/MAP.PAL and source relief; source fit uses the host's filed climate/height over the repaired Bay. Fit is `{ox:589, oy:883.5, ppu:15.5}`, trace land cells 26,599. Province presets come from the traced geography and are search centres, not invented towns or dungeon locations.
- Engine coordinates extend to integer -8191..8191 on each axis, matching the pinned world grid. Source spawnedMapId/worldLaneMapId provide unsigned identities beyond the Bay; no `y*1000+x` shortcut aliases negative/out-of-Bay coordinates. Bay identities and 4,218 spawn templates remain unchanged.
- Source capitals and Arena places reserve pixels first, then source countryside and planned lairs. Their templates/counts and density basis follow actual TamrielPlaces host rules. An independent host test exposed two misses when raw rather than repaired/filed density was used; the adapter was corrected. The final test compares 8,542 beyond-Bay samples and exact density basis with no mismatches, including the two regression pixels (3236,1535) and (3093,1396).
- `createSpawnGroundPlace` applies actual climate, dry plateau, Ether Sea, Cyrodiil mask and reserved-place exclusions. Spawn roll/keep/Elite predicates are applied explicitly. Live clocks are intentionally not evaluated; eligibility is labeled `eligible_under_offline_scenario`, availability always unknown. Runtime Hollows, quest/pack/day state are not inferred.
- Source regional road preparation uses actual country/lair rollSpec, Arena towns, capital gates/obstacles, Bay joins/held pixels and named Cyrodiil trunks. Every source road region whose **apron** intersects the requested circle is prepared, not just the centre's region. Source roadsWorkerState.steps builds its own 1000x500 grids incrementally; packed source paths and places are installed before eligibility. Missing/failed road generation is an explicit error, never silently considered path-free.
- The source Cyrodiil mask excludes ordinary generated spawns in the Imperial Province. Zone halls, countryside lairs, static/quest/abyss/special-instance dungeons are separate families and are not represented as generated Elite results. The search scope is the `spawnedDungeons` family across supported source theatres, not every dungeon family in the game.

## Integration and correctness

Result metadata adds theatre/province, source region, map/template identity, Elite/eligibility status, Dragonling expanded count, all-species expanded count and resolved-population percentage. Existing base/expanded/fixed/random/unresolved/excluded counts remain separate. Purity denominator excludes unresolved markers and the UI says so.

Province filters and source centre presets work with manual signed coordinates. The retained top 100 can be ranked by selected species count or Dragonling purity; the current retained list can be sorted by count/purity/province/distance. Bay-town centring resets the province filter, and wider-world results do not falsely recommend a Bay town as nearest. Negative entry uses a text draft so a lone minus sign is preserved; invalid drafts cannot start a scan. Native testing reproduced the earlier number-input minus-to-zero problem and verifies the corrected saved signed request.

Each result records bounded-circle coverage: visited pixels by theatre, eligible/populations simulated/errors, matches versus retained results, truncation, road regions and completeness **under the query filters**. `exhaustiveWorld` is always false. Coordinates outside that result's circle remain unexplored by it; there is no aggregate exhaustive-coverage or world-best claim. No automatic world-wide sweep or Jackpot Scanner was added.

Maps and navigation reuse the existing source layout/collision engine for selected world IDs. Geometry independently prepares required world road context before admission. A source-verified High Rock sample at (687,-216), map 1201283759, reconstructs 8 blocks and 153 expanded enemies. Its tested walking objective remains Unverified under the existing incomplete model; v0.5 does not loosen navigation correctness to increase coverage.

## Performance, caching and verification boundaries

All tracing/roads/scans/layout/navigation run in the cancellable backend worker, not the renderer. Radius <=50, retained results <=100, diagnostic list bounded, 1,536MiB worker old-generation limit, 240-second road preparation cap, 300-second scan budget and 360-second worker watchdog. Regional source generators yield between steps; terminating the worker cancels expensive initialization too. No enormous world grid is allocated on the UI thread.

Road-region cache joins existing content-addressed checksummed/atomic storage (12 entries/64MB total, 16MB maximum entry). Keys include source/assets/packs, adapter code, region/scenario or full query/capabilities. The terrain-density fix automatically invalidated earlier region caches. Only derived data are stored locally; source modules and user assets remain external/read-only and original BSA/model buffers are not packaged.

Desktop verification uses Windows UI Automation and the accessibility flag `--force-renderer-accessibility=complete`, without any remote-debugging connection. Existing Playwright/CDP scripts are retained as historical tooling and were not invoked for v0.5. No game process/session/memory is read. See HUNTER_VERIFICATION_REPORT.md for exact tests, samples and executable hash.

Remaining limits: offline default source scenario rather than active browser mods/land/quest/day state; no live lifecycle validation; no whole-world exhaustive ranking; nearest towns outside the Bay not indexed; v0.4 mover/teleport/puzzle/advanced-movement navigation gaps remain. Full puzzle walkthrough, live overlays, Dragon Radar and 3D stay disabled.

---

# Historical v0.4.0 navigation audit

The full Navigation & Feasibility milestone remains incomplete. This release finishes a working, bounded walking slice while preserving v0.3. No DFO source or ARENA2 assets are modified.

## Navigation implementation

- `navigation.mjs` is independent of map raster/rendering. Source `ai/nav/navBake.js` builds 0.25m walkable compact spans/regions/polygons from real world-space collider triangles; source `navPath` supplies candidate polygon/funnel paths. Candidate adjacency alone never establishes traversability.
- Candidate segments replay through the actual `player/motor.js` PlayerMotor and `player/collider.js` at 60Hz (1.8m capsule height, 0.35m radius, source slope/step behavior). Only successful grounded traces within 0.8m of the source-landed target are exposed as routes. Different-height nav endpoints, failed clearance, unknown automatic actions, water and unsafe drops are rejected as Unverified. One-way return is computed independently.
- Walking entry uses `startMarker` plus source `player/enterExit.js` floorLanding, matching dungeonContext's walk-in choice. The pre-existing X-Ray load/teleport marker is retained separately. Enemy marker positions are never invented or moved for display.
- `actions.mjs` reconstructs source ActionSystem namespaces and block-local links, source `nextOf/chainTargets`, `dungeonSense.playerTriggers/isSecretMover`, `dungeonEcho.chainMovers`, and exact position-index teleporter destinations. Geometry at rest includes movers and special doors as actual collider buckets.
- Modeled state transitions are ordinary doors whose entire chain is ordinary None/OpenDoor/UnlockDoor, with cycles/depth rejected. The real offline ActionSystem activation/update and Mysticism Open threshold run only for these supported chains. Other effects are never silently applied. Failed speculative motor paths restore saved states, locks and activation counts before another objective is tried.
- Character profile exposes ordinary door use, declared Open-spell holder level, maximum drop and explicit ordinary-door states. Open-spell availability is an assumption, not detected inventory. Nearby visible supported doors may be opened even if not strictly necessary: instructions and conditions record them; interaction optimality is not claimed.
- Goals: entrance to one actual enemy, between marker landings, selected tour (16 objectives), species base markers (128-objective cap), and independent return. Tour order is nearest-next; source A* is not claimed globally shortest under all mechanics. Successful legs share their committed door state; failed legs cannot enable later legs.
- Results include per-target status/reasons, conditional evidence, source bake statistics, traced physical waypoints, interaction steps and blocking frontiers where available. Renderer overlays outbound/return paths on matching floors only. Printed instructions follow traced paths, not straight-line shortcuts. Declared door states recalculate immediately; other changed controls require Calculate.
- Cache keys include source/assets/world packs, adapter code, full request/capabilities/states. Exhausted-budget analyses bypass persistence. Existing bounded checksummed storage, worker cancellation, initialization watchdog, sandbox and narrow IPC remain intact.

## Explicit gaps / next increment

No general state-space search over levers, pressure plates, movers, special doors, teleports, water, attack triggers or timed puzzles. Mechanisms are indexed; dynamic puzzle transitions remain unsupported. No jump/climb/swim/levitate/lockpick RNG model. No complete geometric connectivity proof, alternative-path enumeration after motor rejection, globally shortest tour, or proof of real-dungeon impossibility. Actual dungeon analyses always carry `completeModel:false`; no failure is labeled Not Possible. The retained abstract complete-graph closure tests demonstrate proof semantics only, not completeness of real dungeons.

Ceilings: 750,000 potential nav cells, 80,000 triangles, 100,000 replay frames / 90 seconds, 1,200 frames per funnel segment. Exceeding the bake ceiling is an explicit analysis diagnostic; replay exhaustion is Unverified. Unknown flat trigger dimensions are conservatively treated as uncertain near their source positions. Fresh static geometry is assumed; live dynamic state, runtime packs/quests and combat remain unobserved. 3D, live overlays, gameplay automation and full puzzle-walkthrough controls remain disabled. See the verification report for exact results and next checks.

---

# Historical v0.3.0 / Stage 2A audit

## Current correctness and geometry pass

The existing Stage 1 Bay slice is preserved, with a validated static/fresh-layout 2D X-Ray added. No 3D renderer or mechanism/walkthrough solver has been started. The historical v0.2 audit below records the earlier stage and is superseded where noted here.

- **Population terminology:** `population.base` is all resolved species before Elite multiplication; `expanded` is all species after it. `targetBase` and `targetExpanded` concern only the selected species. Raw enemy candidates deliberately excluded by DFO's water/marker rules are separate from invalid/unresolved selections. Castle Hawkwing (766,88), level 30, classic DEX+MUDEX: 59 base / 177 expanded all-species; 25 random base / 75 expanded Dragonlings; 0 unresolved, 0 excluded. Calling 75 "base Dragonlings" was incorrect.
- **Online rules:** source onlineLane forces DEX and Meaner Monsters on; AlternateRandomEnemySelection is not forced and defaults false in settingsDefaults. Effective level remains a manual override that must match group/mentor rules in game. Existing tests retain all three table scenarios and both selection arms, with per-candidate resets and source seed rules.
- **Version/pack diagnostics:** `compatibility.mjs` and `source-contract.mjs` hash audited generator, RNG, settings, mesh, automap, physics and curated-record inputs. A changed/missing core file throws SOURCE_VERSION_MISMATCH before prediction. A differing whole-source fingerprint is explicitly unverified even if core signatures match. `inspectWorldData` inventories/hashes local WorldData/Patches/Pack files, including gzip pack filenames; the current 15 inputs contain no named RDB overrides. Town/location edits, browser active-pack state and layout pins remain unmodeled; results explicitly use original data + generated curated blocks. Map requests compare source/pack/asset fingerprints with the selected scan and reject changed inputs.
- **Safe caching:** `cache.mjs` uses schema + adapter-code hash + source fingerprint + full asset hashes + pack fingerprint + operation + complete request as key. Cache lives only under KaraOpsData/hunter-cache; ≤12 entries / 64MB, ≤16MB per result. Checksummed, atomically written entries; corrupt or mismatched entries regenerate. Errors and partial scans are not cached. Each new worker re-verifies content; hashing and parsing use the same in-memory ARENA2 snapshots. No metadata-only freshness shortcut is used.
- **Geometry:** `geometry.mjs` calls dungeonLocationFor and layoutDungeon, uses ARCH3D meshes through source arch3dSeams.patchSeams and dfMeshToModel, and applies the exact origin×placement matrices. Ordinary/action-model entries are indexed in source order; action doors are omitted from floor voting as in the game's automap and rendered as a separate at-rest overlay. No floor polygons or monster positions are fabricated.
- **Floor view:** direct source floorTriangles → deriveFloors → levelField → groupSheets/sheetOfStorey → storeyLinks → fieldOccupancy/floorPlan, with source boundarySegments/linkSegments, produces one-metre floor fill and boundary walls in world-local coordinates. Source stair/ramp joins are shown, not interpreted as validated navigation. All floors share bounds; SVG flips only Z for north-up display. Enemy coordinates remain untouched and are assigned by source nearest-storey height. Off-raster projections are flagged, not snapped.
- **Elite positions:** source expandEliteEnemies runs with at-rest mesh wall clearance and floor rays, exactly as its dungeonContext call site. Base and copy identity are retained. These are fresh, at-rest predictions, not moving/live actors. Coordinate tests independently rebuild a source collider and compare expanded positions.
- **Known source discrepancy:** dungeonContext supplies CPU normals, but automapModel.buildAutomapModel drops them. Source floorTriangles then falls back to an absolute geometric normal and includes ceilings. The KaraOps adapter restores authored row normals, without editing DFO. Tests compare direct normal-bearing host entries and report the source's normal-less output separately. Hawkwing: 13 authored storeys versus 16 through the normal-less index. This departure is visible in the map and report; no claim of pixel-identical unmodified game UI is made.
- **UI:** new XRay.tsx offers room/corridor floor fill, boundary walls, door overlays, stairs, floor/species selection, pan, wheel/button zoom, fit/entrance centering, tooltips and marker/record-list inspection. Copy pins can be toggled; co-located records are never spread visually. Failures hide the map and show diagnostics. 3D/secrets/walkthrough buttons stay disabled.

Automated real-data samples cover Hawkwing (8 blocks), Dunistair Pit (5), Cave of Morkucheus (14), and curated (810,50) (8). Exact results are in HUNTER_VERIFICATION_REPORT.md and release/verification/geometry-parity.json. Manual live automap comparison has not been performed. Broader Stage 1 gaps (wider world, active pack state, observation management) remain; static geometry validation does not complete those unrelated gates.

## Historical v0.2 audit (retained baseline)

Audit date: 2026-10-31, Europe/Bucharest. Existing KaraOps was extended in place; settings keys and portable storage were preserved. DFO and ARENA2 are read-only inputs. No asset files are distributed.

## Current gate

Stage 0 contracts and a working, bounded Stage 1 **Iliac Bay base-population vertical slice** are implemented. **Full Stage 1 acceptance is not claimed.** Wider-world support, complete active world-data mod parity, persistent content-addressed caching, additional observation management and live in-game comparisons remain open. Stages 2–4 remain disabled in the UI. Do not begin a general walkthrough solver before those foundations pass.

## Verified generation path

All paths below are relative to the selected `daggerfall-js-source` checkout. Reference Git HEAD: `ae0e0ab9fb3e8020a374070553e9756ee627cad4`. The DFO `src` and `vendor` Git status was clean during verification. Runtime provenance uses actual source contents, not Git HEAD alone.

| Step | Source / integration | What KaraOps currently does |
| --- | --- | --- |
| World data readers | `src/formats/mapsFile.js`, `woodsFile.js`, `blocksFile.js`, `arch3dFile.js` | Loads the six user-owned files through game readers. Fails on missing/corrupt inputs; never treats a parse failure as an impossible objective. |
| Boot repairs | `src/scenes/world.js` boot; `src/world/terrain/terrainHelper.js`; `src/systems/map/mapDirectory.js` | Applies coastal climate dilation and location-neighbourhood height smoothing to private in-memory readers in the game's order. |
| Location order | `src/scenes/world.js` locationIndex fill | Iterates region/location order, skips empty original region slots, uses longitude/latitude pixel conversion, retains Map insertion order. |
| Spawn/template | `src/world/spawnedDungeons.js`; `src/scenes/spawnGroundHost.js` | Reuses WORLD_SALT=1, band/keep rolls, main-story exclusion, spawnTemplates order (4,218 in these assets), pickTemplate and synthesized IDs, region, climate and elite flag. |
| Physical gates | `src/world/spawnGroundPlace.js`; `src/scenes/spawnStandHost.js` | Hash first, mapped-location occupancy, climate, dry plateau, all four Basic Roads byte arrays, Ether exclusion. Supports Bay pixels only, outside Cyrodiil. Lifespan is deliberately unknown, modeled as fresh eligibility with clocks=false. |
| Roads | `src/world/roadsProducer.js`, `src/world/road/pathData.js`; `vendor/roads-hazelnut/*Data.bytes` | Reads actual road/track/river/stream bytes (500,000 each); applies source pathFreePixel. No generated-road substitute. |
| Location to enter | `src/world/smallerDungeons.js` dungeonLocationFor({online:true}); `curatedSplice.js` | Exact online size draw, distinct medium interiors and curated splice. Whole quest instances, Hollows and open-zone halls are outside this scanner. |
| Curated blocks | `src/world/dungeon/curatedBlocks.js`, `curatedRecords.js`, `curatedInstall.js` | A thin reader adapter constructs source curatedBlockOf from original BLOCKS data. Tested against the actual world-data door, including real candidate (810,50), curated record 3. No editor-generated fixture appears in production. |
| Assembly | `src/world/dungeon/dungeonLayout.js`, `src/world/rdbLayout.js`, `src/world/meshReader.js` | Uses actual ARCH3D model conversion for static-door metadata, block placement, entrances, markers, water and overlap rules. Does not yet create a traversable mesh or floor map. |
| Population | `src/characters/dungeonEnemies.js` collectDungeonEnemies / dungeonPlace | Exact fixed/random, slot seed, water veto, effective-level input and explicit alternate/classic selection. Source marker/block/LoadID and dungeon-local metre coordinates retained. |
| Mod tables | `src/characters/encounterTableDoor.js`; `src/systems/enemyExpansion/dexTables.js`, `dexTableText.js`, `mudexTableText.js`, `dexEncounters.js` | Parses source tables in DEX then MUDEX order, adds defaults, resets selector per reconstruction, seeds selection from unknown2 XOR region<<8. Classic/custom names use source career/enemy database parsers. |
| Online assumptions | `src/systems/online/onlineLane.js`; `src/systems/modSettings.js` | Online lane forces DEX and Meaner Monsters on; DEX+MUDEX is default. Vanilla and DEX-only are clearly labeled comparison scenarios. Effective level and alternate selection are explicit manual inputs; no account/browser state is read. |
| Elite copies | `src/characters/dungeonEnemies.js` expandEliteEnemies; `src/scenes/dungeonContext.js` | Count = three records per original marker, matching source. Count and species tested. Copies are not independently rerolled. Collider-adjusted offsets are not calculated; pins show source base markers only. |
| Context changes | `src/scenes/dungeonContext.js` deep stops, wildHallFoes, champions, curated encounter systems | Fresh base population only. Suppressed/dead enemies, later encounter actors, quest spawns and live room state are not reconstructed. Champion/elite trait assignment and stats are outside the count view. |

## Coordinate and confidence contracts

- Bay scope: integer world map pixels X 0–999, Y 0–499; X increases east, Y increases south. Each tile spans 819.2 metres. Requests outside that scope are rejected, rather than silently aliased into Bay pixel IDs. Source hash/world-lane tests nevertheless cover negative/out-of-Bay coordinates.
- Layout: RDB_SIDE=51.2m. Block origin `(x*51.2, 0, z*51.2)`. RDB `(X,-Y,Z)*0.025` becomes local metres; marker world-local positions add block X/Z origin. Repeated blocks retain separate block indices/LoadIDs.
- The SVG is labeled **block placement, not a floor plan**, with real base marker projections across all heights and exact Y coordinates available in the table. No decorative corridors, inferred links or navigation lines are drawn.
- Results say `Fresh layout expectation`, live availability `unknown`, reachability `unknown`. No confidence percentage or current-spawn guarantee. The 40-minute foe respawn and separate 2/7/12-game-day location lifecycle are not converted into invented availability.
- Ranking uses predicted target count then straight-line center distance, with an alternative distance sort. Nearest town is a geometric fallback, explicitly not a validated fast-travel itinerary or farming rate.

## Architecture and portable runtime

- `src/main/hunter/engine.mjs`: read-only compatibility adapter and two-pass scan. Runtime imports use validated local `file:` URLs, never renderer-supplied module names. All source `.js`/`.json` and vendored road `.bytes` are fingerprinted, as are the six entire ARENA2 files. Data-derived assets stay outside ASAR/distributions.
- `worker.mjs`: Node worker_threads process context; source parsing/geometry/population does not run in Electron main or renderer. Fetch is disabled. Main can terminate immediately; every job gets a fresh module/selector context. Boundaries: radius≤50, ≤100 retained results, 120-second scan budget, 180-second job watchdog, 1GB V8 old-generation limit. Results/diagnostics label partial work and errors explicitly.
- `service.ts`: main-frame validated typed IPC, one active worker, cancellation, stale-message rejection, request bounds and narrow result-bound observation writes. Polling subscriptions are cleaned up when the component leaves. History is separate, atomically written to `hunter-history.json` beside settings, capped at 500 records and size/shape validated on read.
- `electron-builder.yml`: copies only KaraOps's own `.mjs` backend resources outside ASAR. Packaged worker uses Electron's embedded Node; no external Node, npm, dev server or command-execution bridge. Local DFO source remains an intentional runtime dependency for algorithms; proprietary data remains user-owned and external.
- `src/shared/hunterTypes.ts`: scan/provenance/population/observation contracts plus versioned DungeonAnalysisIR contracts for later geometry, actions, graph, state, route and proof. These types do not represent an implemented solver.

## Actions and solver audit for the next stages

`src/world/rdbLayout.js` carries model/flat action records, trigger flags and block-local next/previous links. `src/world/actionSystem.js` resolves links in a per-block namespace, with `nextOf` and `chainTargets`; preserve namespaces when blocks repeat. `src/systems/dungeon/dungeonSense.js` defines playerTriggers and isSecretMover: chain-target movable object, no direct applicable player trigger, still at start. A directly operable wall is not automatically a secret. `src/systems/dungeon/dungeonEcho.js` chainMovers walks effects without playing them.

`src/systems/automap/automapModel.js` and `automapFloors.js`, `src/ui/automap/automapSheet.js`, `src/ui/ink/inkDungeonGL.js`, `inkDungeonSolid.js` and `src/systems/wayOut.js` are the next geometry/routing entry points. No live ActionSystem is executed by KaraOps. No doors, keys, moving swept volumes, switch states, directed teleport destinations, stairs, water/ability constraints or collision connectivity are currently solved.

`reachability.mjs` is an isolated future proof-policy core for explicitly supplied directed graphs. Tests cover a fully disconnected goal and a 2/3 partial graph, cycles/directionality, missing graph nodes, unknown transitions/abilities, incomplete models and capped search. It is **not connected to BSA geometry**, not an actual dungeon walkthrough engine, and not exposed in production UI. Real dungeon impossibility remains unproved until geometry/action completeness can be established.

## Remaining Stage 1 work, in order

1. World-data pack / quest-registry parity audit and support (or explicit selectable audited pack scenarios); ensure source template ordering under all supported active packs.
2. Wider-world ground/trace, registry, TESA road layers, zone and quest/place exclusions. Use `test/world/worldWide/ww5World.mjs` as a reference, and verify world-lane IDs without Bay aliasing.
3. Bounded content-addressed cache and invalidation tests. Current fresh-worker loading avoids stale-cache errors but repeats ~1–3 seconds of initialization each job.
4. Observation deletion/clear management, clear timestamps and additional manual scenario comparisons. Existing bookmarks/visit counts and paths already persist.
5. User-controlled real-game location/population spot checks. Automated source parity is not live validation.
6. Then Stage 2 floor-based actual mesh visualization, Stage 3 action/collision state graph, and Stage 4 walkthroughs. Keep all their controls disabled until their own acceptance tests pass.
