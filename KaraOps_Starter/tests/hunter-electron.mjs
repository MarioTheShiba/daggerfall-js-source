import { _electron as electron, chromium } from 'playwright'
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { dirname, resolve, join } from 'node:path'
import { mkdirSync, appendFileSync, readFileSync } from 'node:fs'
import {createHash} from 'node:crypto'
const executablePath = resolve(process.argv[2] || 'node_modules/electron/dist/electron.exe')
const packaged = !executablePath.includes('node_modules')
const executableSha256=packaged?createHash('sha256').update(readFileSync(executablePath)).digest('hex'):null
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE; delete env.ELECTRON_RENDERER_URL
if (packaged) env.PATH = `${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`
let app, browser, launcher
if (packaged) {
  launcher=spawn(executablePath, ['--remote-debugging-port=19224'], { cwd: dirname(executablePath), env, windowsHide: true, stdio: 'ignore' })
  for (let i = 0; i < 90; i++) {
    try { browser = await chromium.connectOverCDP('http://127.0.0.1:19224'); break } catch { await new Promise(resolve => setTimeout(resolve, 1000)) }
  }
  assert.ok(browser)
} else {
  app = await electron.launch({ executablePath, args: [resolve('.')], env, timeout: 60000 })
}
const page = app ? await app.firstWindow() : browser.contexts()[0].pages()[0]
const errors = [], requests = []
let restartEvidence
page.on('pageerror', error => errors.push(String(error)))
page.on('request', req => { if (/^(https?|wss?):/.test(req.url())) requests.push(req.url()) })
const waitState = async (predicate) => {
  for (let i = 0; i < 300; i++) {
    const status = await page.evaluate(() => window.karaops.hunter.status())
    if (predicate(status)) return status
    if (status.state === 'analysis_error') throw new Error(status.error)
    await page.waitForTimeout(200)
  }
  throw new Error('Hunter timeout')
}
try {
  await page.getByRole('heading', { name: /Your command center/ }).waitFor()
  const settings = await page.evaluate(() => window.karaops.getSettings())
  const expected = { arena2Path: process.env.ARENA2_PATH || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\The Elder Scrolls Daggerfall\\DF\\DAGGER\\ARENA2', dfoSourcePath: process.env.DFO_SOURCE_PATH || resolve('..') }
  // A relocated EXE starts unconfigured; save paths through the same narrow settings IPC.
  if (!settings.arena2Path && !settings.dfoSourcePath) await page.evaluate(value => window.karaops.saveSettings(value), expected)
  const preserved = await page.evaluate(() => window.karaops.getSettings())
  await page.getByRole('navigation').getByRole('button', { name: 'Dungeon Hunter' }).click()
  await page.getByRole('heading', { name: 'Find your quarry.' }).waitFor()
  await page.getByRole('button', { name: 'Validate data', exact: true }).click()
  const catalog = await waitState(s => s.state === 'complete' && s.catalog)
  assert.equal(catalog.catalog.provenance.templates, 4218)
  await page.getByLabel('Effective level (manual)').fill('30')
  await page.getByLabel('Center X (east)').fill('780'); await page.getByLabel('Center Y (south)').fill('100')
  await page.getByLabel('Radius (0–50 tiles)').fill('20')
  await page.evaluate(() => { window.hunterTestTicks = 0; window.hunterTestTimer = setInterval(() => window.hunterTestTicks++, 30) })
  await page.getByRole('button', { name: 'Scan', exact: true }).click()
  const status = await waitState(s => s.state === 'complete' && s.scan)
  assert.equal(status.scan.stats.errors, 0)
  assert.equal(status.scan.stats.simulated, 91)
  assert.equal(status.scan.results[0].count, 75)
  assert.ok(await page.evaluate(() => window.hunterTestTicks) > 5, 'Renderer remains responsive during worker execution')
  await page.evaluate(() => clearInterval(window.hunterTestTimer))
  await page.getByRole('img', { name: 'Actual dungeon block overview' }).waitFor()
  await page.getByRole('button', { name: 'Full puzzle walkthrough — coming later' }).isDisabled().then(value => assert.ok(value))
  assert.equal(status.scan.results[0].population.targetBase,25)
  assert.equal(status.scan.results[0].population.targetExpanded,75)
  const geometryStart=performance.now()
  await page.getByRole('button',{name:'Open 2D X-Ray',exact:true}).click()
  const mapped=await waitState(s=>s.state==='complete'&&s.geometry)
  const geometryColdMs=Math.round(performance.now()-geometryStart)
  assert.equal(mapped.geometry.plans.length,10)
  assert.equal(mapped.geometry.enemies.filter(e=>e.mobileType===34).length,75)
  assert.equal(mapped.geometry.stats.enemyExpanded,177)
  const map=page.getByRole('img',{name:'Reconstructed dungeon floor map'})
  await map.scrollIntoViewIfNeeded()
  const firstFloor=mapped.geometry.enemies.find(e=>e.mobileType===34).sheet
  await page.getByLabel('Map floor',{exact:true}).selectOption(String(firstFloor))
  const beforeZoom=await map.getAttribute('viewBox')
  await page.getByRole('button',{name:'Zoom in',exact:true}).click()
  assert.notEqual(await map.getAttribute('viewBox'),beforeZoom)
  const v=await map.getAttribute('viewBox')
  await page.getByLabel('Map floor',{exact:true}).selectOption(String((firstFloor+1)%mapped.geometry.plans.length))
  assert.equal(await map.getAttribute('viewBox'),v,'Floor changes preserve world view coordinates')
  await page.getByLabel('Map floor',{exact:true}).selectOption(String(firstFloor))
  await page.getByRole('button',{name:'Fit map',exact:true}).click()
  await page.getByLabel('Elite copies',{exact:true}).uncheck()
  await map.locator('[data-inspect="enemy"]').first().click()
  await page.getByRole('heading',{name:'Inspect marker',exact:true}).waitFor()
  await page.getByLabel('Map species',{exact:true}).selectOption('-1')
  const all=await map.locator('[data-inspect="enemy"]').count()
  await page.getByLabel('Map species',{exact:true}).selectOption('34')
  assert.ok(all>=await map.locator('[data-inspect="enemy"]').count())
  await page.getByLabel('Elite copies',{exact:true}).check()
  assert.equal(await map.locator('[data-inspect="enemy"]').count(),mapped.geometry.enemies.filter(e=>e.sheet===firstFloor&&e.mobileType===34).length)
  await page.getByLabel('Elite copies',{exact:true}).uncheck()
  assert.equal(await map.locator('[data-inspect="enemy"]').count(),mapped.geometry.enemies.filter(e=>e.sheet===firstFloor&&e.mobileType===34&&!e.eliteCopy).length)
  // Pan in screen space; floor paths and markers share the same viewBox transform.
  const box=await map.boundingBox(),beforePan=await map.getAttribute('viewBox')
  await page.mouse.move(box.x+8,box.y+8);await page.mouse.down();await page.mouse.move(box.x+40,box.y+30);await page.mouse.up()
  assert.notEqual(await map.getAttribute('viewBox'),beforePan)
  await map.hover({position:{x:50,y:50}})
  const scrollBefore=await page.locator('.page-scroll').evaluate(el=>el.scrollTop)
  const beforeWheel=await map.getAttribute('viewBox')
  await page.mouse.wheel(0,-180);await page.waitForTimeout(150)
  assert.notEqual(await map.getAttribute('viewBox'),beforeWheel)
  assert.equal(await page.locator('.page-scroll').evaluate(el=>el.scrollTop),scrollBefore,'Wheel zoom must not scroll the page')
  await page.getByRole('button',{name:'Fit map',exact:true}).click()
  mkdirSync('release/verification',{recursive:true})
  await map.screenshot({path:`release/verification/xray-${packaged?'portable':'development'}.png`})
  const repeatStart=performance.now()
  await page.evaluate(id=>window.karaops.hunter.map(id),status.scan.results[0].mapId)
  const repeat=await waitState(s=>s.state==='complete'&&s.geometry)
  assert.equal(repeat.geometry.cache.hit,true)
  const geometryRepeatMs=Math.round(performance.now()-repeatStart)
  const xrayRecord={executablePath,geometryColdMs,geometryRepeatMs,firstCacheHit:mapped.geometry.cache.hit,cacheHit:repeat.geometry.cache.hit,cacheOperationMs:repeat.geometry.cache.operationMs,stats:repeat.geometry.stats,zoom:true,pan:true,wheel:true,floorCoordinatesStable:true,markerInspection:true,speciesFilter:true}
  appendFileSync('release/verification/xray-electron.jsonl',JSON.stringify(xrayRecord)+'\n')
  console.log('XRAY',JSON.stringify(xrayRecord))
  await page.getByLabel('Open spell holder level',{exact:true}).fill('30')
  await page.getByLabel('Maximum safe drop',{exact:true}).selectOption('1')
  await page.getByRole('button',{name:'Calculate navigation',exact:true}).click()
  const navigated=await waitState(s=>s.state==='complete'&&s.navigation)
  assert.equal(navigated.navigation.stats.targets,25);assert.equal(navigated.navigation.stats.reached,8)
  assert.equal(navigated.navigation.status,'partially_reachable');assert.equal(navigated.navigation.completeModel,false)
  await page.getByRole('button',{name:'Show walk-in start',exact:true}).click()
  assert.ok(await map.locator('[data-route]').count()>0)
  await page.getByText(/Computed walkthrough \(/).waitFor()
  await map.screenshot({path:`release/verification/navigation-${packaged?'portable':'development'}.png`})
  await page.evaluate(({id,profile})=>window.karaops.hunter.navigate(id,profile),{id:repeat.geometry.mapId,profile:navigated.navigation.profile})
  const navCached=await waitState(s=>s.state==='complete'&&s.navigation)
  assert.equal(navCached.navigation.cache.hit,true)
  assert.ok(await page.evaluate(async id=>{try{await window.karaops.hunter.navigate(id,{goal:'single',targetIds:[]});return false}catch{return true}},repeat.geometry.mapId))
  await page.getByRole('button',{name:'Declare unlocked & recalculate',exact:true}).click()
  const declared=await waitState(s=>s.state==='complete'&&s.navigation)
  assert.ok(Object.keys(declared.navigation.profile.doorStates).length===1)
  appendFileSync('release/verification/navigation-electron.jsonl',JSON.stringify({executablePath,executableSha256,stats:navigated.navigation.stats,status:navigated.navigation.status,exit:navigated.navigation.exit.status,cached:navCached.navigation.cache.hit,manualDoorRecalculation:true,walkthroughSteps:navigated.navigation.steps.length,sourceFingerprint:status.scan.provenance.sourceFingerprint})+'\n')
  const before = await page.evaluate(() => window.karaops.hunter.history())
  await page.getByRole('button', { name: 'Save target', exact: true }).click()
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => window.karaops.hunter.history())
  assert.equal(after.observations.length, Math.min(before.observations.length + 1, 500))
  assert.equal(after.observations.at(-1).actualCount, null)
  assert.equal(after.observations.at(-1).sourceFingerprint, status.scan.provenance.sourceFingerprint)
  // IPC rejects invalid requests before opening a worker.
  assert.ok(await page.evaluate(async () => { try { await window.karaops.hunter.start({ radius: 100000 }); return false } catch { return true } }))
  const scanRequest = { ...status.scan.request, radius: 50 }
  await page.evaluate(request => window.karaops.hunter.start(request), scanRequest)
  await page.evaluate(() => window.karaops.hunter.cancel())
  assert.equal((await page.evaluate(() => window.karaops.hunter.status())).state, 'cancelled')
  // Missing assets fail explicitly; restore settings even if an assertion fails.
  try {
    await page.evaluate(value => window.karaops.saveSettings(value), { ...preserved, arena2Path: join(dirname(executablePath), 'missing-arena2') })
    await page.evaluate(() => window.karaops.hunter.start(null))
    const invalid = await waitState(s => s.state === 'analysis_error')
    assert.ok(/ENOENT|not|missing|path/i.test(invalid.error))
  } finally { await page.evaluate(value => window.karaops.saveSettings(value), preserved) }
  await page.evaluate(() => window.karaops.hunter.start(null))
  await waitState(s => s.state === 'complete' && s.catalog)
  assert.deepEqual(await page.evaluate(() => window.karaops.getSettings()), preserved)
  // A fresh worker after cancellation and error can recover and reproduce the same population.
  await page.evaluate(request => window.karaops.hunter.start(request), status.scan.request)
  const recovered = await waitState(s => s.state === 'complete' && s.scan)
  assert.equal(recovered.scan.results[0].count, 75)
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
  assert.deepEqual(errors, []); assert.deepEqual(requests, [])
  const pids = packaged ? execFileSync('powershell.exe', ['-NoProfile', '-Command', "(Get-Process KaraOps).Id -join ','"], { encoding: 'utf8', windowsHide: true }).trim().split(',').map(Number) : await app.evaluate(({ app }) => app.getAppMetrics().map(m => m.pid))
  const externalConnections = execFileSync('powershell.exe', ['-NoProfile', '-Command', `$ids=@(${pids.join(',')}); @(Get-NetTCPConnection -ErrorAction Stop | Where-Object { $_.OwningProcess -in $ids -and $_.State -ne 'Listen' -and $_.RemoteAddress -notin @('127.0.0.1','::1','0.0.0.0','::') }) | Select-Object OwningProcess,RemoteAddress,RemotePort | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true }).trim()
  assert.equal(externalConnections, '', 'No external TCP connections in runtime snapshot')
  mkdirSync('release/verification', { recursive: true })
  await page.locator('.page-scroll').evaluate(el => { el.scrollTop = 0 })
  await page.screenshot({ path: `release/verification/hunter-${packaged ? 'portable' : 'development'}.png`, fullPage: true })
  await page.getByRole('img', { name: 'Actual dungeon block overview' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: `release/verification/hunter-blocks-${packaged ? 'portable' : 'development'}.png` })
  const record = { executablePath, packaged, stats: status.scan.stats, top: { name: status.scan.results[0].name, count: status.scan.results[0].count }, errors, remoteRequests: requests, externalTcpSnapshot: [], savedSettings: preserved, bookmark: true, cancellation: true, invalidFolder: true, recovery: true, sourceFingerprint: status.scan.provenance.sourceFingerprint }
  appendFileSync('release/verification/hunter-electron.jsonl', JSON.stringify(record) + '\n')
  console.log(JSON.stringify(record))
  restartEvidence = { preserved, mapId: after.observations.at(-1).mapId, fingerprint: status.scan.provenance.sourceFingerprint }
} catch(error) {
  await page.screenshot({path:'release/verification/xray-failure.png'})
  console.error((await page.locator('body').innerText()).slice(-3000))
  throw error
} finally {
  if (app) await app.close()
  else { await page.close(); await browser.close(); if(launcher.exitCode===null)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Portable launcher did not finish cleanup')),30000);launcher.once('exit',()=>{clearTimeout(timer);resolve()})}) }
}
// Restart without source loading: settings and observation history must be independently persistent.
if (restartEvidence) {
  let nextApp, nextBrowser
  if (packaged) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    spawn(executablePath, ['--remote-debugging-port=19224'], { cwd: dirname(executablePath), env, windowsHide: true, stdio: 'ignore' })
    for (let i = 0; i < 90; i++) {
      try { nextBrowser = await chromium.connectOverCDP('http://127.0.0.1:19224'); break } catch { await new Promise(resolve => setTimeout(resolve, 1000)) }
    }
    assert.ok(nextBrowser)
  } else nextApp = await electron.launch({ executablePath, args: [resolve('.')], env })
  const nextPage = nextApp ? await nextApp.firstWindow() : nextBrowser.contexts()[0].pages()[0]
  try {
    await nextPage.getByRole('heading', { name: /Your command center/ }).waitFor()
    assert.deepEqual(await nextPage.evaluate(() => window.karaops.getSettings()), restartEvidence.preserved)
    const history = await nextPage.evaluate(() => window.karaops.hunter.history())
    assert.equal(history.observations.at(-1).mapId, restartEvidence.mapId)
    assert.equal(history.observations.at(-1).sourceFingerprint, restartEvidence.fingerprint)
    appendFileSync('release/verification/navigation-restart.jsonl',JSON.stringify({executablePath,executableSha256,settings:true,history:true})+'\n')
    console.log('Restart: settings and provenance-stamped bookmark persisted')
  } finally { if (nextApp) await nextApp.close(); else { await nextPage.close(); await nextBrowser.close() } }
}
