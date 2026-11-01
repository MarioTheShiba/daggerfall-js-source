import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve,join} from 'node:path'
import {mkdirSync,writeFileSync,mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {Worker} from 'node:worker_threads'
import {openGame,scan,reconstruct} from '../src/main/hunter/engine.mjs'
import {assembleGeometry} from '../src/main/hunter/geometry.mjs'
import {navigate} from '../src/main/hunter/navigation.mjs'
import {cacheKey,cached} from '../src/main/hunter/cache.mjs'
const settings={dfoSourcePath:process.env.DFO_SOURCE_PATH||resolve('..'),arena2Path:process.env.ARENA2_PATH||'C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2'}
const game=await openGame(settings),dir=resolve('KaraOpsData'),request={px:780,py:100,radius:20,species:34,level:30,minTargets:1,region:-1,eliteOnly:true,alternate:false,profile:'dex-mudex'}
const evidence={fingerprint:game.provenance.sourceFingerprint,geography:game.provenance.geography,samples:[],oracle:[]};let sample
test('source world keys/lane IDs round trip without aliases at boundaries and negative coordinates',async()=>{
 const grid=game.world.grid,lane=await game.load('lanes','world/worldWide/worldLanes'),spawn=game.modules.spawn,ids=new Map()
 for(const [x,y]of [[-8191,-8191],[-1,0],[0,-1],[999,499],[1000,499],[8191,8191],[3,11],[1003,10],...Array.from({length:2000},(_,i)=>[(i*7919)%16383-8191,(i*1543)%16383-8191])]){
  assert.deepEqual(grid.worldPixelOfKey(grid.worldPixelKey(x,y)),[x,y]);const id=spawn.spawnedMapId(1,x,y);if(ids.has(id))assert.deepEqual(ids.get(id),[x,y],`aliased ID ${id}`);ids.set(id,[x,y])
  if(!game.world.frame.inBay(x,y)){assert.equal(lane.worldLaneOf(id),lane.SPAWN_WORLD_LANE);assert.deepEqual(lane.worldLanePixel(id),[x,y])}
 }
 assert.throws(()=>spawn.spawnedMapId(1,8192,0));assert.throws(()=>spawn.spawnedMapId(2,-1,0))
})
test('source trace/fit defines all ten theatres without changing Hawkwing',()=>{
 assert.equal(game.catalog.theatres.length,10);assert.deepEqual(game.world.fit,{ox:589,oy:883.5,ppu:15.5});assert.equal(game.world.traceCells,26599)
 for(const t of game.catalog.theatres)assert.equal(game.world.grid.theatreAt(t.px,t.py),t.id)
 const h=reconstruct(game,game.clone(766,88),{...request,tileX:766,tileY:88});assert.equal(h.count,75);assert.equal(h.population.targetBase,25);assert.equal(h.totalEnemies,177);assert.equal(h.dragonlingPercentage,75/177*100)
})
for(const id of [0,1,2,3,4,5,6,7,8,9])test(`theatre ${id}: real bounded discovery, source host gates and population parity`,async()=>{
 const t=game.catalog.theatres[id],q={...request,px:t.px,py:t.py,theatre:id},r=await scan(game,q,()=>{},dir)
 assert.equal(r.stats.errors,0);assert.equal(r.coverage.exhaustiveWorld,false);assert.equal(r.coverage.completeWithinQuery,true);assert.equal(r.coverage.visitedPixels,1257);assert.equal(new Set(r.results.map(r=>r.mapId)).size,r.results.length)
 const {createSpawnStand}=await game.load('standOracle','scenes/spawnStandHost'),host={_arenaTemplates:null,_countryTemplates:null,_capitalBase:null,_insideSpawn:()=>false,_spawnGround:game.modules.spawn.createSpawnGround(game.world.woods),_spawnLedger:{expired:()=>false},_spawnSalt:1,_spawnUnroaded:new Set(),etherSea:true,etherPlaceAt:()=>null,locationIndex:new Map(game.index),params:new URLSearchParams('online'),terrainGen:{roads:()=>game.roads},zoneHalls:{standOf:()=>null},_spawnClock:()=>0,_spawnCloneAt:game.clone,_locIndexGen:0,provinceQuestPlaces:{placeOnPixel:game.world.placeAt},maps:game.maps},oracle=createSpawnStand(host)
 let checked=0,expected=0
 for(let y=t.py-20;y<=t.py+20;y++)for(let x=t.px-20;x<=t.px+20;x++){
  if(Math.hypot(x-t.px,y-t.py)>20||game.world.grid.theatreAt(x,y)!==id)continue
  const o=oracle._locationToBuild(x,y);if(o?.spawned&&o.elite)expected++
  const actual=!game.index.has(`${x},${y}`)&&game.modules.spawn.spawnsDungeon(1,x,y)&&!!game.gate.spawnAt(x,y,{clocks:false});assert.equal(o?.spawned===true,actual,`${x},${y}`);checked++
 }
 assert.equal(expected,r.stats.eligible)
 for(const row of r.results){assert.equal(row.theatre,id);assert.equal(row.liveAvailability,'unknown');assert.equal(row.mapId,game.modules.spawn.spawnedMapId(1,row.px,row.py));assert.equal(row.eligibility,'eligible_under_offline_scenario')
  // Independent source layout + encounter collection, not the adapter's reconstruct().
  const built=game.modules.size.dungeonLocationFor(game.clone(row.px,row.py),{online:true}),layout=game.modules.layout.layoutDungeon(built,game.blockReader,game.getModel),enemies=game.modules.enemies.collectDungeonEnemies(layout.blocks.map(b=>({markers:b.layout.markers,waterLevel:b.layout.waterLevel,originX:b.originX,originZ:b.originZ})),{...game.modules.enemies.dungeonPlace(built),dungeonType:built.mapTableData.dungeonType,playerLevel:30,alternate:false})
  assert.equal(row.totalEnemies,enemies.length*3);assert.equal(row.dragonlings,enemies.filter(e=>e.mobileType===34).length*3);assert.equal(row.dragonlingPercentage,row.dragonlings/row.totalEnemies*100)
 }
 if(id===9)assert.equal(r.stats.eligible,0)
 if(id!==0&&r.results.length&&!sample)sample={row:r.results[0],request:q}
 evidence.samples.push({theatre:id,name:t.name,center:[t.px,t.py],stats:r.stats,coverage:r.coverage,results:r.results.map(r=>({px:r.px,py:r.py,mapId:r.mapId,templateId:r.templateId,dragonlings:r.dragonlings,total:r.totalEnemies,purity:r.dragonlingPercentage}))});evidence.oracle.push({theatre:id,checked,expectedElite:expected});console.log('WORLD SAMPLE',id,t.name,r.stats.eligible,r.results.length,r.stats.elapsedMs)
})
test('world result feeds real 2D geometry/navigation and capability-specific cache; no live state assumed',async()=>{
 assert.ok(sample,'at least one real beyond-Bay Dragonling result');const {row,request}=sample,spec={px:row.px,py:row.py,request}
 const geometry=await assembleGeometry(game,spec);assert.equal(geometry.mapId,row.mapId);assert.equal(geometry.enemies.length,row.totalEnemies)
 const n=await navigate(game,spec,{goal:'single',targetIds:[geometry.enemies.find(e=>e.mobileType===34).id],startId:'entrance',species:34,openDoors:true,openSpellLevel:30,maxDrop:1,returnToEntrance:true,doorStates:{}});assert.equal(n.mapId,row.mapId);assert.equal(n.completeModel,false);assert.notEqual(n.status,'proven_unreachable');evidence.integration={px:row.px,py:row.py,mapId:row.mapId,geometry:geometry.stats,navigation:n.stats,status:n.status}
 const cacheDir=mkdtempSync(join(tmpdir(),'karaops-world-cache-')),key=cacheKey(game.provenance,request,'scan'),cold=await cached(cacheDir,key,()=>({coverage:{exhaustiveWorld:false},results:[row]})),warm=await cached(cacheDir,key,()=>{throw new Error('must hit')});assert.equal(cold.cache.hit,false);assert.equal(warm.cache.hit,true)
 assert.notEqual(key,cacheKey(game.provenance,{...request,theatre:8},'scan'));assert.notEqual(key,cacheKey(game.provenance,{...request,rankBy:'purity'},'scan'))
})
test('worker can be cancelled during source world/road initialization without partial result publication',async()=>{
 const worker=new Worker(new URL('../src/main/hunter/worker.mjs',import.meta.url),{workerData:{settings,request:{...request,px:3138,py:302,theatre:4},dataDir:mkdtempSync(join(tmpdir(),'karaops-world-cancel-'))}})
 let completed=false;worker.on('message',m=>{if(m.kind==='complete')completed=true})
 await new Promise(resolve=>{worker.on('message',m=>{if(m.kind==='progress'&&/roads|Tracing/.test(m.value.phase))resolve()})});await worker.terminate();assert.equal(completed,false)
})
test('purity ranking, normal/Elite totals, province filtering and truncation are explicit',async()=>{
 const r=await scan(game,{...request,radius:50,eliteOnly:false,rankBy:'purity'},()=>{},dir)
 assert.equal(r.stats.errors,0);assert.ok(r.results.length>0&&r.results.length<=100);assert.equal(r.coverage.truncated,r.coverage.matchingResults>r.results.length)
 assert.ok(r.results.some(r=>!r.elite));for(let i=1;i<r.results.length;i++)assert.ok(r.results[i-1].dragonlingPercentage>=r.results[i].dragonlingPercentage)
 for(const row of r.results){assert.equal(row.totalEnemies,row.population.base*(row.elite?3:1));assert.equal(row.dragonlingPercentage,row.dragonlings/row.totalEnemies*100)}
 const filtered=await scan(game,{...request,theatre:3},()=>{},dir);assert.equal(filtered.results.length,0);assert.equal(filtered.coverage.visitedPixels,1257);assert.equal(filtered.coverage.eligible,0)
 const capped=await scan(game,{...request,radius:50,eliteOnly:false,species:0,level:1},()=>{},dir);assert.equal(capped.stats.errors,0);assert.ok(capped.coverage.matchingResults>100);assert.equal(capped.results.length,100);assert.equal(capped.coverage.truncated,true);assert.equal(capped.coverage.completeWithinQuery,true)
 evidence.ranking={stats:r.stats,coverage:r.coverage,first:r.results.slice(0,3).map(r=>({mapId:r.mapId,dragonlings:r.dragonlings,total:r.totalEnemies,purity:r.dragonlingPercentage,elite:r.elite})),provinceFilterPassed:true,cappedCoverage:capped.coverage}
})
test.after(()=>{mkdirSync('release/verification',{recursive:true});writeFileSync(evidence.samples.length===10?'release/verification/world-parity.json':'release/verification/world-focused.json',JSON.stringify(evidence,null,2))})
