import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync,writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cached,cacheKey } from '../src/main/hunter/cache.mjs'
import { verifySource } from '../src/main/hunter/compatibility.mjs'
import { populationFor } from '../src/main/hunter/engine.mjs'

test('content-addressed caches hit only the same code/source/assets/packs/scenario/level',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'karaops-cache-')),p={sourceFingerprint:'source',assetHashes:{MAPS:'asset'},worldData:{fingerprint:'packs'}},r={level:30,profile:'dex-mudex'}
  const key=cacheKey(p,r,'scan');let calls=0
  const compute=async()=>({count:++calls})
  assert.equal((await cached(dir,key,compute)).cache.hit,false)
  assert.equal((await cached(dir,key,compute)).cache.hit,true);assert.equal(calls,1)
  for(const [q,s] of [[{...p,sourceFingerprint:'new'},r],[{...p,assetHashes:{MAPS:'new'}},r],[{...p,worldData:{fingerprint:'new'}},r],[p,{...r,level:31}],[p,{...r,profile:'vanilla'}]])assert.notEqual(cacheKey(q,s,'scan'),key)
  assert.notEqual(cacheKey(p,r,'geometry'),key)
})
test('corrupt, wrong-key and tampered cache entries regenerate',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'karaops-cache-')),key='a'.repeat(64)
  for(const text of ['corrupt','{}',JSON.stringify({schema:'karaops-2a-1',key,value:{fake:true},checksum:'bad'})]){
    writeFileSync(join(dir,`${key}.json`),text)
    const result=await cached(dir,key,async()=>({correct:true}))
    assert.equal(result.cache.hit,false);assert.equal(result.correct,true)
  }
})
test('unrecognized source signatures stop prediction with explicit mismatch diagnostics',()=>{
  assert.throws(()=>verifySource('unused',()=>Buffer.from('changed source')),/SOURCE_VERSION_MISMATCH/)
})
test('unresolved enemy selections are not counted as resolved base or expanded enemies',()=>{
  const game={modules:{door:{_resetEncounterTableSelectors(){}},enemies:{dungeonPlace:()=>({}),collectDungeonEnemies:()=>[{mobileType:34},{mobileType:undefined,blockIndex:0,loadID:1,x:1,y:2,z:3}]}}}
  const result=populationFor(game,{mapTableData:{dungeonType:14}},{blocks:[{layout:{markers:[{record:15},{record:15},{record:16}]}}]},{profile:'vanilla',level:30,alternate:false})
  assert.equal(result.resolved.length,1);assert.equal(result.unresolved.length,1);assert.equal(result.excluded,1)
})
