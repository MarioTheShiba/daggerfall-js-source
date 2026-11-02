// Read-only parity against both the full DFO working-tree modules and the downloaded official source oracle.
import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {logic as L} from './orrery-loader.mjs'
const source=resolve(process.env.KARAOPS_DFO_SOURCE??'..')
const law=await import(pathToFileURL(resolve(source,'src/net/eliteGates/egLaw.js')).href)
const brain=await import(pathToFileURL(resolve(source,'src/net/superDungeon/sdBrain.js')).href)
const elite=await import(pathToFileURL(resolve(source,'src/net/eliteGates/egBrain.js')).href)
const run=await import(pathToFileURL(resolve(source,'src/net/eliteGates/egRun.js')).href)
const spire=await import(pathToFileURL(resolve(source,'src/systems/eliteGates/spireOrrery.js')).href)
const oracle=await import(pathToFileURL(resolve('release/verification/v08/oracle/src/net/superDungeon/sdBrain.js')).href)
test('full official and selected DFO generators agree on Elite hall identity, gearing, clocks and shortest paths',()=>{
 let n=0,deep=0
 for(const seed of [0,1,123,8675309,4294967295])for(const h of [8,13,28,53,78,103,128,203,278,503,1003]){
  const c=law.egCircleOfHall(h),plan=law.egCirclePlan(seed,c)[law.egSlotOfHall(h)-1],spec={kind:plan.kind,h,c};assert.equal(L.breachHall(seed,h).kind,plan.kind)
  if(plan.kind!=='athenaeum'){assert.equal(spire.spireOrreryOf(seed,spec),null);continue}
  const displayed=spire.spireOrreryOf(seed,spec)
  for(const rank of [0,1,2]){const slot=(law.egSeed(seed,0x0a7e+h)%2147483646)+1,options={...elite.egOrreryTurns(c),...(rank?{fray:run.egFrayOf(c,rank)}:{})},o=oracle.orreryOf(slot,options),local=brain.orreryOf(slot,options),p=L.elitePuzzleOf(seed,h,rank)
   assert.deepEqual(o.start,local.start);assert.deepEqual(o.gear,local.gear);assert.deepEqual(o.truth,displayed.truth);assert.deepEqual(p.initial,o.start.map(x=>x||12));assert.deepEqual(p.target,o.truth.map(x=>x||12));assert.deepEqual(p.gear,o.gear);assert.equal(p.fray,o.fray)
   let state={st:o.start.slice(),f:0,ok:false};for(const s of p.steps)for(let k=0;k<s.count;k++){state=oracle.orreryStep(o,state,s.stone,s.direction==='RIGHT'?1:-1);assert.equal(state.x,false)}assert.equal(state.ok,true);assert.deepEqual(state.st,o.truth)
   const changed=oracle.orreryTurn(o,oracle.orreryTurn(o,o.start,0,-1),4,1),partial=L.elitePuzzleOf(seed,h,rank,changed);assert.equal(partial.turns,oracle.orreryShortest(o,changed));n++;if(h>=100)deep++
  }
 }
 assert.ok(n>20);assert.ok(deep>10);console.log(`Official source parity: ${n} seed/hall/rank cases, ${deep} at Hall 100+`)
})
test('existing staged Abyss solver retains identical initial hours, targets, gearing and turn counts',async()=>{
 const js=ts.transpileModule(readFileSync('files/src/renderer/src/orrery/logic.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText,old=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
 for(const slot of [1,2,123,98765,2147483647,Number.MAX_SAFE_INTEGER]){const a=old.puzzleOf(slot),b=L.puzzleOf(slot),o=oracle.orreryOf(slot);for(const key of ['initial','target','gear','turns'])assert.deepEqual(b[key],a[key]);assert.deepEqual(b.initial,o.start.map(x=>x||12));assert.equal(b.fray,o.fray)}
})
test('documented seed formula and facing-relative handles match official integration source',()=>{
 const read=p=>readFileSync(resolve('release/verification/v08/oracle',p),'utf8')
 assert.match(read('src/systems/eliteGates/spireOrrery.js'),/orreryOf\(\(egSeed\(seed, EG_ORRERY_SALT \+ spec.h\) % 2147483646\) \+ 1, egOrreryTurns\(spec.c\)\)/)
 assert.match(read('src/net/eliteGates/egBrain.js'),/egSeed\(B.seed, 0x0a7e \+ spec.h\)/)
 assert.match(read('src/scenes/eliteGates/egOrrery.js'),/right as you face it turns/)
})
