# Kara's DFO Compatibility Pack v0.1

Targeted to DFO desktop build **v0.1.14461**, where a large dungeon failed navigation at 17,840 triangles with `Maximum call stack size exceeded` and **UI Tweaks** failed the pack/loot row anchor.

## Install (close DFO first)

1. Extract **all the files and folders from this ZIP** into the top-level `DFO-Mods` folder — **beside** `modloader`, `lootfilter-mod`, `uitweaks-mod`, and `karaaurum-mod`. Do not extract to a new subfolder.
2. Double-click `Install-UI-Repair.bat`. This makes a safety backup named `uitweaks-mod/patches.mjs.kara-before-repair` and changes only the single obsolete pack/loot-row check in your existing UI Tweaks patcher. The `uitweaks.js` module is untouched.
3. Launch DFO with your normal mod launcher.
4. Check the startup log. You want `[zznavfix] chunked large Base64 encode in assets/...` and `[uitweaks] MOD_BUILD ...` rather than `uitweaks not applied`. You should also see `[zzuirowrescue] inventory-row color fallback installed`.
5. **Re-enter** the failing large dungeon (the old visit's one-shot nav bake won't restart just by toggling a mod). Check for `[enhanced-ai] navmesh: ...` and whether the Golden Trail appears.

## What each piece does

- `zznavfix-mod`: patches only the exact `btoa(String.fromCharCode(...bytes))` shape inside DFO's **locally served** JS. Processes the byte array in 16 KiB chunks to avoid huge V8 function argument lists. Leaves installed game files unchanged.
- `repair-ui-tweaks.mjs`: changes the outdated row-builder patch from **mandatory** to **optional** after saving a backup. Other UI Tweaks functionality, including its own item labels and plaque colors, can load again. The existing game patches and mods remain otherwise unchanged.
- `zzuirowrescue-mod`: when UI Tweaks has loaded, it reads each visible row's existing `_padItem` record and invokes UI Tweaks' official `decorateRow()` helper to apply its color keys. It does **not** hide, add, modify, or reorder items. It handles rerenders automatically.

## Limitations

- A successful startup log does **not** prove the navigation overflow is fixed. Other code in `navWorker` might also cause the same stack error. If it still fails, send the new `[enhanced-ai]` error and the `navWorker-*.js` bundle plus imported navmesh chunk from your game build.
- This optional-row workaround restores **color keys**, not all of UI Tweaks' old per-row text enhancements (such as modified sublabels). This still needs an upstream UI Tweaks update for full parity.
- The navigation fix is **not** a separate navigation engine: it just lets DFO's own Enhanced AI nav bake finish if the Base64 conversion caused the crash. No waypoints appear until that happens.
- `zznavfix-mod` fails safely if DFO's minified output no longer contains the exact signature; it does not modify a random code segment.

## Undo

- Close game, remove `zznavfix-mod` and `zzuirowrescue-mod` folders.
- Restore `uitweaks-mod/patches.mjs` from `uitweaks-mod/patches.mjs.kara-before-repair` (rename/copy the backup over it). Your settings, game, and character data are untouched.

## Verification

Node-based synthetic patch tests prove the Base64 replacement roundtrips a large byte array and the repair script transforms the known original UI Tweaks pattern. **Not yet verified on the user's live v0.1.14461 compiled JS.**
