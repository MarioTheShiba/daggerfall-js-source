# Codex handoff: KaraOps v0.1

Review this starter project and bring it to a green, working **Windows portable x64** build. Do not implement the Dungeon Hunter or Dragon Radar yet.

Tasks, in order:
1. Run `npm install`; create and commit/package the resulting lockfile.
2. Run `npm run typecheck` and `npm run dev`; fix any issues using installed Electron/Vite versions.
3. Verify the sidebar navigation and module placeholder pages. All must be clearly labeled nonfunctional.
4. In Settings choose actual ARENA2 and DFO source folders; restart; verify persistence.
5. Run `npm run portable`. Verify `release/KaraOps-0.1.0-Portable.exe` launches on Windows without installing.
6. Move the EXE to a writable different folder, start it, choose folders, exit and restart. Verify `KaraOpsData` is created next to the EXE and saved settings persist; verify the EXE does not require the source folder or Node installed at runtime.
7. Verify no installer artifacts and no outbound network connections made by KaraOps at runtime.
8. Preserve Electron secure defaults: context isolation, sandbox, no Node renderer integration, limited IPC, no remote navigation.
9. Fix any failures found and report changed files and test/build evidence.

Constraint: Do not embed proprietary ARENA2 data, add network monitoring, or touch the user's DFO code in this milestone.
