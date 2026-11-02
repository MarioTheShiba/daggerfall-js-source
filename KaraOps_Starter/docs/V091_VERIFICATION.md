# v0.9.1 — local HTTP game-target connection fix

The user's running DFO debugger at port 9222 returned HTTP 200 and one game page at `http://127.0.0.1:47831/play/index.html`, plus worker targets. v0.9 recognized only the official HTTPS and `dagger://game` page origins, so it rejected this legitimate local HTTP launch mode. Its generic catch then incorrectly suggested starting the debugger.

The fix accepts loopback HTTP pages only at `/play/index.html`, with no embedded credentials. The game HTTP port is independent of the debugging port: **keep the observer port at 9222**. Remote HTTP hosts, launcher/root pages, workers, title-only matches and non-loopback debugger sockets remain rejected. Errors now distinguish an unavailable endpoint, invalid/oversized target list, HTTP failure, unsupported page, multiple game pages and debugger WebSocket failure, without exposing raw URLs or credentials.

Verification (2026-11-02):

- Typecheck and portable Windows x64 build passed.
- **70 automated tests passed:** 66 unit/contract tests, plus four retained source/oracle/transport tests. New regression explicitly covers the observed HTTP game origin, IPv4/IPv6/localhost, and rejected remote/launcher/credential/worker variants.
- Packaged observer UI passed with a real local WebSocket fixture advertising an HTTP game page, including accepted-turn recalculation, stale/mismatch/disconnect withholding and manual fallback.
- The production observer connected to the user's actual running port-9222 debugger and reached `watching`.
- **The actual v0.9.1 portable EXE also connected successfully through native Windows UI Automation**, after explicit consent, and disconnected cleanly. Isolated copied folder settings stayed byte-identical; the child had no external Node/npm runtime on PATH. Evidence: ignored `release/verification/v091/native/connection.json`.
- No new actual dungeon socket was observed during these brief checks. Real debugger connectivity is now demonstrated; actual puzzle-state/runtime correctness still awaits a user-operated dungeon entry/rejoin. No game action or automatic rejoin was performed.
- The 53 real-data engine tests passed in v0.9 and were not rerun for this target-filter-only fix. Generation, navigation and ARENA2 handling are unchanged.

Artifact: `C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.9.1-Portable.exe`

Size: **110,782,737 bytes**. SHA-256: **`87416A385C6DC4773932134F58F5E44B9ED52B771B4B856827A0205D386DE253`**.

Previous executables and protected data are preserved. DFO source and original assets remain read-only. Start the new EXE, open Orrery Solver → Optional DFO connection, authorize/connect on 9222 before entering/rejoining the dungeon, then enable Follow observed Elite puzzle. A game restart is unnecessary when its debugger is already responding.
