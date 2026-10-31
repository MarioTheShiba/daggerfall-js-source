# KaraOps Development Plan

## Phase 0 — Application skeleton (this ZIP)

- Desktop launches and navigates between five pages.
- Settings folder pickers work, paths persist after restart.
- Portable executable built on Windows; no installer, no startup registration, no auto-updates.
- No game traffic or DFO modifications.

## Phase 1 — Offline Dungeon Hunter

- Read local ARENA2 only; do not package it.
- Enumerate candidate world pixels using source-compatible generation, including path/ocean/climate/wild/TTL caveats.
- Choose exact dungeon templates and online layout sizes.
- Simulate actual enemy-marker population with DEX/MUDEX choices, player level and settings.
- Rank by predicted target mobileType count, elite copies, distance to fast-travel town.
- State 'predicted' vs 'confirmed', never invent live availability.
- Add small deterministic fixtures and unit tests; compare several game dungeons.

## Phase 2 — Passive Dragon Radar integration

- Reuse working locator logic without rewriting a tested algorithm.
- Opt-in and only attach to the existing debug interface, if permitted.
- Show connection and spawn states; never claim silence means a dud before reveal deadline.
- Keep dragon seed logic independent from dungeon logic.

## Phase 3 — Shared World Atlas

- Display local town and candidate coordinates using existing map files.
- Ranking by real travel distance when route calculation is available; otherwise disclose map-pixel distance.
- Show verified vs simulated sources and last-observed timestamps.

## Phase 4 — Usability and reliability

- Logs, diagnostics, config validation, version checks and export to CSV.
- Tray mode and optional alerts only after modules are stable.
- Graceful handling of missing files, upgraded game code, and disconnected DFO.
