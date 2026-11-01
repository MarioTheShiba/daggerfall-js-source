# KaraOps v0.7 navigation / companion vertical slice

Date: 2026-10-31, Europe/Bucharest. Exhaustive world scanning is deferred under the user's changed priorities.

## Delivered scope and remaining runtime gate

This increment repairs the reported navigation/X-Ray regression and adds a tested opt-in telemetry receiver, minimap plumbing and independently delivered publisher SDK. It is **not a completed live Aurum ESP or GPS release**. No actual game-side producer is installed, no live game pairing or in-game coordinate/HUD alignment has been validated, and those controls remain disabled. The receiver UI explicitly labels the integration pending and received telemetry as not yet game-parity-certified.

The user reported developer approval ("dev said its alright") for live position and Aurum overlays. This attestation is recorded in the [upstream proposal](../integration/DFO_UPSTREAM_PROPOSAL.md). It is distinct from deployment and runtime evidence. No further approval was inferred for editing the read-only DFO checkout. Required game-side changes are described separately; no source patch, memory reader, debug connection, packet interception or gameplay automation was installed.

## Reproduction and navigation fix

The committed v0.6 solver and an isolated copy of the frozen v0.6 EXE both reproduce the failure at **(785,100), Elite The Cave of Morkucheus**, map ID **1149361**. Its 14 blocks/14 source storeys form 10 displayed floors. The fixed 0.25 m rectangular proposal grid exceeds the 750,000-cell budget and throws NAV_BUDGET. Hunter.tsx then conditionally unmounts the valid X-Ray whenever the job becomes analysis_error. The native baseline reproduction confirms that the map disappears.

Implemented corrections:

- Geometry visibility depends on the retained matching map identity, independently of route job success. Job errors/cancellation retain the map with a diagnostic and hide stale route results.
- Cancelled/failed navigation can be retried and a retained map can be reopened. Previously the main-process complete-only guard prevented recovery despite valid retained geometry.
- Navigation errors are isolated from map display. Unsupported waypoint/entrance/stair floor selection retains a valid floor instead of switching to a blank sheet. Capability controls are preserved across normal route refreshes.
- The source bake still uses its default 0.25 m grid where it fits. Large proposals may use 0.35 or 0.5 m under the same cell budget; every accepted path still requires the actual DFO capsule-motor replay. The source explicitly warns that coarsening can lose narrow doorways: this is a bounded proposal fallback, not a completeness claim, altered collision model or proof of impossibility. Oversized remaining proposals return structured Unverified outcomes rather than a misleading route.
- Current ordinary navigation takes precedence over older coffer route output. Floor/zoom component identity remains stable during route work.

For the reproduced large dungeon, the new 0.35 m source bake has **386,760 cells, 19,346 triangles and 5,524 polygons**. It validates **1 of 9 base Dragonling objectives**, with a conditionally validated return. Other objectives remain Unverified; no through-wall shortcut or invented walkthrough is drawn. Measured solve time in the full concurrent suite was approximately 3.8 seconds. Existing Hawkwing (766,88) counts and walking results remain unchanged: 25/75 Dragonlings, 59/177 total enemies, 8 of 25 base objectives validated, remaining objectives/multi-target return Unverified; the separately verified enemy:87 round trip passes.

Audit includes DFO navBake, PlayerMotor/collider, source floor extraction, ordinary-door activation/Open thresholds, action namespaces and teleporter callbacks in both dungeon hosts. Teleport endpoints are indexed from the actual action graph; teleporter/mover transitions are not newly advertised as navigable. Source `onTeleportPortal` and `onTeleport` ordering must be preserved by a future observer integration.

## Receiver and minimap implementation

- `src/main/companion/service.ts`: listener is off by default; explicit start binds IPv4 loopback only on an ephemeral port. Exact configured Origin/Host, random ephemeral bearer pairing token, JSON-only telemetry, 8 KB body cap, 20 frames/second, four connections and request timeouts. No game commands or account state are accepted/returned.
- `src/shared/liveProtocol.ts` / `liveTypes.ts`: schema/order/finite-number validation, explicit allowlist, identity comparison and source-compatible column-major projection helper. Invalid, wrong-map/source/assets/layout, background or stale frames are hidden. Freshness uses a monotonic receipt clock, including correct zero-origin expiry; frame order and teleport epochs are checked.
- Geometry includes deterministic asset/layout signatures. `mapState.ts` independently gates telemetry against the rendered geometry, preserves original XYZ, and uses the source nearest-storey rule for mapped floors; unsupported heights are not projected onto an invented floor.
- `Companion.tsx` provides explicit opt-in/origin/pairing and off controls. Private pairing data is not stored as account credentials. `XRay.tsx` can show an identity-matched received position/camera-heading marker and follow valid floor changes, with explicit uncertainty wording.
- `integration/dfo-telemetry-publisher.mjs`: explicit developer-supplied sampler only; fixed paired loopback destination, no redirects/credentials, allowlisted frame fields, no overlapping posts, timeout/stop handling. It discovers no game internals and is not injected into the client.

The current contract acknowledges frames only. It sends no coffer HUD payload and implements no live-position route request. Existing offline entrance/enemy walking traces are not rebranded as live GPS. The exact coffer permission setting, account-manual-note semantics and original prediction limitations remain intact.

Offline projection fixtures match DFO `tapRay.projectToScreen` / mirrored `mat4` values within 1e-5 CSS pixels in tested camera cases, with behind-camera/out-of-frustum targets hidden. That is numerical evidence only. The provisional first HUD approach is developer-supported in-client drawing with exact final matrices and active world viewport. An external transparent window has not been measured for game foreground attribution, fullscreen, OS/client bounds, browser chrome, DPI or compositor alignment, so no runtime overlay choice is claimed validated.

## Automated verification

**105 tests passed:** 52 unit/contract tests plus 53 real-source/ARENA2/worker tests. All original 93 v0.6 tests remain passing.

```powershell
npm.cmd test
npm.cmd run typecheck
node --test tests/hunter-local.mjs tests/geometry-local.mjs tests/navigation-local.mjs tests/world-local.mjs tests/world-host-local.mjs tests/jackpot-local.mjs tests/navigation-v07-local.mjs
```

New coverage includes retained geometry during running/failure/cancellation, retry/reopen lifecycle, stale-route suppression, invalid floors, bounded adaptive proposal grids, real v0.6 failure versus v0.7 positive source-motor routes, transport origin/token/identity/order, monotonic staleness, wrong dungeon/layout/source/assets, background/disconnect, teleport epoch/floor changes, body/rate limits, source projection parity and publisher privacy/opt-in. Transport and teleport/floor telemetry tests use explicitly synthetic test frames, not an actual connected game; no production demo frames are generated.

Native baseline command, run against a copied frozen EXE/data:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/native-hunter.ps1 -ExecutablePath release/verification/v07/baseline/KaraOps.exe -Large -BaselineRepro -EvidenceDir release/verification/v07/baseline-evidence
```

The new native scenario checks the large real dungeon, map DOM retention during cancellation/retry/completion, persisted capability input, and receiver on/off with an exclusively loopback listener. A relocated scenario checks signed world coordinates and source maps. Evidence is isolated under `release/verification/v07/`; the original portable settings/history/captures are protected by before/after hashes. A controlled Dragonling/Bay profile is used only in QA copies; the user's saved Morrowind/Daedra profile is not reset.

## Portable artifact and native results

The new portable Windows x64 artifact is `release/KaraOps-0.7.0-Portable.exe`. Final size: **110,768,270 bytes**. SHA-256: **18ED92A099116DF07856D354F3DFF401C6CDCC71F84AA58A7E98B7A8A3730107**. The implementation build commit is **be9e03b4c7ec55cfb0f77aff8d96f9e76e23214e**; subsequent verification-document/test-harness changes do not alter the binary. No installer target or external Node/npm runtime is introduced. The frozen v0.6 EXE must retain SHA-256 `F6A5A9C4C7828F8BD6B82CE03809DB73083D7C1C470EA542605586BC1D912D64`.

Implementation commits: `fcbe1f8369` (map/bounded large-dungeon navigation), `6563402ebd` (opt-in receiver/SDK/proposal), `f5b970014e` (retry/reopen), `be9e03b4c7` (capability-control preservation). All modifications are confined to KaraOps; DFO source and original ARENA2 remain unchanged. Source/asset provenance is still the v0.6 tested original-data scenario, not a certification of an unobserved live game build.

## Next required work

1. Have the developer integrate the independently attested build/loaded-asset/layout manifest and render-frame sampler into both actual dungeon hosts, preserving existing warp/automap callbacks and explicit consent.
2. Pair the real game and measure XYZ/height/floor, map/source/layout identity, short/long teleport epochs, foreground loss and disconnect behavior across multiple real dungeons. Refuse unsupported active overrides.
3. Validate final viewport projection under actual camera/third-person/climb/ambience effects, docked/retro HUD, resizing/zoom/DPR. Only then implement/enable the separately approved coffer HUD with predicted-state labels and full matching target identity.
4. Add actual-position route starts, observed/declared mechanism-state handling and invalidation/rerouting. Validate each segment and return route; retain strict conditional/Unverified distinctions. Do not draw direct lines as walking paths.

Until those gates pass, live Aurum ESP, external transparent overlay, actual-player GPS/turn guidance and automatic live rerouting remain unavailable. Exhaustive Tamriel scanning, 3D and a complete mechanism solver remain deferred. No actual connected-game runtime validation is claimed by this vertical slice.

## Final native verification

- The frozen v0.6 copied EXE reproduces NAV_BUDGET and the missing map at (785,100); see v07/baseline-evidence/v06-map-reproduction.json.
- The new EXE passes the same real large-dungeon scenario. The reconstructed map's accessibility runtime ID remains unchanged during calculation, cancellation, retry and successful completion; the declared Open-spell holder value 7 survives route refresh.
- The opt-in receiver enters waiting only after explicit consent/origin input, binds exclusively to 127.0.0.1, and shuts down cleanly. No actual game publisher is paired.
- The identical EXE is copied to a relocated folder and passes real Hawkwing scan/map/navigation, legacy cache import, 91-population capture, Legendary reranking, inspector reconstruction, coffer placement/redaction and CSV export. Settings and prior coordinate inputs persist; Node/npm are absent from the child PATH. Final disabled-receiver TCP snapshots contain no KaraOps listener or external endpoint.
- Both native runs use isolated copied data. All 10 protected original settings/history/manual-note/capture files remain byte-identical; the original v0.6 EXE hash is unchanged. DFO src/vendor have no changes.
- Native evidence uses v07/native/native-hunter.jsonl and v07/relocated-native/native-hunter.jsonl, with the exact release hash above; build.json records artifact identity and explicit unimplemented live features. Screenshots/accessibility trees are private local evidence, not measurements of in-game HUD alignment.

No production fixtures, simulated player stream or decorative coffer HUD are shipped. Live-game coordinate parity, viewport alignment, transparent overlay, actual-position GPS and teleport/reroute runtime behavior remain outstanding.
