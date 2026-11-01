import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import ts from 'typescript'
import {createTelemetryPublisher} from '../integration/dfo-telemetry-publisher.mjs'
const compile=file=>ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64'),protocolUrl=data(compile('src/shared/liveProtocol.ts'))
const protocol=await import(protocolUrl),{CompanionService,geometryIdentity}=await import(data(compile('src/main/companion/service.ts').replace("'../../shared/liveProtocol'",JSON.stringify(protocolUrl))))
const mapState=await import(data(compile('src/renderer/src/hunter/mapState.ts')))
const g={mapId:1137342,layoutFingerprint:'a'.repeat(64),provenance:{sourceFingerprint:'b'.repeat(64),assetHashes:{'MAPS.BSA':'c'.repeat(64)}},bounds:{x0:-100,x1:100,z0:-100,z1:100},storeys:[{index:0,y:0},{index:1,y:10}],plans:[{index:0,storeys:[0]},{index:1,storeys:[1]}]}
const identity=geometryIdentity(g);g.assetFingerprint=identity.assetFingerprint
const make=(sequence=1,patch={})=>({schema:1,streamId:'test-stream-123',sequence,epoch:0,identity,feet:[0,0,0],yaw:0,pitch:0,foreground:true,viewProjection:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],viewport:{x:10,y:20,width:800,height:600,dpr:2},...patch})
test('protocol strips extra fields and rejects malformed pose, matrix, identity and viewport',()=>{
 const f=protocol.liveFrame({...make(),account:'never forward',commands:['move']});assert.equal('account' in f,false);assert.equal('commands' in f,false)
 for(const patch of [{feet:[NaN,0,0]},{viewProjection:[]},{epoch:-1},{foreground:'yes'},{viewport:{...f.viewport,width:0}},{identity:{...identity,sourceFingerprint:'unknown'}}])assert.throws(()=>protocol.liveFrame(make(1,patch)))
 for(const origin of ['file:///foo','https://user:secret@game.example','https://game.example/path'])assert.throws(()=>protocol.liveOrigin(origin))
})
test('receiver binds only on opt-in, requires origin/token, enforces identity/order/freshness and shuts down cleanly',async()=>{
 let now=100;const receiver=new CompanionService(()=>now);receiver.setGeometry(g);assert.equal(receiver.status().enabled,false)
 const state=await receiver.start('https://game.example'),url=state.endpoint,headers={Origin:'https://game.example',Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'}
 const send=async(frame,extra={})=>{now+=100;return fetch(url,{method:'POST',headers:{...headers,...extra},body:JSON.stringify(frame)})}
 try{
  const options=await fetch(url,{method:'OPTIONS',headers:{Origin:'https://game.example'}});assert.equal(options.headers.get('access-control-allow-origin'),'https://game.example')
  assert.equal((await send(make(),{Origin:'https://unapproved.example'})).status,403)
  assert.equal((await send(make(),{Authorization:'Bearer '+'é'.repeat(43)})).status,401)
  assert.equal((await send(make(1))).status,200);assert.equal(receiver.status().state,'tracking')
  assert.equal((await send(make(1))).status,409)
  for(const key of ['mapId','sourceFingerprint','assetFingerprint','layoutFingerprint']){const id={...identity,[key]:key==='mapId'?42:'d'.repeat(64)};assert.equal((await send(make(2,{identity:id}))).status,409);assert.equal(receiver.status().frame,undefined)}
  assert.equal((await send(make(2))).status,200)
  assert.equal((await send(make(3,{epoch:1,feet:[0,10,0]}))).status,200);assert.equal(receiver.status().discontinuity,true)
  assert.equal((await send(make(4,{epoch:1,foreground:false}))).status,200);assert.equal(receiver.status().state,'hidden');assert.equal(receiver.status().frame,undefined)
  assert.equal((await send(make(5,{epoch:1}))).status,200);now+=1001;assert.equal(receiver.status().state,'stale');assert.equal(receiver.status().frame,undefined)
  assert.equal((await send(make(6,{epoch:1,feet:[200,0,0]}))).status,400)
 }finally{await receiver.stop()}
 assert.equal(receiver.status().token,undefined);assert.equal(receiver.status().frame,undefined);await assert.rejects(()=>fetch(url))
})
test('wrong layout/source, missing floor, background and disconnection never produce a minimap marker',()=>{
 const state={state:'tracking',frame:make()};assert.equal(mapState.telemetryMarker(g,state).sheet,0)
 assert.equal(mapState.telemetryMarker(g,{...state,frame:make(2,{feet:[0,10,0],epoch:1})}).sheet,1)
 for(const state of [{state:'stale',frame:make()},{state:'hidden',frame:make()},{state:'off'},{state:'tracking',frame:make(1,{identity:{...identity,mapId:42}})},{state:'tracking',frame:make(1,{feet:[0,100,0]})}])assert.equal(mapState.telemetryMarker(g,state),null)
})
test('zero-origin monotonic clock expires frames; payload and authenticated rate limits are bounded',async()=>{
 let now=0;const receiver=new CompanionService(()=>now);receiver.setGeometry(g)
 const state=await receiver.start('https://game.example'),headers={Origin:'https://game.example',Authorization:`Bearer ${state.token}`,'Content-Type':'application/json'}
 const send=async body=>{const r=await fetch(state.endpoint,{method:'POST',headers,body:JSON.stringify(body)});await r.text();return r.status}
 try{
  assert.equal(await send(make(1)),200);assert.equal(receiver.status().ageMs,0)
  now=1001;assert.equal(receiver.status().state,'stale')
  assert.equal(await send({...make(2),extra:'x'.repeat(9000)}),413)
  now=10000;for(let i=2;i<22;i++)assert.equal(await send(make(i)),200)
  assert.equal(await send(make(22)),429)
 }finally{await receiver.stop()}
})
test('projection matches DFO mirrored-camera and viewport math in CSS coordinates; hidden/behind/outside targets stay hidden',async()=>{
 const source=p=>import(pathToFileURL(resolve('..','src',p+'.js')).href),M=await source('world/mat4'),T=await source('player/tapRay')
 for(const eye of [[0,1.8,0],[5,4,3]])for(const target of [[0,1.8,10],[10,4,3]]){
  if(Math.hypot(...eye.map((v,i)=>v-target[i]))<.1)continue
  const proj=M.mirrorProjectionX(M.perspective(Math.PI/3,4/3,.05,800)),view=M.lookAt(eye,target,[0,1,0]),pv=Array.from(M.multiply(proj,view)),f=make(1,{viewProjection:pv})
  const expected=T.projectToScreen(target,800,600,proj,view),actual=protocol.projectTelemetry(target,f)
  assert.ok(actual);assert.ok(Math.abs(actual.x-(10+expected.x))<1e-5);assert.ok(Math.abs(actual.y-(20+expected.y))<1e-5)
  const behind=eye.map((x,i)=>x-(target[i]-x));assert.equal(protocol.projectTelemetry(behind,f),null)
 }
 assert.equal(protocol.projectTelemetry([100,0,0],make()),null)
})
test('publisher is explicit, one-way, opt-in and allowlisted; it never samples accounts or issues game commands',async()=>{
 let calls=0,request;const sample={...make(),account:'private',actors:['private']},p=createTelemetryPublisher({endpoint:'http://127.0.0.1:1234/v1/frame',token:'a'.repeat(43),sample:()=>sample,foreground:()=>true,fetcher:async(url,options)=>{calls++;request=options;return {ok:true}}})
 assert.equal(calls,0);p.start();await new Promise(r=>setTimeout(r,20));p.stop();assert.equal(calls,1)
 const f=JSON.parse(request.body);assert.equal('account' in f,false);assert.equal('actors' in f,false);assert.equal(request.credentials,'omit');assert.equal(request.redirect,'error')
 assert.throws(()=>createTelemetryPublisher({endpoint:'https://remote.example/v1/frame',token:'a'.repeat(43),sample:()=>sample}))
})
