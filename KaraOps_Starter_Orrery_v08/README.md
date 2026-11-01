# KaraOps v0.8 - Shattered Hour Orrery auto-solver patch

A separate, non-destructive patch for your **KaraOps_Starter** Electron + React project from `MarioTheShiba/daggerfall-js-source`. Adds an Orrery Solver navigation tab, an opt-in Chrome DevTools Protocol connection, and local puzzle reconstruction once a new `.../room/sd:<slot>.<owner>` WebSocket URL is observed.

## Does this run by itself?
No. This is a **source patch**, not a standalone EXE. Build the copied KaraOps source after applying it. It does not update DFO, your original KaraOps source directory, the frozen v0.6 binary, or your saved `KaraOpsData`.

## Apply on Windows

1. Extract this ZIP somewhere outside the source repository.
2. Ensure your clone of the GitHub fork contains the `KaraOps_Starter` directory.
3. Open PowerShell in this extracted patch folder and run:

```powershell
node .\apply.mjs "C:\PATH\TO\daggerfall-js-source\KaraOps_Starter"
```

The script makes a **separate sibling** directory called `KaraOps_Starter_Orrery_v08`. It refuses to overwrite an existing directory. It does not change the input directory.

4. Build the new project:

```powershell
cd "C:\PATH\TO\daggerfall-js-source\KaraOps_Starter_Orrery_v08"
npm.cmd install
npm.cmd test
npm.cmd run portable
```

5. The new portable EXE is in the copied project's `release` directory. Preserve your old EXE and its data. Use a separate testing directory until you are happy with the build.

## Make DFO expose the debugging endpoint

The DFO desktop game's View menu has a `Toggle Developer Tools` option. That UI alone does **not** enable external program access; the official desktop-app docs say its Electron shell honors Chromium's `--remote-debugging-port` argument. Close DFO completely and start **the actual game EXE** with:

```powershell
& "C:\PATH\TO\DFO Online.exe" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1
```

Or add the two flags after the existing quotation mark in a separate Windows shortcut's Target field. The EXE path shown above is **just a placeholder**; keep your real installed location.

Confirm the endpoint locally:

```powershell
Invoke-RestMethod http://127.0.0.1:9222/json/list | Select-Object title,type,url
```

This should show a DFO page. If it fails, the port is not enabled, the game wasn't fully restarted, a launcher didn't pass the flags, or a local policy blocked it.

## Usage

1. Launch rebuilt KaraOps. Open **Orrery Solver** from the sidebar.
2. Keep debugging port `9222` and click **Connect to DFO**. This is deliberately opt-in each time; nothing attaches at KaraOps startup.
3. **Then** enter the Shattered Hour through its Rift. The observer subscribes to `Network.webSocketCreated`, which is not replayed for WebSockets opened before you connected.
4. KaraOps extracts only the public numeric slot ID from a `/room/sd:<slot>.<owner>` WebSocket URL, computes the six-clock puzzle, and shows the handle presses.
5. Turn the clocks **manually**, marking completed groups after doing them in-game. Switch the fray budget to 36 if the Hollow has the Fraying omen.

Manual fallback: enter a slot ID or room ID in the page when no event is available.

## Scope and limitations

- Read-only: sends only CDP `Network.enable` (to subscribe to socket URL creation notifications). No gameplay commands, JS injection, memory scanning, frame capture, payload inspection, logging URLs, account tokens or credentials, or input automation.
- Only attaches to a **DFO page target** exposed on `127.0.0.1` with the configured port; does not scan ports or attach to unrelated browser tabs.
- The game may use a different room transport or reuse an existing socket in a future version; in that case no slot will be detected and manual mode remains available.
- A slot regenerates the **fresh** puzzle; if someone turned stones before your arrival, this route may be wrong. The independent manual-calibration solver is still required for moved clocks.
- The only observed CDP event is newly created WebSocket URLs, not current in-game clock state. It will not remove a stale slot display simply because you leave the dungeon.
- **Security:** A Chromium remote-debugging port grants powerful access to the local game session to any *local* process that connects to it. Restrict it to loopback, use it only while needed, and restart DFO without those flags afterward. Do not open or forward the port to a LAN/the internet.
- Source-level solver parity was checked against ten original HTML solver seeds. Observer TS type-check, syntax and static room parsing can be checked locally; real installed DFO attachment and native Windows build have **not** been tested here.

## Files

- `apply.mjs` - copies and patches `KaraOps_Starter` into a new sibling folder.
- `files/src/main/orrery/observer.ts` - opt-in local Chrome DevTools URL observer.
- `files/src/shared/orreryTypes.ts` - typed IPC contract.
- `files/src/renderer/src/orrery/logic.ts` - deterministic Orrery generator and solver.
- `files/src/renderer/src/orrery/Orrery.tsx` - KaraOps sidebar page and step-by-step guide.
