# KaraOps v0.1 skeleton validation

Validated on Windows x64, October 30–31, 2026 (Europe/Bucharest).

## Deliverables

- Portable application: `release/KaraOps-0.1.0-Portable.exe`
- Size: 110,635,611 bytes
- SHA-256: `8BAD5182115724E98D855FE04CD8CF65A1B8741B795B124F51D60C60ACB059A8`
- Source package including `package-lock.json`: `release/KaraOps-0.1.0-Source.zip`
- Machine-readable smoke results and screenshots: `release/verification/`

## Checklist results

1. PASS — `npm.cmd install`; lockfile generated. Final install audit: 347 packages, zero reported vulnerabilities. PowerShell blocks `npm.ps1`; `npm.cmd` works. Electron's missing binary was installed using `node node_modules/electron/install.js` with download access. npm reports an unused transitive `electron-winstaller` install script pending approval; portable packaging succeeded without it.
2. PASS — `npm.cmd run typecheck`, `npm.cmd test` (4/4), `npm.cmd run dev`, and `npm.cmd run portable`. Resolved versions include Electron 45.2.0, electron-vite 6.0.0, Vite 8.3.5, electron-builder 26.18.0. The inherited `ELECTRON_RUN_AS_NODE` variable must be cleared for development launches; the smoke harness clears it automatically. No TypeScript compilation changes were needed.
3. PASS — Overview, Dungeon Hunter, Dragon Radar, World Atlas, and Settings navigate successfully. Each module page displays `STATUS · NOT IMPLEMENTED`; no module engine was added. No renderer errors in successful smoke runs.
4. PASS — Both real paths saved and reloaded after process restart. Development smoke tests simulate the OS picker result while exercising actual renderer buttons, preload, IPC, and disk persistence. Portable tests use actual native Windows folder dialogs, automated with UI Automation and Win32 dialog controls.
5. PASS — The delivered portable EXE launched its embedded application directly, without an installation step. Portable launcher extraction is normal temporary runtime extraction, not an installer. The initial attempt to drive the launcher with Playwright's Electron stdio transport failed; the final harness connects to a temporary loopback Chromium debugging port instead.
6. PASS — Copied only the EXE to `%TEMP%/KaraOps-v0.1-Portable-Validation/`; selected folders, exited, and relaunched. Settings and Electron profile were created under `KaraOpsData` beside that EXE. Both saved paths persisted. The child process PATH contained only Windows/System32 and Windows, and its working directory was the separate EXE folder. Runtime process command lines showed embedded Electron loading the extracted `resources/app.asar`; the source application and Node/npm are not runtime dependencies. Node remains installed on the test PC; it was not uninstalled for this test.
7. PASS — No Setup EXE, MSI, uninstaller, or installer distribution was produced. electron-builder internally uses NSIS to build the portable self-extracting launcher, but only the portable target is configured. Successful automated runs observed zero renderer HTTP/HTTPS/WebSocket requests and zero external TCP connections in process snapshots. Loopback debug traffic is excluded. These bounded observations do not establish the absence of every possible transient connection; packaged HTTP(S)/WS(S) requests are also denied before dispatch by the main process. No network monitoring feature was added to the application.
8. PASS — Actual development Electron preferences confirmed sandbox=true, contextIsolation=true, nodeIntegration=false. Both development and portable renderers expose no `window.require`. Packaged source retains these preferences, webSecurity=true, denied new windows/navigation, denied permissions, and four explicit IPC handlers restricted to the main window's main frame. Packaged builds ignore `ELECTRON_RENDERER_URL`.
9. PASS — Application changes, dependency lock, repeatable tests, and this evidence report are included in the source package. No DFO source was modified, and no ARENA2 data was copied or packaged. Dungeon Hunter and Dragon Radar remain placeholders.

## Paths used

- ARENA2: `C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2`
- DFO: `C:/Users/mario/Documents/GitHub/daggerfall-js-source`

The skeleton stores strings only; choosing these folders does not scan or modify their contents.

## Changed or added files

- `src/main/index.ts`: restrict IPC to the main frame, deny packaged remote requests, deny permission checks, disable Chromium background networking, and ignore renderer URL overrides in packaged mode.
- `package.json`, `package-lock.json`: install dependencies and add Playwright as a development-only test tool.
- `tests/electron-smoke.mjs`, `tests/choose-folder.ps1`: repeatable navigation, real-folder settings/restart, security, relocation, screenshots, and external connection snapshot checks. Packaged security preferences are not queried through CDP; their runtime check uses the development Electron process, while packaged renderer Node access is checked directly.
- `README.md`, `docs/VALIDATION.md`: current build status, launch workaround, test usage, and validation evidence.

## Reproduce portable smoke checks

Run from the project root, without interacting with other desktop windows during native folder selection:

```powershell
$env:KARAOPS_TEST_ARENA2 = 'C:\Program Files (x86)\Steam\steamapps\common\The Elder Scrolls Daggerfall\DF\DAGGER\ARENA2'
$env:KARAOPS_TEST_NATIVE = '1'
node tests/electron-smoke.mjs (Resolve-Path release/KaraOps-0.1.0-Portable.exe)
```

The harness uses port 19223 for test-only loopback debugging and launches Windows helper processes hidden. Ordinary EXE launches do not request a debugging port. The EXE uses Electron's default icon and is unsigned; no signing certificate was configured.
