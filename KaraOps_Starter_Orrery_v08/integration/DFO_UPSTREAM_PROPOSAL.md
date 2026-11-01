# Proposed developer-supported telemetry integration (not installed)

The user reported DFO developer approval on 2026-10-31: "dev said its alright", in response to the question about live position and Aurum overlays. This records the attestation; it is not a claim that an upstream API has been deployed or that runtime parity was measured.

The DFO checkout and ARENA2 remain read-only. `dfo-telemetry-publisher.mjs` is a separately delivered opt-in publisher SDK, not a script injected into the game. No source patch, bookmarklet, extension, debugger, packet observer or memory reader is installed. A game developer must integrate the sampler and independently generated identities before real use.

## Audited source seams

- `src/scenes/dungeon.js`: `player.feetAt()`, `cam.yaw`/`cam.pitch`; final mirrored `proj` and `view` after third-person, ambience and climb adjustments around the world-render pass. The view is not reconstructed from yaw alone.
- `src/scenes/worldModes.js`: the dungeon lane has its own final projection/view and player motor. It must publish only while the dungeon context is active. Supporting the standalone host alone does not establish ordinary online dungeon coverage.
- `src/scenes/dungeonContext.js`: authoritative built location, block layouts, collider/action integration. Supply actual map identity and layout metadata from this context rather than a displayed name or nearest world tile.
- `src/world/actionSystem.js`: Teleport resolves a block-instance destination, notifies `onTeleportPortal`, then invokes `onTeleport`; hosts own the actual motor warp. Preserve both existing callbacks and automap behavior. Add a read-only observer/epoch update after the host warp instead of replacing callbacks. Publish the changed epoch in the same render snapshot.
- `src/player/tapRay.js`: `projectToScreen`, `worldRectPx`; `src/world/mat4.js`: `multiply`, mirrored projection. `src/ui/hud/hudLarge.js`: `worldViewportRect` accounts for docked HUD and retro aspect viewport.
- `src/net/oneSeat.js` BroadcastChannel is a same-origin seat lock, not telemetry. Network relay packets and existing `window.__*` debug probes are not the proposed interface.

No supported external telemetry producer was found in the inspected working source or the fetched `upstream/main` net/scenes audit. The SDK's `sample` callback therefore remains an integration responsibility, not an automatically discovered game state source.

## Narrow v1 contract

KaraOps starts no listener by default. The user explicitly supplies the exact approved game origin and enables a session. The listener binds only `127.0.0.1` on an ephemeral port. The user privately pairs the endpoint and random one-session bearer token with the game integration. Do not put tokens in URLs, persist them in game/account storage, or log them.

Only `POST /v1/frame` with `Content-Type: application/json`, the paired Authorization header and exact Origin is accepted. CORS permits that origin only. Frames are limited to 8192 bytes, 20 per second and four concurrent connections. Stopping invalidates pairing and clears the frame. Browser local-network access permission may also be required; no browser security is weakened to bypass it. Actual HTTPS-game/browser permission compatibility remains unmeasured.

Required payload fields:

```text
schema: 1
streamId: session publisher UUID
sequence: increasing unsigned integer
epoch: increasing unsigned integer on teleport/discontinuity
identity: { mapId, sourceFingerprint, assetFingerprint, layoutFingerprint }
feet: [x,y,z] in the actual built dungeon's local metres, Y up
yaw, pitch: game camera angles in radians
foreground: document focused and visible
viewProjection: 16 finite column-major coefficients from the final rendered proj*view
viewport: { x,y,width,height,dpr } in CSS client coordinates of the active WORLD viewport
```

No account IDs/tokens, other players, enemy lists, reward proofs, input commands or arbitrary scripts are accepted or returned. Extra JSON fields are discarded. The response acknowledges sequence/epoch only; **v1 does not return a coffer HUD or GPS commands**.

The publisher must sample these values atomically from the same rendered frame. Send actual feet separately from the camera eye. Re-entry, scene unload and disconnection must stop publishing. Background publishing reports foreground=false; stale delivery hides the marker after one second using the receiver's monotonic receipt clock. Out-of-order frames/epochs are rejected; a new active stream cannot replace another fresh stream.

## Identity and coordinate parity requirements

Never copy the receiver's expected IDs into a producer merely to make comparisons pass. The developer must independently attest the running build, actually loaded original asset bytes and built layout. The implemented receiver requires all four identities to match the currently reconstructed map exactly. Equality is necessary, not proof of an honest producer or measured coordinate parity.

- `sourceFingerprint` uses the selected source's v0.6 source/vendor fingerprint scheme; upstream needs a matching build manifest or an explicitly audited future scheme migration.
- `assetFingerprint` is SHA-256 of JSON for the alphabetically sorted original ARENA2 asset-hash dictionary in geometry provenance. Active replacements/mods cannot be silently represented as the original files.
- `layoutFingerprint` is SHA-256 of the exact JSON block signature in `src/main/hunter/geometry.mjs`: block name/origin/start/water, ordered model IDs/position keys/matrices, and ordered action-door IDs/position keys/disabled flags/matrices. It is a structural layout signature, not proof of live collider state. Unrepresented runtime overrides require refusal or a future extended schema.
- Source camera projection and KaraOps map conventions must be measured in multiple real dungeons. The blue telemetry marker is explicitly labeled received, identity-matched telemetry with game parity not yet certified. It is not a collision/reachability certificate.

For an in-client world viewport, derive CSS bounds from `worldRectPx(worldViewportRect(...))`, then apply the canvas DOM rectangle/client-size scale and offset. Include the docked-HUD/retro viewport, final mirrored matrix, camera shake/third-person/climb state, zoom/DPR and any CSS transforms. Reject unsupported transforms rather than estimating a chrome offset.

## Overlay decision and release gate

The proposed first HUD is developer-supported in-client drawing: it can use the exact rendered matrices/world viewport and avoids guessing desktop/browser-chrome offsets. Offline projection tests agree with DFO `projectToScreen` within 1e-5 CSS pixels for tested matrices/viewports, and behind-camera/out-of-frustum points are rejected. This is **numerical fixture evidence**, not measured in-game HUD alignment or a completed overlay.

An external transparent Electron window is deferred: no validated producer currently supplies OS client bounds, foreground HWND/process attribution, multi-monitor DPI/fullscreen alignment or compositor timing. No compatibility/stability measurement has been made against the actual game, so an external overlay is not presented as working or preferred on runtime evidence.

Aurum ESP and live GPS controls remain visibly disabled. Before enabling them:

1. Integrate and review both dungeon hosts and the actual-data manifest/sampler; keep telemetry explicitly user-controlled.
2. Validate real frame identity, feet/camera coordinates, signed map IDs, floor changes and teleport epochs against reconstructed geometry in at least three dungeons.
3. Measure actual HUD projection at multiple camera headings/pitches, third person, docked HUD, retro viewport, window sizes, zoom/DPR and focus changes. Reject stale/offscreen/behind-camera targets and clear immediately on transitions/disconnects.
4. Add separately approved HUD output carrying only matching source-verified predicted coffer data and uncertainty labels. Preserve the existing exact-position permission gate. Never claim account reward availability from offline prediction.
5. Validate walking from actual live feet and observed/declared mechanism state; invalidate/reroute after teleport or state changes. Publish only capsule-replayed traversable segments, distinguish conditions, and never replace failure with a line through walls.

The present vertical slice is the repaired navigator, opt-in receiver, identity/freshness safeguards, telemetry minimap plumbing and independent publisher SDK. Production game pairing, transparent coffer HUD and actual-position GPS remain blocked by upstream integration and real runtime validation.
