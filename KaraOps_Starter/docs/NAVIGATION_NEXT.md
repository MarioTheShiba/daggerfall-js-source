# Navigation continuation checkpoint — v0.4.0

Preserved in v0.5: the Hunter now accepts Tamriel world coordinates and selected generated world results reuse this same bounded navigation engine. Read the current v0.5 verification report first. The old Playwright/CDP directions below describe historical v0.4 tooling; v0.5 desktop verification uses `tests/native-hunter.ps1` without remote debugging. General puzzle/navigation limits below remain unchanged.

The current release is a validated **walking increment**, not a completed Navigation & Feasibility milestone. Read HUNTER_IMPLEMENTATION_AUDIT.md and HUNTER_VERIFICATION_REPORT.md first. Preserve Hunter population/cache/source checks and secure portable packaging. Do not edit the parent DFO checkout or original ARENA2.

## Reproduce the current baseline

Run `npm.cmd test`, `npm.cmd run test:hunter:local`, `npm.cmd run test:geometry:local`, `node --test tests/navigation-local.mjs`, then `npm.cmd run portable`. Use `node tests/hunter-electron.mjs` for the compiled development app, or pass the absolute portable EXE path. Run GUI suites sequentially: simultaneous portable launchers can interfere with unpack/cleanup and CDP ports. The driver now waits for the first portable launcher to exit before restarting.

Hawkwing (766,88), level 30/classic DEX+MUDEX, species 34, ordinary doors enabled, Open level 30, max drop 1m: 8/25 base objectives validated, 17 Unverified, tour return Unverified. Single enemy:87 validates a conditional round trip. Selected tour [enemy:87, enemy:126] and between-marker enemy:87 → enemy:126 also validate. These are predictions for fresh static source geometry, not live or observed game routes.

## Work still required

1. Preserve `completeModel:false` for real dungeons. Missing sampled corridors, wrong-height endpoint selection, rejected capsule replay, time caps and unsupported mechanics are never impossibility proofs. Add concrete alternative-path exploration and narrowly scoped independent edge validation before increasing positive coverage.
2. Source ActionSystem objects are indexed in `actions.mjs`; only whitelisted ordinary-door None/OpenDoor/UnlockDoor chains are executed by navigation. Real integration tests cover 21 links, 37 non-None records, 2 teleport records and 11 source secrets across the sampled dungeons. Add tested directed teleport transitions using source destination yaw/landing and source host teleport lifecycle, with cycle protection and return asymmetry.
3. Introduce explicit `(position, mechanism-state)` search. Model pressure/contact triggers, moving walls/lifts/special doors, swept geometry and delays using real ActionSystem plus actual dungeonContext integration. Do not treat a mover's final location as an instant passable wall removal. Unknown flat texture extents currently stop validation conservatively near the source position.
4. Add validated lockpick, jump/climb/swim/levitate capabilities individually, with source-specific preconditions and clear assumptions. Open-spell availability is currently declared, not detected; only source lock threshold is modeled. Never infer inventory, quest state or active runtime packs.
5. Expand manual state controls beyond ordinary doors only after the associated transitions are verified. Display interaction dependencies and required predecessors from actual chains. Current walk instructions merely follow successful physical traces and supported doors; full puzzle walkthrough controls remain disabled.
6. Improve tour ordering/coverage and demonstrate a genuinely shortest practical criterion before claiming optimal routes. Present per-leg source heights, collisions, hazards and returns. A failed first candidate currently leaves an objective Unverified even if another route may exist.
7. Obtain optional user-controlled field comparisons for traced routes, stairs, secrets, teleports and mover timing. No live game was driven or observed in this release. Existing automap normal-preserving adaptation remains an explicit source discrepancy.
8. Only after a complete bounded model is proven should real-dungeon Not Possible expose an exhaustive state closure/frontier witness and explicit ability assumptions. Existing complete abstract graph proofs are useful unit tests, not a proof that any real dungeon is impossible.

No live overlay, 3D viewer, installer, packet/client changes or gameplay automation are part of the next correctness increment.
