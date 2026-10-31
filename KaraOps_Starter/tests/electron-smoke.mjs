import { _electron as electron, chromium } from 'playwright'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, mkdirSync, appendFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'

const executablePath = resolve(process.argv[2] || 'node_modules/electron/dist/electron.exe')
const packaged = !executablePath.includes('node_modules')
const arena2Path = process.env.KARAOPS_TEST_ARENA2
const dfoSourcePath = resolve('..')
assert.ok(arena2Path && existsSync(arena2Path), 'Set KARAOPS_TEST_ARENA2 to real game data')
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_RENDERER_URL
// The portable process has no Node/npm on PATH and starts outside the source tree.
if (packaged) env.PATH = `${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`
const expected = { arena2Path, dfoSourcePath }
const evidence = resolve('release/verification')
mkdirSync(evidence, { recursive: true })
for (let run = 0; run < 2; run++) {
  let app
  if (packaged) {
    assert.equal(process.env.KARAOPS_TEST_NATIVE, '1', 'Portable tests use native pickers')
    spawn(executablePath, ['--remote-debugging-port=19223'], { cwd: dirname(executablePath), env, windowsHide: true, stdio: 'ignore' })
    let browser
    for (let attempt = 0; attempt < 120; attempt++) {
      try { browser = await chromium.connectOverCDP('http://127.0.0.1:19223'); break } catch { await new Promise(resolve => setTimeout(resolve, 1000)) }
    }
    assert.ok(browser, 'Portable launcher starts its embedded runtime')
    app = { firstWindow: async () => browser.contexts()[0].pages()[0], close: async () => { await browser.contexts()[0].pages()[0].close(); await browser.close() } }
  } else {
    app = await electron.launch({ executablePath, args: [resolve('.')], cwd: dirname(executablePath), env, timeout: 120000 })
  }
  try {
    const page = await app.firstWindow()
    const remoteRequests = []
    page.on('request', request => { if (/^(https?|wss?):/.test(request.url())) remoteRequests.push(request.url()) })
    const errors = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.getByRole('heading', { name: /Your command center/ }).waitFor()
    for (const label of ['Dragon Radar', 'World Atlas']) {
      await page.getByRole('navigation').getByRole('button', { name: label }).click()
      await page.getByText('STATUS · NOT IMPLEMENTED', { exact: true }).waitFor()
    }
    const security = packaged ? null : await app.evaluate(({ BrowserWindow }) => {
      const prefs = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences()
      return { sandbox: prefs.sandbox, contextIsolation: prefs.contextIsolation, nodeIntegration: prefs.nodeIntegration }
    })
    if (!packaged) assert.deepEqual(security, { sandbox: true, contextIsolation: true, nodeIntegration: false })
    assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
    await page.getByRole('navigation').getByRole('button', { name: 'Settings' }).click()
    if (run === 0) {
      if (process.env.KARAOPS_TEST_NATIVE === '1') {
        for (const [index, path] of [arena2Path, dfoSourcePath].entries()) {
          const helper = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('tests/choose-folder.ps1')], { env: { ...process.env, KARAOPS_PICK_PATH: path, KARAOPS_PICK_TITLE: index === 0 ? 'Select the ARENA2 folder' : 'Select DFO source directory' }, windowsHide: true, stdio: 'inherit' })
          await page.getByRole('button', { name: 'BROWSE' }).nth(index).click()
          await page.getByText(path, { exact: true }).waitFor({ timeout: 20000 }).catch(async error => { console.error(await page.locator('body').innerText()); throw error })
          await new Promise((resolve, reject) => { if (helper.exitCode !== null) resolve(); else helper.once('exit', code => code === 0 ? resolve() : reject(new Error(`Picker helper: ${code}`))) })
        }
      } else {
      // Replace only the OS picker result; exercise real buttons, preload, IPC and disk writes.
      await app.evaluate(({ dialog }, paths) => {
        let next = 0
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [paths[next++]] })
      }, [arena2Path, dfoSourcePath])
      await page.getByRole('button', { name: 'BROWSE' }).nth(0).click()
      await page.getByText(arena2Path, { exact: true }).waitFor()
      await page.getByRole('button', { name: 'BROWSE' }).nth(1).click()
      }
    }
    await page.getByText(arena2Path, { exact: true }).waitFor()
    await page.getByText(dfoSourcePath, { exact: true }).waitFor()
    assert.deepEqual(await page.evaluate(() => window.karaops.getSettings()), expected)
    const info = await page.evaluate(() => window.karaops.getAppInfo())
    if (packaged) assert.equal(info.dataDir, join(dirname(executablePath), 'KaraOpsData'))
    assert.deepEqual(JSON.parse(readFileSync(join(info.dataDir, 'settings.json'), 'utf8')), expected)
    await page.screenshot({ path: join(evidence, `${packaged ? 'portable' : 'development'}-${run}.png`) })
    assert.deepEqual(errors, [])
    await page.waitForTimeout(3000)
    const pids = packaged ? execFileSync('powershell.exe', ['-NoProfile', '-Command', "(Get-Process KaraOps).Id -join ','"], { encoding: 'utf8', windowsHide: true }).trim().split(',').map(Number) : await app.evaluate(({ app }) => app.getAppMetrics().map(metric => metric.pid))
    const connections = execFileSync('powershell.exe', ['-NoProfile', '-Command', `$ids = @(${pids.join(',')}); @(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -in $ids -and $_.State -ne 'Listen' -and $_.RemoteAddress -notin @('127.0.0.1','::1','0.0.0.0','::') }) | Select-Object OwningProcess,RemoteAddress,RemotePort,State | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true }).trim()
    assert.equal(connections, '', 'No runtime TCP connections expected')
    assert.deepEqual(remoteRequests, [])
    const result = JSON.stringify({ run, executablePath, info, settings: expected, security, rendererRequire: 'undefined', errors, remoteRequests, externalTcpSnapshot: connections || [] })
    console.log(result)
    appendFileSync(join(evidence, 'smoke-results.jsonl'), `${result}\n`)
  } finally { await app.close() }
}

