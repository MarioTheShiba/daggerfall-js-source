# KaraOps v0.9 — opt-in Orrery socket observation

Date: 2026-11-02 (Europe/Bucharest).

## Implemented

The user explicitly authorized extending the sibling Abyss CDP observer approach for v0.9. This supersedes v0.8's exclusion of debugging-port observation for this narrowly scoped feature. DFO source, its client, original ARENA2, the sibling project, previous executables and original user data remain untouched.

- An explicit, off-by-default local observer connects to the configured loopback debugging port (default 9222), after consent. Narrow sender-validated preload IPC exposes only start/stop/status. No observer port/state is automatically restored on startup.
- The debugger must expose exactly one supported game page: official `dagger://game` or the HTTPS `daggerfalljs.dev` origin. DFO's separate `dagger://launcher` is excluded; title-only matches are rejected. The debugger WebSocket itself must be loopback, on the chosen port and under `/devtools/page/`.
- Only `Network.enable` is issued to CDP. The integration does not evaluate scripts, recover browser history, read game memory, request stored messages, send game WebSocket messages, refresh game state or operate puzzle handles.
- Newly created `/room/eg:<16hex>` and `/room/sd:<slot>[.<owner>]` sockets are identified. Only received Elite messages on the selected request ID are considered. Outgoing frames, headers, receipts, account/company records and unrelated messages are ignored and never retained in status/logs.
- Elite snapshots provide breach seed, current hall, law version, active decree ID/rank pairs, Fraying rank, stage/wake, six accepted hours and used fray. Fraying is decree 19. `nx` is the next circle's decrees and is deliberately not used as the current decree set.
- “Follow observed Elite puzzle” populates the existing solver and recalculates from accepted clock snapshots. Manual mutation and press confirmations are disabled while following, avoiding double-counting. Observed inputs are ephemeral and do not overwrite the saved manual draft.
- Room changes, hall/wake transitions, source-law mismatch, ended breaches, malformed/oversized state, disconnects and five-second stale snapshots withhold automatic instructions. Full decree state is required after a circle change. Game reconnection is user-operated; the tool does not force a rejoin or send a refresh command.
- Abyss URL slot detection remains available, with an explicit warning that its current clocks are not observed. The user enters the displayed slot and confirms whether fresh generation is appropriate. All v0.8 manual solving, partial recalculation, calibration and saved drafts remain available.

The independent v0.7 companion telemetry receiver is unchanged. This CDP implementation is **not** represented as an upstream supported telemetry publisher.

## Socket/source research

The current official repository was checked through its GitHub files in this session. Relevant official blob SHAs:

| File | Git blob |
| --- | --- |
| `src/net/eliteGates/egBrain.js` | `39d2482cc64d5b743d4d786aa15e48beca3e633b` |
| `src/net/eliteGates/egBodies.js` | `fbc835a8acf4ecd3e98eb0a77fb0096724b22ee4` |
| `src/net/eliteGates/egLaw.js` | `ba78c7c29e7d9be2658b7095b7e761f617fe142d` |

The selected local read-only checkout additionally supplied `src/net/wire.js`, `src/net/online.js`, `src/scenes/eliteGates/egClient.js`, `server/src/index.js` and `app/main.cjs` for end-to-end tracing:

1. The server serializes flat JSON as `{t:'eg', ...word}`. Admission sends `egStateOf(B, now)` and the full fight state. The client validates these through `validEgOut` and delivers them to `onEg` for the current Elite room.
2. `egStateOf` sends `k:'st'`, `b`, `seed`, `egv`, `h`, `sg`, `hw`, and `dc:[[id,rank], ...]`. `egStageWord` sends hall/stage/wake updates as `k:'sg'`.
3. `egFightState` sends periodic `k:'efs'` with `h`, `wk`, and `pg`. For Athenaeums the relay sets `pg.obj='orrery'`, `pg.st` to its six hours (0–11), and `pg.f` to current fray. The scene's `objs.orr` derives from that same array.
4. The v0.8 pinned law-10 generator remains unchanged. Only matching law 10 can automatically predict targets. A matching law number is a compatibility check, not a cryptographic assertion that an arbitrary client/server has identical code; output remains an observed-state/local-source prediction.

Reference: [official egBrain](https://github.com/Lattymoy/daggerfall-js-source/blob/main/src/net/eliteGates/egBrain.js), [egBodies](https://github.com/Lattymoy/daggerfall-js-source/blob/main/src/net/eliteGates/egBodies.js), [egLaw](https://github.com/Lattymoy/daggerfall-js-source/blob/main/src/net/eliteGates/egLaw.js). Original pure-generator provenance remains in ORRERY_SOURCE_BLOBS.json.

## How to use

1. Start the actual DFO client with `--remote-debugging-port=9222 --remote-debugging-address=127.0.0.1`.
2. In KaraOps, open **Orrery Solver → Optional DFO connection**, select the port, check the consent box and **Connect observer**.
3. Connect before entering/rejoining the Abyss or Elite room. An already open game socket is not discovered retroactively; perform any rejoin manually in the game.
4. For Elite, enable **Follow observed Elite puzzle**. A compatible full state and active Orrery clock snapshot are required. The tool displays hall/decree information and updates instructions after accepted turns. Operate all game controls yourself.
5. Disconnect or uncheck following to return to manual solving. Recalculate before following a manual route again. Automatic instructions are withheld whenever the observation is stale, unsupported or incomplete.

Do not interpret an unavailable connection or missing snapshot as proof that the puzzle is absent or impossible.

## Verification

**122 automated tests passed, zero failures/skips:** 65 unit/contract tests; 53 retained real-source/ARENA2 Hunter, geometry, navigation, world and Jackpot regressions; 3 retained independent Orrery source tests; 1 new end-to-end source/transport test.

- New unit cases cover exact room parsing; privacy/allowlisting; source/hall/wake/circle isolation; freshness (including a zero-origin monotonic clock); bad states and duplicate decrees; launcher/title/remote-debugger rejection; explicit start/stop, handshake command restriction and ambiguous targets.
- The transport test uses the **actual full DFO `egStateOf`, `egStageWord` and `egFightState` producers**, an isolated real local WebSocket CDP fixture and the production observer. It replays a source-derived puzzle to Concord, then tests a reset and transition. The only command received by the fixture is `Network.enable`.
- Packaged UI tests against that local fixture passed consent/off-by-default startup, Hall 8/Fraying II detection, accepted-turn recalculation, law-11 refusal, stale-state removal, disconnect removal and manual Abyss fallback. This is fixture validation, not a connection to the real game. Evidence: ignored `release/verification/v09/observer-ui/`.
- Retained packaged UI checks passed Elite/Abyss generation, Hall 103, manual calibration, partial recalculation, fray checks and saved-draft reload. Evidence: `release/verification/v09/manual-ui/`.
- Typecheck and portable Windows x64 build passed. Native portable validation and final binary identity are recorded in the final checkpoint below.
- The real local port-9222 probe could not connect, both within the sandbox and with the authorized external execution. No actual DFO puzzle snapshot was obtained. **Real-game detection and accepted-turn runtime behavior remain unverified.** No game was launched, rejoined or automated to manufacture validation.

Commands:

```powershell
npm.cmd run typecheck
npm.cmd test
node --test tests/orrery-source-local.mjs tests/orrery-observer-local.mjs
node --test tests/hunter-local.mjs tests/geometry-local.mjs tests/navigation-local.mjs tests/world-local.mjs tests/world-host-local.mjs tests/jackpot-local.mjs tests/navigation-v07-local.mjs
npm.cmd run portable
node tests/orrery-observer-electron.mjs
$env:KARAOPS_TEST_EVIDENCE='release/verification/v09/manual-ui'
node tests/orrery-electron.mjs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/native-orrery.ps1 -ExecutablePath <isolated-exe> -ExpectedVersion 0.9.0 -EvidenceDir release/verification/v09/native-final
```

## Limitations and next validation

- A new matching room connection must be observed; existing sockets, binary/unsupported framing and a missing full state cannot be reconstructed. No runtime introspection fallback is attempted.
- Exactly one supported game target is required. Custom origins/clients need a separately reviewed target rule. Multiple actual game windows are not silently resolved to one.
- A socket identifies received room state; this does not certify player participation, source fingerprints, server correctness or deployment version beyond the stated source-law check.
- No gameplay actions are sent. All original solver limitations apply, including reading plaques for seed-free calibration and manually accounting for refused/missed turns when not following observed state.
- Next practical gate is a user-run DFO session with the endpoint available: connect before entering, compare displayed seed/hall/Fraying and all six hours, turn one handle, verify update/fray, then verify reset, next hall, next circle and disconnect. Repeat at a deep Athenaeum. Until those checks are performed, do not label this game-runtime certified.

## Final checkpoint

Portable: `C:\Users\mario\Documents\GitHub\daggerfall-js-source\KaraOps_Starter\release\KaraOps-0.9.0-Portable.exe`.

- Final size: **110,779,990 bytes**.
- SHA-256: **`B5A9ECFC94829E6B6EF796FFACC98EDFCFFB62E1366F984301DC6E8CD83115A0`**.
- Implementation commit: `d244212709` (full SHA recorded in the private build record).
- Final portable copy passed native Windows UI Automation: Elite seed 123/Hall 8 reached Concord in 16 manually confirmed presses, Abyss slot identity was retained, copied settings were unchanged, Node/npm were absent from the child PATH and the observer started off with no external TCP connections/listeners. This verifies the actual portable artifact; the observer transport/UI checks use the clearly labeled local fixture.
- A native harness rerun initially found no seed field because the retained QA profile correctly reopened Abyss mode. The harness now selects Elite mode explicitly; the final matching-hash run passed.
- All **13 protected artifacts/data files** are byte-identical: v0.6/v0.7/v0.8 EXEs and ten original settings/history/notes/capture JSON files. All desktop tests used separate data copies. DFO `src/`, `app/`, `server/` and `vendor/` have no working-tree changes; ARENA2 remained read-only.
- Portable-only x64 Electron payload; no installer, external Node or source checkout needed for solving. The EXE is unsigned, as previous releases were. Release binaries and private evidence are Git-ignored.
- Build record: `release/verification/v09/build.json`. Final native evidence: `release/verification/v09/native-final/native-orrery.json`. These source/fixture/desktop results do not constitute actual game-runtime validation.
