@echo off
rem DFO Mods exact-process launcher; does not scan Electron apps.
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if not exist "modloader\play-exact.mjs" (
  echo [dfo-exact] Missing modloader\play-exact.mjs. Extract the package to DFO-Mods.
  pause
  exit /b 2
)
call "modloader\find-node.bat" "%~dp0"
if errorlevel 1 (
  echo [dfo-exact] Node.js not found.
  pause
  exit /b 1
)
"%NODE%" "modloader\play-exact.mjs" %*
if errorlevel 1 pause
