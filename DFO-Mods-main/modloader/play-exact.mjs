#!/usr/bin/env node
/*
 * DFO Online Mods: exact-process Windows launcher.
 * Uses the existing DFO-Mods mod server; never invokes runningAppAsars().
 * DFO executable path is read from modloader/game-path.txt as saved by the
 * official launcher. Discord, Kara Ops, VS Code etc are not inspected.
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { startServer } from './lib/serve.mjs';
import { parseTasklist } from './parse-exact.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const say = (msg) => console.log(`[dfo-exact] ${msg}`);
const argv = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const quit = (s, code = 1) => { console.error(`[dfo-exact] ${s}`); process.exit(code); };

function pickFile(file) {
  try { return fs.readFileSync(path.join(HERE, file), 'utf8').trim().replace(/^"|"$/g, ''); }
  catch { return null; }
}
function executableOf(p) {
  if (!p) return null;
  const candidate = path.resolve(p);
  try {
    if (fs.statSync(candidate).isDirectory()) {
      const exact = path.join(candidate, 'DFO Online.exe');
      return fs.existsSync(exact) ? exact : null;
    }
    if (fs.statSync(candidate).isFile() && /\.exe$/i.test(candidate)) return candidate;
    // An app.asar path was sometimes saved by an earlier installer.
    if (/app\.asar$/i.test(candidate)) {
      const exe = path.resolve(path.dirname(candidate), '..', 'DFO Online.exe');
      return fs.existsSync(exe) ? exe : null;
    }
  } catch { /* use the next candidate */ }
  return null;
}
function findGame() {
  const named = argv.find((v) => v.startsWith('--app='));
  const candidates = [
    named?.slice(6), process.env.DFO_GAME, process.env.DFO_APP,
    pickFile('game-path.txt'), pickFile('app-path.txt'),
    path.join(ROOT, 'DFO Online.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'DFO Online', 'DFO Online.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'DFO Online', 'DFO Online.exe'),
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'DFO Online', 'DFO Online.exe'),
  ];
  for (const p of candidates) {
    const exe = executableOf(p);
    if (exe && path.basename(exe).toLowerCase() === 'dfo online.exe') return exe;
  }
  return null;
}

/** Only the real DFO process, not other Electron apps. Throws on query failure. */
export function dfoRunning() {
  if (process.platform !== 'win32') throw new Error('This launcher is for Windows only.');
  const result = spawnSync('tasklist.exe', ['/FI', 'IMAGENAME eq DFO Online.exe', '/FO', 'CSV', '/NH'], {
    encoding: 'utf8', windowsHide: true, timeout: 6000, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Windows process check failed: ${result.error?.message || result.stderr || result.status}`);
  }
  return parseTasklist(result.stdout);
}

async function main() {
  if (process.platform !== 'win32') quit('This launcher supports Windows only.');
  const exe = findGame();
  if (!exe) quit('Could not locate DFO Online.exe. Launch DFO-Mods once with the original play.bat to record its path, or run: play.bat --app="C:\\path\\to\\DFO Online.exe"');
  try { if (dfoRunning()) quit('DFO Online.exe is already running. Close DFO itself first (Discord can stay open).'); }
  catch (e) { quit(e.message); }

  // Reuse exactly the normal DFO-Mods mod-patching web server.
  const expectedPort = Number(process.env.DFO_MODS_PORT) || 47831;
  let server;
  try { server = await startServer({ app: exe, log: (m) => say(m) }); }
  catch (e) { quit(`Mod server failed to start: ${e.message}`); }

  // The mod loader's fallback port changes the localStorage origin and may look
  // like settings were lost. Refuse that case rather than silently switch ports.
  const port = Number(new URL(server.url).port);
  if (port !== expectedPort) {
    server.close();
    quit(`Port ${expectedPort} is already in use (perhaps an OLD DFO-Mods window stuck watching Discord). Close that old launcher window and retry. Refusing to change game settings origin.`);
  }

  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    try { server.close(); } catch { /* already closed */ }
  };
  process.on('SIGINT', () => { close(); process.exit(0); });
  process.on('SIGTERM', () => { close(); process.exit(0); });
  const env = { ...process.env, DAGGER_DEV_URL: server.url, APPDIR: path.dirname(exe) };
  const passthrough = argv.includes('--') ? argv.slice(argv.indexOf('--') + 1) : [];
  say(`starting ${path.basename(exe)} (exact process detection; Discord ignored)`);
  say(`serving mods at ${server.url}`);
  let child;
  try { child = spawn(exe, passthrough, { cwd: path.dirname(exe), env, stdio: 'ignore', windowsHide: false }); }
  catch (e) { close(); quit(`Could not start DFO: ${e.message}`); }
  child.once('error', (e) => { close(); console.error(`[dfo-exact] Could not start DFO: ${e.message}`); process.exitCode = 1; });
  child.once('exit', async () => {
    // Electron updates may re-launch DFO after the initial parent exits.
    await sleep(2500);
    let failures = 0;
    for (;;) {
      let running = false;
      try { running = dfoRunning(); failures = 0; }
      catch (e) { failures++; say(`process query unavailable (${e.message}); retrying`); }
      if (failures >= 3) { say('process query repeatedly failed; stopping this mod server'); break; }
      if (!running && failures === 0) break;
      await sleep(2000);
    }
    say('DFO closed; stopping mod server (Discord and Kara Ops have no effect)');
    close();
  });
}

// Tests can import parseTasklist without launching a game.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => quit(e.stack || e.message));
}
