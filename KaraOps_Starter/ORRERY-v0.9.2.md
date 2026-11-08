# Orrery v0.9.2 verification

The observer still requires explicit opt-in and a loopback debugger. Its only CDP command is `Network.enable`. No Runtime evaluation, injection, memory scanning, outgoing game commands, or unidentified socket payload parsing is used. DFO source is read only. Existing settings paths and the `karaops.orrery.v08` saved draft key are unchanged.

## Detection and recovery

The debugger target and Network subscription are separate from identifying a room. CDP does not replay `webSocketCreated` for a socket opened before attachment. Incoming frames without an identified room request ID are deliberately ignored. Reconnecting the debugger alone cannot recover that identity: connect the observer, then manually leave/rejoin the room. An explicitly authorized read-only game-state bridge is another possible design, but is not implemented or authorized by this release.

Diagnostics distinguish Network subscription, room identification, missing Elite `st`, missing `efs`, mismatching hall/wake/trial stage, non-Orrery `pg.obj`, malformed or oversized messages, invalid clock values, expired clocks and unsupported law. No payloads, URLs, room IDs, names or credentials are added to diagnostics.

`st.b` must match the identified breach socket. `efs.b` is an array of combat bodies, not a breach ID: the fight inherits breach identity from the matched socket and must match `st.h` and `st.hw` through `efs.h` and `efs.wk`. Hall/wake/stage changes discard clocks; circle changes require a new full decree state. Instructions use accepted `pg.st` and `pg.f`, including moved puzzles and resets, rather than assuming initial clocks. Mismatching fight frames now withhold old instructions. Events arriving before the Network acknowledgement are retained, and retired connection generations cannot update a new session.

## Verified locally (fixtures, not a running game)

- Typecheck passed for main and renderer.
- All 68 existing and regression unit tests passed. Coverage includes late attachment, entry after attachment, missing states, fight identity/objective mismatch, malformed frames, stale clocks, hall/circle transitions, law mismatch, reconnection and clean disconnection.
- The real local WebSocket CDP transport fixture passed using DFO `egStateOf`, `egStageWord` and `egFightState` producers and DFO's own `orreryStep` for turns. Accepted clocks, fray reset and transitions were verified.
- Three source-parity tests passed, including 57 seed/hall/rank cases (30 at Hall 100+) against the existing official-source oracle.
- Packaged KaraOps UI passed its local fixture test: opt-in, accepted-turn recalculation, stale/law/disconnect withholding, manual fallback, no renderer exceptions, and unchanged copied settings. Evidence: `release/verification/v092/observer-ui/result.json`.
- Portable build completed successfully: `release/KaraOps-0.9.2-Portable.exe` (110,789,237 bytes). Older versioned portable EXEs remain present. The build is unsigned, as in the existing packaging configuration.

No live DFO session was tested. These results do not establish real-game compatibility or successful detection in a running DFO client. A late-attached existing socket intentionally remains unrecovered until manual room rejoin. No game-state bridge was installed.
