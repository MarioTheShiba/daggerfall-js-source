import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,mkdirSync,mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { Worker } from 'node:worker_threads'
import { resolve } from 'node:path'
import { openGame,reconstruct } from '../src/main/hunter/engine.mjs'
import { assembleGeometry } from '../src/main/hunter/geometry.mjs'
import { cached,cacheKey } from '../src/main/hunter/cache.mjs'
const settings={dfoSourcePath:process.env.DFO_SOURCE_PATH||resolve('..'),arena2Path:process.env.ARENA2_PATH||'C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2'}
const game=await openGame(settings),request={px:780,py:100,radius:20,species:34,level:30,minTargets:1,region:-1,eliteOnly:true,alternate:false,profile:'dex-mudex'}
const evidence={source:game.provenance.sourceFingerprint,worldData:game.provenance.worldData,samples:[]}

test('field-tested Hawkwing regression: 25 random base Dragonlings, 75 expanded targets, 59/177 all species',()=>{
  const r=reconstruct(game,game.clone(766,88),{...request,tileX:766,tileY:88})
  assert.equal(r.count,75);assert.equal(r.fixed,0);assert.equal(r.random,25)
  assert.deepEqual(r.population,{base:59,expanded:177,targetBase:25,targetExpanded:75,unresolved:0,excluded:0,markerCandidates:59})
  assert.equal(game.provenance.onlineRules.alternateForced,false)
  assert.equal(game.provenance.worldData.rdbOverrides.length,0)
  assert.equal(game.provenance.worldData.files.length,15)
})

for(const [px,py,size] of [[766,88,8],[774,119,5],[785,100,14],[810,50,8]])test(`real geometry ${px},${py}: source automap floor and coordinate parity`,async()=>{
  const start=performance.now(),g=await assembleGeometry(game,{px,py,request})
  assert.equal(g.stats.blocks,size);assert.ok(g.plans.length>1);assert.ok(g.stairs.length>0);assert.ok(g.doors.length>0)
  const location=game.modules.size.dungeonLocationFor(game.clone(px,py),{online:true})
  const d=game.modules.layout.layoutDungeon(location,game.blockReader,game.getModel)
  const {multiply,trs}=game.modules.mat4
  // Independently assemble the game's host entry meshes at the same block transforms.
  const rows=d.blocks.flatMap(b=>b.layout.placements.map(p=>({...game.getModel(p.modelIdNum),matrix:multiply(trs(b.originX,0,b.originZ,0,0,0),p.matrix)})))
  const f=game.modules.floors,ink=game.modules.ink,tris=f.floorTriangles(rows),storeys=f.deriveFloors(tris),bounds=f.planBounds(tris,f.PLAN_CELL),field=f.levelField(rows,storeys,{bounds}),sheets=f.groupSheets(field,storeys),links=f.storeyLinks(field),sheetOf=f.sheetOfStorey(sheets,storeys.length)
  assert.deepEqual(g.bounds,bounds);assert.deepEqual(g.storeys,storeys)
  const path=chains=>chains.map(c=>c.map((p,i)=>`${i?'L':'M'}${p.x},${-p.y}`).join(' ')).join(' ')
  for(const sheet of sheets){
    const occ=f.fieldOccupancy(field,sheet.storeys),pass=new Set()
    for(const l of links)if(sheetOf[l.from]===sheet.index&&sheetOf[l.to]!==sheet.index)for(const k of l.far)pass.add(k)
    const p=f.floorPlan(rows,sheet.storeys,{floors:storeys,bounds,full:occ,pass,segments:ink.boundarySegments,link:ink.linkSegments})
    assert.equal(g.plans[sheet.index].walls,path(p.chains));assert.equal(g.plans[sheet.index].cells,occ.covered.reduce((a,b)=>a+b,0))
  }
  const base=game.modules.enemies.collectDungeonEnemies(d.blocks.map(b=>({markers:b.layout.markers,waterLevel:b.layout.waterLevel,originX:b.originX,originZ:b.originZ})),{...game.modules.enemies.dungeonPlace(location),dungeonType:location.mapTableData.dungeonType,playerLevel:30,alternate:false})
  const collider=new game.modules.collider.Collider(()=>-Infinity)
  for(const b of d.blocks){
    const origin=trs(b.originX,0,b.originZ,0,0,0)
    for(const p of b.layout.placements){const m=game.getModel(p.modelIdNum);collider.addMesh('dungeon',m.positions,m.indices,multiply(origin,p.matrix))}
    for(const door of b.layout.actionDoors){if(door.disabled)continue;const m=game.getModel(door.modelIdNum);collider.addMesh('door',m.positions,m.indices,multiply(origin,door.matrix))}
  }
  const oracleExpanded=game.modules.enemies.expandEliteEnemies(base,{clearance:(from,dir,dist)=>collider.raycast([from[0],from[1]+.9,from[2]],dir,dist),floor:at=>{const d=collider.raycast([at[0],at[1]+1,at[2]],[0,-1,0],3);return Number.isFinite(d)?at[1]+1-d:null}})
  assert.deepEqual(g.enemies.map(e=>[e.x,e.y,e.z,e.mobileType,e.eliteCopy===true]),oracleExpanded.map(e=>[e.x,e.y,e.z,e.mobileType,e.eliteCopy===true]))
  assert.equal(g.enemies.length,base.length*3)
  assert.deepEqual(g.enemies.filter(e=>!e.eliteCopy).map(e=>[e.x,e.y,e.z,e.mobileType,e.fixed]),base.map(e=>[e.x,e.y,e.z,e.mobileType,e.fixed]))
  for(const e of g.enemies)assert.ok(g.plans[e.sheet].storeys.includes(f.floorAt(storeys,e.y)))
  assert.deepEqual([g.entrance.x,g.entrance.y,g.entrance.z],Object.values(d.enterMarker??d.startMarker))
  // Compare the checked source's lossy index too; report the departure rather than claiming identical in-game ink.
  const withoutNormals=rows.map(({normals,...r})=>r)
  const sourceIndexStoreys=f.deriveFloors(f.floorTriangles(withoutNormals)).length
  evidence.samples.push({px,py,...g.stats,sourceIndexStoreys,normalPreservingStoreys:storeys.length,offFloorProjections:g.enemies.filter(e=>!e.projectionOnFloor).length,ms:Math.round(performance.now()-start),bytes:JSON.stringify(g).length})
})
test('real geometry cache reuses only matching inputs and bypasses reconstruction',async()=>{
  const spec={px:766,py:88,request},key=cacheKey(game.provenance,spec,'geometry'),dir=mkdtempSync(resolve(tmpdir(),'karaops-geometry-cache-'))
  const cold=await cached(dir,key,()=>assembleGeometry(game,spec))
  const warm=await cached(dir,key,()=>{throw new Error('Cache hit must not reconstruct')})
  assert.equal(cold.cache.hit,false);assert.equal(warm.cache.hit,true)
  assert.deepEqual(cold.plans,warm.plans);assert.deepEqual(cold.enemies,warm.enemies)
  evidence.cache={coldMs:cold.cache.operationMs,warmMs:warm.cache.operationMs}
})
test('invalid dungeon reconstruction fails rather than drawing a substitute floor plan',async()=>{
  await assert.rejects(()=>assembleGeometry(game,{px:0,py:0,request}),/DUNGEON_NO_LONGER_ELIGIBLE/)
})
test('missing authored normals produce a diagnostic, never a decorative fallback',async()=>{
  const original=game.getModel
  try {
    game.getModel=id=>({...original(id),normals:null})
    await assert.rejects(()=>assembleGeometry(game,{px:766,py:88,request}),/GEOMETRY_MISSING/)
  } finally {game.getModel=original}
})
test('worker rejects scan/map fingerprint mismatch before returning any geometry',async()=>{
  const worker=new Worker(new URL('../src/main/hunter/worker.mjs',import.meta.url),{workerData:{settings,mapSpec:{px:766,py:88,request,expected:{...game.provenance,sourceFingerprint:'mismatched scan'}},dataDir:mkdtempSync(resolve(tmpdir(),'karaops-version-test-'))}})
  try {
    const result=await new Promise((resolve,reject)=>{worker.on('message',m=>{if(m.kind!=='progress')resolve(m)});worker.on('error',reject)})
    assert.equal(result.kind,'error');assert.match(result.message,/INPUT_VERSION_MISMATCH/);assert.equal(result.value,undefined)
  } finally {await worker.terminate()}
})
test.after(()=>{mkdirSync('release/verification',{recursive:true});writeFileSync('release/verification/geometry-parity.json',JSON.stringify(evidence,null,2));console.log('GEOMETRY',JSON.stringify(evidence.samples))})
