# KaraOps v0.9.1 — local HTTP game connection fix

Fixes connection to DFO launched at a loopback HTTP `/play/index.html` address. Verified the new portable EXE connects to the user's running debugger on **9222**. [Verification and usage](docs/V091_VERIFICATION.md). Portable: `release/KaraOps-0.9.1-Portable.exe`.

# KaraOps v0.9 — opt-in Orrery observation

Adds a read-only port-9222 observer for Elite Breach seed, hall, active decree ranks and accepted clock state. Open **Orrery Solver → Optional DFO connection**, authorize/connect before entering or rejoining the room, then enable **Follow observed Elite puzzle**. You operate every game control manually.

Abyss slot URL detection and all manual solvers remain available. Source mismatch, stale state and disconnects withhold automatic instructions. Actual DFO runtime validation is still pending: the local endpoint was unavailable during this session.

Portable: release/KaraOps-0.9.0-Portable.exe. See [v0.9 research, usage and verification](docs/V09_VERIFICATION.md). The v0.8 record below is historical; its no-CDP limitation was superseded by the user’s explicit v0.9 authorization.

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
