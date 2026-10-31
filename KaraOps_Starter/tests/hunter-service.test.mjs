import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import ts from 'typescript'
const js = ts.transpileModule(readFileSync('src/main/hunter/service.ts', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { HunterService, validateRequest, validateNavigation } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const request = { px: 780, py: 100, radius: 15, species: 34, level: 30, minTargets: 1, region: -1, eliteOnly: true, alternate: false, profile: 'dex-mudex' }
test('navigation main boundary strips extra keys and requires bounded typed state',()=>{
 const p={goal:'single',targetIds:['enemy:87'],species:34,startId:'entrance',openDoors:true,returnToEntrance:true,openSpellLevel:30,maxDrop:1,doorStates:{}}
 assert.deepEqual(validateNavigation({...p,command:'no'}),p)
 for(const patch of [{targetIds:[]},{targetIds:['enemy:87','enemy:87']},{doorStates:null},{openSpellLevel:Infinity},{goal:'secrets'}])assert.throws(()=>validateNavigation({...p,...patch}))
})
test('main-process boundary validates limits and strips unexpected renderer keys', () => {
  assert.deepEqual(validateRequest({ ...request, command: 'never executed' }), request)
  assert.throws(() => validateRequest({ ...request, radius: 1000000 }))
  assert.throws(() => validateRequest({ ...request, eliteOnly: 'yes' }))
})
test('worker cancellation stops a running job, stale messages do not overwrite next state', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'karaops-worker-test-'))
  const path = join(dir, 'slow.mjs')
  writeFileSync(path, "import {parentPort} from 'node:worker_threads'; setTimeout(()=>parentPort.postMessage({kind:'progress',value:{phase:'stale'}}),1000); setInterval(()=>{},1000)")
  const service = new HunterService(path, dir)
  const settings = { arena2Path: 'selected', dfoSourcePath: 'selected' }
  await service.start(settings, request)
  assert.equal(service.status().state, 'running')
  await service.cancel()
  assert.equal(service.status().state, 'cancelled')
  const id = await service.start(settings, null)
  assert.equal(service.status().id, id)
  await service.cancel()
  assert.equal(service.status().progress.phase.startsWith('Cancelled'), true)
  assert.deepEqual(service.history().lastRequest, request)
})
test('missing folders produce analysis_error; corrupt history does not reset app settings', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'karaops-worker-test-'))
  writeFileSync(join(dir, 'settings.json'), '{"arena2Path":"keep","dfoSourcePath":"keep"}')
  writeFileSync(join(dir, 'hunter-history.json'), 'broken')
  const service = new HunterService(resolve('src/main/hunter/worker.mjs'), dir)
  assert.deepEqual(service.history(), { observations: [] })
  await service.start({ arena2Path: join(dir, 'absent'), dfoSourcePath: resolve('..') }, null)
  for (let n = 0; n < 100 && service.status().state === 'running'; n++) await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(service.status().state, 'analysis_error')
  assert.ok(readFileSync(join(dir, 'settings.json'), 'utf8').includes('keep'))
  await assert.rejects(() => service.start({ arena2Path: '', dfoSourcePath: '' }, request))
})
