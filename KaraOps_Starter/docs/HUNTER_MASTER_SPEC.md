# KaraOps — Dungeon Hunter: Maximum-Capability Engineering Specification

**Mission:** turn a verified Windows portable KaraOps v0.1 shell into an offline-first, read-only **enemy-location intelligence system**. It must guide the user from *target creature* → *candidate world pixel* → *real dungeon template* → *online-generated interior* → *predicted enemies* → *travel directions*, with explicit certainty and freshness distinctions. Prioritize accuracy, reproducibility and UX over ungrounded feature quantity.

## Source-verified facts (current checked DFO source; re-verify against the user's local checkout)

- `src/world/spawnedDungeons.js`: `WORLD_SALT=1`, chance band 30% ordinary + 10% elite, `SPAWN_KEEP=.75`, `isEliteSpawn`, `spawnsDungeon`, `pickTemplate`, `spawnTemplates`, spawn IDs and cloning. These are the *initial roll*, not sufficient proof a dungeon physically stands: climate, dry ground, paths, map occupancy, open-zone and Ether Sea exclusions, etc. apply via `spawnGroundPlace.js` and `spawnStandHost.js`.
- Spawn **lifetime** is distinct from enemy **respawn**. Spawn ledger tracks 2 in-game days after clearance, 7 in-game days overall, then 12 in-game days of absence before the same deterministic dungeon is reborn; these depend on observed state and must not be assumed known for remote pixels. `src/systems/dungeon/dungeonRespawn.js` has 40-minute elite enemy/loot respawn; this is NOT the same thing as the spawn's 2/7/12 game-day lifecycle. Avoid conflating.
- `src/world/smallerDungeons.js` builds online-sized dungeons, and `src/world/dungeon/dungeonLayout.js` uses the real `BLOCKS.BSA` records. Use `dungeonLocationFor` and the real entry/mount path, including `curatedLocation`, rather than naively counting original MAPS.BSA blocks.
- `src/characters/dungeonEnemies.js`: `collectDungeonEnemies` uses `locationId`, `dungeonType`, `dungeonPlace` (header `unknown2` and region), **effective** player level and `AlternateRandomEnemySelection`; fixed and random flat markers are not interchangeable. `expandEliteEnemies` duplicates each original threefold (subject to placement constraints) while preserving species. Dungeon context can further filter/alter population (e.g. deep-cleared stops, wild halls), so inspect `src/scenes/dungeonContext.js` and account for deviations.
- `src/characters/encounterTableDoor.js`, `src/systems/enemyExpansion/dexEncounters.js`, `dexTableText.js`, `mudexTableText.js` change the tables. Both DEX and Meaner Monsters appear default-enabled in the checked code; **confirm locally**. DEX chooses dungeon tables using `unknown2 ^ (region << 8)`; MUDEX adds multiple type-specific choices, so a plain vanilla lookup is wrong.
- With *DEX + MUDEX* in the checked source, the default **Dragon's Den** type-14 table's upper-level six slots are `[34,22,24,145,16,9]`. Dragonling `34` is one of these six. MUDEX's natural-cave and mine animal tables also contain a Dragonling in the upper band, but those are just one table among several for those types. Plain *vanilla* and *DEX-only* tables differ! Fixed enemy markers may also provide targets even when the random table does not.
- The October 11 DFO `DRAGON-SOUL` change makes ordinary Dragonling mobileType **34** eligible for the valuable SoulBound -5000 enchanting effect; don't confuse it with quest-only Dragonling_Alternate **40**. It does not automatically make all drop/soul-gem shop values identical.

Useful verified source paths, all relative to the selected DFO source checkout:
```
src/world/spawnedDungeons.js
src/world/spawnGroundPlace.js
src/scenes/spawnStandHost.js
src/scenes/spawnGroundHost.js
src/world/worldWide/worldGrid.js
src/world/smallerDungeons.js
src/world/dungeon/dungeonLayout.js
src/characters/dungeonEnemies.js
src/characters/encounterTables.js
src/characters/encounterTableDoor.js
src/systems/enemyExpansion/dexEncounters.js
src/systems/enemyExpansion/dexTables.js
src/systems/enemyExpansion/dexTableText.js
src/systems/enemyExpansion/mudexTableText.js
src/systems/enemyExpansion/dexInstall.js
src/scenes/dungeonContext.js
src/systems/dungeon/dungeonRespawn.js
src/systems/loot/lootScry.js
test/world/worldWide/ww5World.mjs
tools/climbDungeonProbe.mjs
```

## 1. User journey (the nonnegotiable vertical slice)

1. Launch **portable `KaraOps.exe`**. Existing settings still point to user-owned `ARENA2` and local DFO source folders. Validate required map and block resources and display actionable missing-file messages.
2. Open **Dungeon Hunter**. Select `Dragonling (34)` or any other known encounter mobileType; specify user level/effective-level context (or an explicitly labelled manual override), `Elite only`, and search center from manually entered world `(px,py)` or a chosen town. No guessing that live player coordinates are available. Choose radius and province/region.
3. Click **Scan**. Show `Candidate pixels → Eligible dungeons → Simulated dungeons`, elapsed time and a Cancel button. Do not block Electron UI during scan. Support no-results and partial-results explanations.
4. Show ranked real results. Each row gives dungeon name, type, world tile, elite marker count, target spawn count, active-rule scenario, availability state (`unknown`, `seen active`, `seen expired`, etc., where legitimately observed), nearest travel town, tile offset and reason it ranked.
5. Select a result. Show template / map ID / source mod assumptions / breakdown of fixed vs random targets; 2D interior block overview with target enemy markers and floors/coordinates where deterministically resolvable. Allow Copy Tile, Copy Directions and Save Target to a local watchlist.
6. Mark a location visited, count actual enemy spawns found, and record a timestamp. Use that to validate predictions and recalibrate travel/clear efficiency. Don't claim automatic remote server-state knowledge.

## 2. Architecture: strict separation

```
React renderer (no Node, no filesystem, untrusted input)
  ↓ validated, typed preload API
Electron main (settings, validation, requests, progress, cancellation)
  ↓ worker / utility process (Node-capable, no network necessary)
Hunters:
  world-index → spawn-filter → template resolver → layout loader → enemy simulator → ranker
  ↘ cache / diagnostics / user observation log
```

Preserve v0.1's secure BrowserWindow/preload IPC pattern. Do not add a broad `runCommand`, `readAnyFile` or `exec` IPC endpoint. Narrow methods like `hunter:validate`, `hunter:scanStart`, `hunter:scanCancel`, `hunter:results`, and event streams with clean subscription/unsubscription are fine. Validate path roots and args; throttle progress; no UI setState updates on every scanned pixel. Keep source/game data outside ASAR. If a DFO source module is browser-oriented, create a well-documented **thin pure compatibility adapter** or import appropriate already-pure DFO modules, and verify game parity with tests. Never silently fork critical random-number algorithms.

For an installed portable Electron app, an external `node` binary cannot be assumed. Use a tested packaged Electron Node-capable subprocess or worker (verify behavior in the actual EXE). Keep all cache/settings inside `KaraOpsData`, with atomic writes and a bounded cache. Avoid storing client tokens, raw chat, WebSocket payloads or account secrets.

## 3. Two-pass search algorithm

### Pass A — global/region fast candidate selection
- Determine bounded map pixels for selected center/radius/region with the exact DFO world coordinate convention. Use world-lane / province-aware boundaries (outside Bay coordinates may be negative or exceed 999).
- Call game-equivalent `isEliteSpawn(WORLD_SALT, px, py)` and `spawnsDungeon`, then apply all actual legality rules: location occupancy, roads/trails/rivers, dry elevation, ocean climate, Ether Sea, PvP/open-zone and quest/registry place exclusions; do not label hash-only candidates valid.
- Resolve template using the **exact current spawnTemplates list order** and deterministic `pickTemplate`; order is critical and relies on valid map assets and same data version. Respect separate Bay vs world-lane map IDs.
- For every candidate, classify dungeon type. Filter obviously impossible random tables early, **without discarding fixed-marker possibilities** unless those have been checked.
- Stream candidate counts and allow pause/cancel; bound area and time. Full-world mode only if safely sharded/cancellable.

### Pass B — expensive exact-ish population reconstruction
- Build the location DFO would truly enter: exact `synthesizeDungeonLocation`, online dungeon size, curated splice, actual `BLOCKS.BSA` RDB marker list. Some layout functions may require `ARCH3D.BSA`/model geometry; load user-owned data as required, not samples.
- Apply the correct active mod and settings state: DEX, MUDEX, varied dungeon monsters (`AlternateRandomEnemySelection`), character effective level and any dungeon-context reshaping. Treat mismatched source/game versions as uncertain.
- Run the same `collectDungeonEnemies` logic with the same seed and selector initialization. Include fixed record-16 markers; random record-15 markers; underwater veto; enemy expand-three for elite; skip non-enemy flats correctly. If encounter selectors preserve global state, isolate or reset state deterministically for each dungeon and test order independence.
- Produce a **population record** by species (mobile id), source marker, origin block, coordinates, fixed/random, number of copies, mod scenario, and meaningful discrepancies. Split exact deterministic outputs and uncertain/special spawns.
- Interior map: render per-block geometry in a restrained 2D map, place target markers on corresponding block/floor. A navigation line should be drawn ONLY if a pathfinding graph actually proves door/hall connectivity; otherwise show pins rather than invent routes. Later optionally add real collider-powered shortest-path/hazard map.

## 4. Advanced capability roadmap (implement only when data permits)

- **Monster-first search:** target one species or combinations, e.g. Dragonling + Daedra Lord; include/exclude lists and multi-mob weights. Enum follows active DEX bestiary, not only vanilla 0–42.
- **Farming score:** configurable weight for predicted population, observed alive status, distance from current town, viable travel path, interior accessibility and user-measured run duration. Prefer `predicted targets / measured total minutes` over invented gold/hour or soul/hour figures. Provide score breakdown and alternate sorts.
- **Source-level oracle:** each candidate has a debug `Explain` panel with world coordinates, spawn roll, keep roll, template index, map ID, mod selection, population seed, level and proof of rules. Implement reproducible one-tile CLI inspector for parity tests.
- **Triangulation + live navigation:** existing world navigation and town-distance logic can be reused from the successful Dragon Locator, but keep Dragon Radar isolated. A later **opt-in**, read-only localhost CDP bridge may update current position *only when it's legitimately present in already-received game state*. If unavailable, require manual location entry. Never access secret or hidden account data.
- **Search cache & delta updates:** content-addressed pre-index for static world/template data, separate from volatile observation log. Invalidate by DFO source commit/version, ARENA2 signatures, mod switches, effective level and scanner schema. Permit incremental reranks when level/location changes without recomputing immutable terrain.
- **My findings / cooldown memory:** local watchlist and visited/cleared history, manual time markers, 40-minute elite foe-respawn reminder only when a trustworthy clear stamp is known, and a separate uncertain spawn-lifecycle status (2/7/12 game-day logic). Do not infer remote state from world-map deterministic seed.
- **Export & clipboard:** JSON/CSV for predictions (including provenance); one-click tile/direction copy; no automatic global-chat broadcast or game controls.
- **Reliability UX:** status banners for `Confirmed locally observed`, `Predicted from reproducible inputs`, `Possible under selected mod scenario`, `Unverified live availability`, and `Invalid/mismatched data`. Use separate fields for `spawn eligible`, `species prediction`, `live available` instead of a single misleading 99% confidence value.
- **High-performance scan:** chunk/partition terrain, hash-only first, memoized dry/road filters, precompute per-template metadata, worker progress/abort, optional viewport-first top-N refinement and multi-tier cache. Never parse all `BLOCKS.BSA` models for every discarded world pixel.

## 5. UI design

Match existing KaraOps aged-gold-on-charcoal Dwemer-inspired design. The Hunter layout should show:

- Left filter rail (enemy search, tier, region/town/radius, player effective level, mod scenario, min target count, sort).
- Center results as sortable, dense but readable list with tile and tier; optional toggled world map with precise pins.
- Right details area showing target count broken down by marker/copies, other high-value encounters, source confidence and fast-travel directions.
- Secondary **Interior** tab with 2D block/floor views, target markers, per-marker names/counts. **Explain** tab with math and source provenance. **History** tab with manually recorded outcomes.
- Progress bar with meaningful counts + Cancel, no fake results; badge/log wording must distinguish `planned` from `implemented` and `predicted` from `seen`.

No remote visual assets; bundle only original app visuals and styling. Keep UI readable at 1366×768 and 1920×1080, with scrolling and graceful empty/error states.

## 6. Data models (illustrative; refine in code)

```
ScanRequest: { speciesIds[], tier, worldCenter, radiusTiles, region?, maxResults,
               effectiveLevel, modProfile, minPredicted, sort }
Candidate: { px, py, worldLane, templateId, dungeonType, mapId, spawnRule,
             gatesPassed[], gatesUnknown[], sourceFingerprint }
Prediction: { candidate, countsBySpecies, fixedMarkers, randomMarkers,
              copies, interiorMarkerPins, assumptions, uncertaintyReasons,
              liveAvailability, nearbyTowns[], scoreComponents }
Observation: { worldPixelKey, character?, observedAt, observedEnemies[],
               visited?, clearedAt?, userNotes? }
```

Opaque values and errors should be validated for size, types and path safety before crossing IPC. No backend `eval`, remote URLs or arbitrary script execution from renderer requests.

## 7. Correctness and confidence rules

1. **Never label a candidate `confirmed` merely because a hash matched.** Spawn gates, source parity and live lifespan are separate facts.
2. **Never label a target `guaranteed now`** without live, authorized evidence of current population. A deterministic fresh population is not a live census.
3. **Never silently use vanilla tables** when DEX/MUDEX can change them. No invented percent confidence; use actual rule distributions or scenario deltas.
4. **Never hardcode user level or assume settings**. The current user is a high-level necromancer, but these are variable inputs.
5. **Never equate Dragonling_Alternate (40) with Dragonling (34)**. Default soul-hunting target is 34.
6. **Never say nearest town is valid fast-travel** if map/travel logic says otherwise; show geometric fallback explicitly.
7. **Never auto-start global scans**. User initiation, progress, abort and bounded resource consumption are mandatory.
8. **Never replace the verified source tree** or lose existing adjacent `KaraOpsData` portable persistence.

## 8. Packaging / repo integration

Work in the user's current KaraOps checkout. Keep modules isolated (e.g. `src/main/hunter`, `src/shared/hunterTypes`, `src/renderer/src/hunter`) and add tests appropriate to the actual project layout. Persist `hunter` settings without resetting existing arena2/source settings; migrate settings schema safely. Preserve portable target only (no NSIS, MSI, updater), no new outbound traffic by default. Typecheck, test, package, launch and validate actual release EXE; report changed files, measured performance, current blockers and exact artifact path on the user's computer.

## 9. Future work not part of first acceptance

- Special instance content / Abyss Dungeon / Elite Breach entrance search (not equivalent to spawned Elite Dungeons).
- Live player location from already-received frames (requires explicit data provenance and opt-in).
- Automatic interior routes through every door/lock/hazard, unless the actual dungeon graph is available and validated.
- Loot roll prediction / pre-revealing private server entropy (not possible from deterministic map seed alone and not an accepted design goal).
