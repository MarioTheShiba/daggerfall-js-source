import test from 'node:test'
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {mkdirSync,writeFileSync,mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {openGame} from '../src/main/hunter/engine.mjs'
import {assembleGeometry} from '../src/main/hunter/geometry.mjs'
import {actionIndex} from '../src/main/hunter/actions.mjs'
import {navigate} from '../src/main/hunter/navigation.mjs'
import {cached,cacheKey} from '../src/main/hunter/cache.mjs'
const game=await openGame({dfoSourcePath:process.env.DFO_SOURCE_PATH||resolve('..'),arena2Path:process.env.ARENA2_PATH||'C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2'})
const request={px:780,py:100,radius:20,species:34,level:30,minTargets:1,region:-1,eliteOnly:true,alternate:false,profile:'dex-mudex'},spec={px:766,py:88,request}
const profile={goal:'species',targetIds:[],species:34,startId:'entrance',openDoors:true,returnToEntrance:true,openSpellLevel:30,maxDrop:1,doorStates:{}}
const evidence={source:game.provenance.sourceFingerprint,samples:[]}
test('source capsule motor rejects a thin wall and cannot reverse a walking-only drop',async()=>{
 const {Collider}=await game.load('collider','player/collider'),{PlayerMotor}=await game.load('motor','player/motor')
 const wall=new Collider(()=>0)
 wall.addMesh('thin-wall',new Float32Array([-3,0,0,3,0,0,3,4,0,-3,4,0]),new Uint32Array([0,1,2,0,2,3]),new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]))
 const m=new PlayerMotor(wall,{speed:50,running:30,swimming:30});m.spawn(0,0,-1)
 for(let i=0;i<120;i++)m.update(1/60,{forward:1,strafe:0,jump:false,run:false,crouch:false},0)
 assert.ok(m.pos[2]<-.3,'visually neighboring floor regions are separated by real collision')
 const cliff=new Collider(()=>0),matrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),indices=new Uint32Array([0,1,2,0,2,3])
 cliff.addMesh('upper-floor',new Float32Array([-3,2,-5,-3,2,0,3,2,0,3,2,-5]),indices,matrix)
 cliff.addMesh('cliff-face',new Float32Array([-3,0,0,3,0,0,3,2,0,-3,2,0]),indices,matrix)
 const n=new PlayerMotor(cliff,{speed:50,running:30,swimming:30});n.spawn(0,2,-1)
 let drop=0;for(let i=0;i<90;i++){n.update(1/60,{forward:1,strafe:0,jump:false,run:false,crouch:false},0);drop=Math.max(drop,n.landedFallDistance??0)}
 assert.ok(n.pos[2]>1&&n.pos[1]<.1);assert.ok(drop>1.5)
 for(let i=0;i<90;i++)n.update(1/60,{forward:1,strafe:0,jump:false,run:false,crouch:false},Math.PI)
 assert.ok(n.pos[1]<.1,'standing walk does not climb a 2m rise')
})
function record(r){evidence.samples.push({mapId:r.mapId,status:r.status,stats:r.stats,exit:r.exit?.status,mechanisms:r.mechanisms.length,outcomes:r.outcomes.map(o=>({id:o.id,status:o.status,conditions:o.conditions,reasons:o.reasons})),routes:r.routes.map(o=>({id:o.id,kind:o.kind,distance:o.distance,points:o.points.length,floors:[...new Set(o.points.map(p=>p.sheet))]}))})}
test('Hawkwing source graph preserves namespaces, exact chains, secrets and teleport endpoints',async()=>{
 const context={};await assembleGeometry(game,spec,context);const idx=await actionIndex(game,context),sense=await game.load('sense','systems/dungeon/dungeonSense'),echo=await game.load('echo','systems/dungeon/dungeonEcho')
 assert.equal(idx.mechanisms.length,61);assert.equal(new Set(idx.mechanisms.map(m=>m.key)).size,61)
 for(const m of idx.mechanisms){const o=idx.actions.objects.get(m.key);assert.equal(m.next,idx.actions.nextOf(o)?.key??null);assert.equal(m.secret,sense.isSecretMover(o,idx.actions.chainTargets()));assert.deepEqual(m.playerTriggers,sense.playerTriggers(o));assert.deepEqual(m.chainMovers,echo.chainMovers(n=>idx.actions.nextOf(n),o).map(n=>n.key));if(m.next)assert.equal(idx.actions.objects.get(m.next).ns,o.ns);if(m.teleportDestination)assert.deepEqual(m.teleportDestination,idx.actions.resolvePosition(o.ns,o.nextKey).pos)}
 const door=[...idx.actions.objects.values()].find(o=>idx.safeDoor(o));assert.ok(door);const next=door.nextKey;door.nextKey=Number(door.key.split(':').at(-1));assert.equal(idx.safeDoor(door),false,'cycle never executed as a safe door chain');door.nextKey=next
})
test('real action-bearing dungeons preserve source links, trigger semantics and destination namespaces',async()=>{
 let links=0,nonDoor=0,teleports=0,secrets=0
 const sense=await game.load('sense','systems/dungeon/dungeonSense'),echo=await game.load('echo','systems/dungeon/dungeonEcho')
 for(const [px,py]of [[774,119],[810,50],[785,100]]){
  const context={};await assembleGeometry(game,{px,py,request},context);const idx=await actionIndex(game,context)
  for(const m of idx.mechanisms){const o=idx.actions.objects.get(m.key);assert.equal(m.next,idx.actions.nextOf(o)?.key??null);assert.equal(m.secret,sense.isSecretMover(o,idx.actions.chainTargets()));assert.deepEqual(m.chainMovers,echo.chainMovers(n=>idx.actions.nextOf(n),o).map(n=>n.key));assert.deepEqual(m.playerTriggers,sense.playerTriggers(o));if(m.next){links++;assert.equal(idx.actions.objects.get(m.next).ns,o.ns)}if(m.action!=='None')nonDoor++;if(m.secret)secrets++;if(o.actionFlag===idx.R.ACTION_FLAGS.Teleport){teleports++;assert.deepEqual(m.teleportDestination,idx.actions.resolvePosition(o.ns,o.nextKey)?.pos??null)}}
 }
 assert.ok(links>0&&nonDoor>0,'non-vacuous action chain coverage');evidence.actions={links,nonDoor,teleports,secrets};console.log('ACTION COVERAGE',JSON.stringify(evidence.actions))
})
test('Hawkwing Dragonling tour validates positive motor traces and preserves partial/unknown classification',async()=>{
 const r=await navigate(game,spec,profile);record(r);assert.equal(r.status,'partially_reachable');assert.equal(r.stats.targets,25);assert.equal(r.stats.reached,8);assert.equal(r.completeModel,false);assert.equal(r.exit.status,'unknown');assert.equal(r.stats.outOfBudget,false)
 assert.equal(r.stats.cs,.25);assert.ok(r.stats.polys>1000);assert.ok(r.steps.some(s=>s.kind==='interaction'));assert.ok(r.steps.some(s=>s.kind==='vertical'))
 for(const o of r.outcomes){assert.notEqual(o.status,'proven_unreachable');if(o.points){assert.ok(o.points.length>1);assert.ok(o.conditions.length);for(const p of o.points)assert.ok(p.at.every(Number.isFinite));for(let i=1;i<o.points.length;i++)assert.ok(Math.hypot(...o.points[i].at.map((x,j)=>x-o.points[i-1].at[j]))<2,'trace samples are physical motor steps')}}
 assert.ok(r.failures.length);assert.ok(r.outcomes.filter(o=>!o.points).every(o=>o.reasons.length))
})
test('single target and independently computed return, closed-door capability contrast and rollback determinism',async()=>{
 const p={...profile,goal:'single',targetIds:['enemy:87']},r=await navigate(game,spec,p);record(r)
 assert.ok(r.stats.reached===1);assert.ok(r.routes.some(r=>r.kind==='return'),'source return must be independently replayed')
 const blocked=await navigate(game,spec,{...p,openDoors:false,openSpellLevel:0});record(blocked);assert.equal(blocked.stats.reached,0);assert.equal(blocked.status,'unknown')
 const again=await navigate(game,spec,p);assert.deepEqual(again.routes,r.routes);assert.deepEqual(again.steps,r.steps,'speculative failed paths must not leak state between jobs')
})
test('selected multi-target tour and between-marker start produce actual source-motor routes',async()=>{
 for(const p of [{...profile,goal:'tour',targetIds:['enemy:87','enemy:126']},{...profile,goal:'between',startId:'enemy:87',targetIds:['enemy:126']}]){
  const r=await navigate(game,spec,p);assert.equal(r.stats.reached,p.targetIds.length);assert.equal(r.routes.filter(r=>r.kind==='outbound').length,p.targetIds.length);assert.ok(r.routes.every(r=>r.points.length>1));assert.equal(r.completeModel,false)
 }
})
for(const [px,py] of [[774,119],[810,50]])test(`real dungeon ${px},${py}: bounded source walking analysis`,async()=>{const g=await assembleGeometry(game,{px,py,request}),species=px===810?g.enemies[0].mobileType:34,r=await navigate(game,{px,py,request},{...profile,species});record(r);assert.ok(r.stats.targets>0);assert.ok(r.outcomes.every(o=>o.status!=='proven_unreachable'));assert.equal(r.completeModel,false);assert.ok(r.mechanisms.length)})
test('budget exhaustion stays Unverified, is not cached, and capability/state inputs invalidate route cache',async()=>{
 const dir=mkdtempSync(resolve(tmpdir(),'karaops-nav-')),key=cacheKey(game.provenance,{spec,profile},'navigation');let calls=0
 const compute=()=>{calls++;return navigate(game,spec,profile,()=>{},{maxProbes:0})}
 const first=await cached(dir,key,compute),second=await cached(dir,key,compute);assert.equal(calls,2);assert.equal(first.stats.outOfBudget,true);assert.equal(first.status,'unknown');assert.equal(second.cache.hit,false)
 assert.notEqual(key,cacheKey(game.provenance,{spec,profile:{...profile,openSpellLevel:0}},'navigation'));assert.notEqual(key,cacheKey(game.provenance,{spec,profile:{...profile,doorStates:{'act:0:123':'open'}}},'navigation'))
})
test.after(()=>{mkdirSync('release/verification',{recursive:true});writeFileSync('release/verification/navigation-parity.json',JSON.stringify(evidence,null,2));console.log('NAVIGATION',JSON.stringify(evidence.samples.map(s=>({...s,outcomes:undefined}))))})
