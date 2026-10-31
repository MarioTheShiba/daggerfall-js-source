# KaraOps v0.5 — Tamriel-Wide Dungeon Hunter

**Status:** Bounded generated-dungeon searches now cover the source Tamriel theatres, preserving v0.4 maps and navigation. Geography is traced from your original ARENA2 files; the adapter uses source fit, ground, reserved places, Cyrodiil exclusion and reconstructed road regions. Search by signed world coordinates or a province preset; inspect Dragonling count, total population, purity, map/template identity and explicit coverage. **No exhaustive world search or live availability is claimed.** See [the implementation audit](docs/HUNTER_IMPLEMENTATION_AUDIT.md) and [verification report](docs/HUNTER_VERIFICATION_REPORT.md).

## What is implemented

- Existing Electron + React + TypeScript shell with an implemented Dungeon Hunter page.
- Bounded, cancellable two-pass scans in a Node-capable worker bundled with Electron; no external Node is required by the EXE.
- All ten source theatres exposed, including the Iliac Bay and nine provinces. Cyrodiil's ordinary generated spawns are excluded by the game's zone law. Coordinates accept negative values within the source world grid; map IDs use the source world lanes without Bay aliases.
- Province filtering/presets, Dragonling purity ranking and province/count/purity sorting. Every query reports visited pixels, theatre counts, eligible/simulated populations, errors, retained/truncated results and explicitly unexplored coverage. Radius remains bounded at 50 pixels; no World Jackpot Scanner is included.
- Exact source online sizing/curated-block reconstruction and classic/alternate encounter simulation under explicit vanilla, DEX or DEX+MUDEX scenarios.
- Ranked base target counts, nearest geometric town, coordinates, source/asset fingerprints, block overview and marker positions. The block overview is not a floor plan or traversal graph.
- Local bookmarks and manual observations, separate from existing settings. Live availability remains unknown; reachability is evaluated only under explicit offline assumptions.
- Actual 2D floor map: floor/species selection, pan, wheel/button zoom, entrance, doors at rest, stair/ramp joins, source enemy coordinates and click/list inspection. Authored normals and DFO seam repairs are retained; the source's normal-dropping automap index is explicitly diagnosed.
- Local bounded content-addressed scan/geometry/navigation cache. Source, mod-pack and ARENA2 content is checked on each job before reuse; navigation keys include capabilities and declared door states. Budget-exhausted analysis is not cached.
- Route to a marker, between markers, selected tour or selected species (base objectives); optional independently validated return. Multi-target ordering is a nearest-next heuristic, never claimed globally shortest. Configure ordinary door opening, declared Open-spell holder level and maximum drop. Manually declaring ordinary-door states recalculates immediately. Unknown live state is not inferred.
- Native folder picker for ARENA2 and a local DFO source checkout.
- Settings saved as JSON; Windows portable build keeps them in `KaraOpsData` **next to** the `.exe`.
- Narrow Electron preload bridge; no Node integration in the browser renderer; no automatic remote traffic.
- Electron Builder configured for **portable Windows x64 EXE only**. No installer.

## Build requirements (on your Windows PC)

- Node.js 22.12+ or a compatible maintained LTS version. Node.js 24 LTS is a reasonable choice.
- npm and Windows 10/11 x64.
- Internet access for the initial `npm install` (downloads Electron and development tools).

## Run in development

```powershell
cd path\to\KaraOps_Starter
npm install
npm run dev
```

After installing dependencies, run `npm test` for unit checks. Real-data parity tests and application smoke tests are separate commands described below.

## Produce a portable EXE

```powershell
npm run portable
```

Expected output: `release\KaraOps-0.5.0-Portable.exe`. Double-click it directly: **no installer**. The app creates `KaraOpsData\settings.json` alongside the EXE when folder choices are saved, and keeps its profile, Hunter history and bounded local cache there.

Current Windows x64 build and runtime results are recorded in [docs/HUNTER_VERIFICATION_REPORT.md](docs/HUNTER_VERIFICATION_REPORT.md). The earlier skeleton baseline is preserved in [docs/VALIDATION.md](docs/VALIDATION.md). The portable EXE needs Windows plus the selected DFO source and ARENA2 folders; it does not need installed Node/npm.

On PowerShell systems that block `npm.ps1`, use `npm.cmd`. If your terminal sets `ELECTRON_RUN_AS_NODE`, clear that variable before launching the development app:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm.cmd run dev
```

For v0.5 native desktop verification without remote debugging, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/native-hunter.ps1 -ExecutablePath release/KaraOps-0.5.0-Portable.exe` after configuring the actual folders. Add `-World` to verify signed High Rock coordinates and its real map. This operates only KaraOps through Windows UI Automation; let it finish without other keyboard interaction. Results/screenshots go to `release/verification`. Earlier Playwright/CDP drivers are retained as historical v0.4 tooling and were not used for v0.5.

## Folder structure

```text
src/main/index.ts       Electron window, settings persistence, limited IPC
src/preload/index.ts    Secure renderer bridge
src/shared/types.ts     Shared API and settings types
src/renderer/           React interface and styling
electron.vite.config.ts Electron/Vite bundling
electron-builder.yml    Portable Windows build target
docs/ROADMAP.md         Implementation milestones
```

## Scope and safety

- This app must remain a **separate companion**, not a patch to DFO's code or a game executable.
- No WebSocket interception, replay, injection or game automation in v0.1.
- Never bundle copyrighted ARENA2 game data, credentials, or account tokens.
- Be mindful of the game's terms: read-only does not imply server permission.

## Use Dungeon Hunter

Open Dungeon Hunter, click **Validate data**, enter your actual effective level and manual center (or choose a town), then click **Scan**. The online default is DEX+MUDEX; alternative profiles are comparisons, not detected live settings. Radius is capped at 50 tiles, with the best 100 matches retained. X increases east; map Y increases south. Select a result to see its source-generated blocks and target markers. **Save target** creates a bookmark; **Record visit** stores your manually entered observation with a timestamp and input provenance. Neither marks a dungeon currently alive.

Run `npm.cmd test`, `npm.cmd run test:hunter:local`, `npm.cmd run test:geometry:local`, `node --test tests/navigation-local.mjs`, `npm.cmd run test:world:local`, and `node --test tests/world-host-local.mjs`. Integration checks need the selected source checkout and ARENA2. GUI suites run sequentially. The native portable driver removes Node/npm from the child app's PATH.

The Castle Hawkwing regression at (766,88), effective level 30, DEX+MUDEX/classic selection is **25 resolved random Dragonlings before Elite expansion, 75 expanded Dragonlings**; all species total 59 before / 177 after expansion. Unresolved and deliberately excluded markers are separate counts. Earlier wording that called 75 the "base" population was incorrect.

Choose **Open 2D X-Ray** on a result. The floor selector uses DFO's derived storeys/sheets; wheel zoom keeps the cursor anchored and dragging pans. Coordinates remain in dungeon-local metres (+X east, +Z north, +Y up). Elite copies are off by default to reduce overlapping pins; enable them to inspect their computed source positions, or use the record list. Nothing is moved just to make a pin easier to see. A source-generated stair mark changes the displayed floor, not the game.

Run `npm.cmd run test:geometry:local` for real geometry/coordinate/automap parity cases in addition to the existing tests. The source contract is intentionally pinned to audited generator/geometry files; do not update signatures just to bypass a mismatch. Audit and rerun parity checks first.

Below the X-Ray, use **Calculate navigation** to analyze a species or choose a single/selected/between-marker goal. Set only capabilities you actually intend to assume. The Open-spell holder level defaults to 0 (none), and maximum safe drop defaults to 0m. Results identify supported door interactions and independently checked returns; route steps and destination buttons focus the corresponding floor. A green trace is a motor-validated walking route under the displayed assumptions. Unverified targets have reasons and, where available, a red blocking frontier; no invented walkthrough is shown.

Run `node --test tests/navigation-local.mjs` for real source-motor, action-chain and navigation checks. Run desktop/portable GUI suites sequentially. See [the navigation continuation checkpoint](docs/NAVIGATION_NEXT.md) for concrete remaining work and reproducible cases.

Choose **Jump search center to province**, retain a radius up to 50, select the province filter or any theatre, then Scan. Purity retention is chosen before scanning; sorting reorders the retained list. Wider-world towns are not indexed for nearest-town directions, so no Bay town is misleadingly recommended across the continent. The ten required ARENA2 files are the previous six data files plus ART_PAL.COL, MAP.PAL, TMAP00I0.IMG and TAMRIEL2.IMG. All remain external/read-only.

Remaining broader Hunter work includes exhaustive scheduling, active browser pack/quest/day-state parity and optional user-controlled field comparisons. Ordinary generated spawns are the scope; static MAPS dungeons, countryside lairs, abyss/zone halls and special instances are not separate search families here. Mechanism relationships are indexed; the full puzzle-state/teleporter/mover solver remains unfinished. 3D and live overlays stay disabled. Real navigation analyses remain incomplete, so **Not Possible is unavailable** for real dungeons.
