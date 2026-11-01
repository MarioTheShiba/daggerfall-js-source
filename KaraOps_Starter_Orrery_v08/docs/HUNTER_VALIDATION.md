# Hunter validation and acceptance matrix

All tests should run on the local, current DFO checkout with user-owned ARENA2 files. Do **not** commit original ARENA2 files, secrets, WebSocket frames or client account state. Use synthetic fixtures in public tests; use private local game data for integration checks.

## Engine parity

- [ ] Hash and keep lanes: compare `spawnRoll`, `spawnKept`, `isEliteSpawn`, `spawnsDungeon` against source on hundreds of deterministic map pixels, including negative/out-of-Bay coordinates.
- [ ] Every spawn exclusion: oceans, undry coasts, road/river pixels, mapped/registered places, open zone, Ether Sea and zone-specific conditions. Compare with `spawnGroundPlace` or `_locationToBuild` oracle for selected test pixels.
- [ ] Spawn template order and identity match **source** `spawnTemplates`, `pickTemplate` and `spawnedMapId`. Include a regression for off-Bay world lanes.
- [ ] Online dungeon sizing and curated splice match `dungeonLocationFor`; compare block names, starting block and marker count for multiple actual candidates.
- [ ] `collectDungeonEnemies` parity for both classic and alternate monster generation, including effective player level and fixed/random markers, seeded flags, underwater veto and original order.
- [ ] DEX-only / vanilla / DEX+MUDEX scenario tests. Confirm DEX+MUDEX Dragon's Den upper-level encounter slots `[34,22,24,145,16,9]` in the checked source. Ensure scenario isolation is order independent.
- [ ] Elite multiplier: 3 total records per base enemy where source allows; count mobileType 34 correctly and do not accidentally multiply unique markers into fake independent spawn rolls.
- [ ] Compare a local actual DFO oracle dungeon population for at least 5 candidate locations, including one with Dragonling, at the chosen effective level and mod profile. Report each mismatch, don't silently waive failures.
- [ ] Record/version mismatch changes status to `unverified`, not `confirmed`. All confidence and source explanations trace to actual calculations.

## UX / performance

- [ ] Scan from manual world center, nearby town and region; search by `Dragonling` and another species (e.g. Lich). No plausible fake results.
- [ ] Range, sort, minimum predicted count and `Elite only` behave predictably, with 0-result explanation.
- [ ] Copy world tile, nearest town and directions. Verify x/y orientation against known DFO travel convention.
- [ ] Map pins are correctly scaled and selectable. Interior points include block coordinates and distinguish fixed/random sources.
- [ ] Search reports `pixels visited`, `hash candidates`, `world-gated candidates`, `fully simulated`, and elapsed time. Cancel mid-scan and recover without stale results.
- [ ] Run a substantial region scan on the user's PC; profile memory/time and optimize hot spots without removing validation gates.
- [ ] Cache hit speeds repeat search; version/asset/mod/level changes invalidate relevant layers, not unrelated data. Corrupt cache gracefully regenerates.
- [ ] Persist bookmarks and visited/clear timestamps in adjacent `KaraOpsData`; tested across EXE relocation. Clear observations without deleting settings.
- [ ] Show labels for source version, ARENA2 data presence, active mod assumptions and unknown live freshness. No exaggerated probability claims.

## Electron / portable

- [ ] `npm test` and `npm run typecheck` pass; run project-specific new integration tests too.
- [ ] `npm run portable` produces a **Windows x64 portable EXE only**, no installer, requires no external Node/npm at runtime.
- [ ] Packaged EXE can read source and ARENA2 folders through validated paths, and can scan in a worker without freezing UI. No accidental reliance on dev server or transient `file://` import paths.
- [ ] Existing folder settings, page navigation, profile persistence, context isolation, sandbox, restrictive CSP and narrow preload bridge still work.
- [ ] Do not expose dangerous filesystem/process APIs to renderer; validate all IPC args, scan sizes and cancellation tokens.
- [ ] No packet injection, login scraping, automatic in-game movement, remote scanning or automatic broadcast. Default functionality does not cause outbound traffic.
- [ ] Report the actual final EXE file path, DFO source fingerprint, test counts and known limitations.

## Live validation (manual, optional, user-controlled)

1. Search for Dragonling (34), choose a predicted high-count Elite Dungeon.
2. Verify the dungeon location exists and is accessible in the actual game. Record mismatches and approximate lifecycle status.
3. Enter at the same effective level and mod settings; count target types including triple copies and compare to prediction. Mark manually cleared if appropriate.
4. Repeat for at least 3 different dungeon types/locations and revisit after a known legitimate respawn to distinguish spawn life vs foe respawn.
5. Do not mark tool `accurate` globally from one successful result. Record a confusion/mismatch table and a clear list of unresolved state-dependent differences.
