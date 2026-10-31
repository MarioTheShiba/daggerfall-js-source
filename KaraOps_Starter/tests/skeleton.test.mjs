import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf8')

test('only a Windows portable target is declared', () => {
  const config = read('electron-builder.yml')
  assert.match(config, /target:\s*portable/)
  assert.doesNotMatch(config, /target:\s*(?:nsis|msi)/)
  assert.match(config, /KaraOps-\$\{version\}-Portable\.\$\{ext\}/)
})

test('the renderer cannot access Node directly', () => {
  const main = read('src/main/index.ts')
  const preload = read('src/preload/index.ts')
  assert.match(main, /contextIsolation:\s*true/)
  assert.match(main, /sandbox:\s*true/)
  assert.match(main, /nodeIntegration:\s*false/)
  assert.match(preload, /contextBridge\.exposeInMainWorld/)
  assert.doesNotMatch(preload, /exposeInMainWorld\([^\n]*ipcRenderer/)
})

test('portable settings are placed beside exe and remain local', () => {
  const main = read('src/main/index.ts')
  assert.match(main, /PORTABLE_EXECUTABLE_DIR/)
  assert.match(main, /KaraOpsData/)
  assert.match(main, /settings\.json/)
  assert.match(main, /openDirectory/)
})

test('Hunter is wired and unimplemented modules stay visibly disabled', () => {
  const app = read('src/renderer/src/App.tsx')
  for (const label of ['Dungeon Hunter','Dragon Radar','World Atlas','Settings']) assert.ok(app.includes(label))
  assert.match(app, /NOT IMPLEMENTED/)
  assert.match(app, /<Hunter/)
  assert.match(read('src/renderer/src/hunter/Hunter.tsx'), /Full puzzle walkthrough — coming later/)
})
