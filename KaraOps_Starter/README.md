# KaraOps v0.8 — Elite Breach Orrery

Orrery Solver now supports **Elite Breach**, **Abyss Dungeon**, and seed-free manual gearing calibration. Generate the source-derived six clocks from breach seed + hall, or enter current hours to recalculate a moved puzzle. The compact run view names every handle, shows shortest forward/backward turns, tracks manual progress and checks depth-dependent fray limits.

Open **Orrery Solver** in the sidebar. **Generate fresh puzzle** is for untouched/reset puzzles; for existing turns, edit all current hours and used fray, then **Recalculate from current hours**. Every game interaction remains manual. Automatic live puzzle detection is unavailable.

Portable: `release/KaraOps-0.8.0-Portable.exe`. [Changelog, source audit, tests and limitations](docs/V08_VERIFICATION.md). Previous releases and user data are preserved.

The older patch files under files/ and the sibling Orrery project remain untouched reference material. Their CDP observer is not part of this release.

Existing Dungeon Hunter, source diagnostics, caches, 2D maps, navigation, Jackpot/Aurum analysis and opt-in telemetry receiver remain available under their documented limitations. DFO source and ARENA2 stay read-only. The Orrery itself does not require ARENA2 or a DFO checkout at runtime.

Build and test from KaraOps_Starter:

    npm.cmd run typecheck
    npm.cmd test
    npm.cmd run test:orrery:local
    npm.cmd run portable

The optional source-parity test requires the official source oracle described in docs/V08_VERIFICATION.md. The portable build creates a Windows x64 EXE only; there is no installer. User folder settings remain beside the EXE in KaraOpsData, while the new Orrery draft uses its own Electron-profile storage key.
