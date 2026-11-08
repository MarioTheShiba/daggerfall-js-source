import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {PuzzleSession,puzzleRoom,approvedTarget,OrreryObserver} from './orrery-observer-loader.mjs'
const b='0123456789abcdef',url=`wss://relay.invalid/room/eg:${b}?private=discarded`
const created=s=>s.event('Network.webSocketCreated',{requestId:'r',url})
const send=(s,m,id='r')=>s.event('Network.webSocketFrameReceived',{requestId:id,response:{opcode:1,payloadData:JSON.stringify(m)}})
const state=(extra={})=>({t:'eg',k:'st',b,seed:123,h:8,egv:10,sg:'trial',hw:1000,dc:[[19,2]],...extra})
const fight=(extra={})=>({t:'eg',k:'efs',h:8,wk:1000,pg:{obj:'orrery',st:[4,5,3,11,11,0],f:6},...extra})

test('late attachment never infers identity from unclassified packets; manual rejoin recovers',()=>{
 const s=new PuzzleSession();send(s,state());send(s,fight());
 assert.equal(s.snapshot().elite,undefined);assert.match(s.snapshot().message,/does not replay/);
 created(s);assert.match(s.snapshot().message,/Waiting for full Elite st/);
 send(s,fight());assert.match(s.snapshot().message,/missing valid breach st/);
 send(s,state());assert.match(s.snapshot().message,/waiting for matching efs/);
 send(s,fight());assert.equal(s.snapshot().elite.used,6);
 s.event('Network.webSocketClosed',{requestId:'r'});assert.equal(s.snapshot().elite,undefined);
 created(s);send(s,state());assert.equal(s.snapshot().elite.hours,undefined);
 send(s,fight({pg:{obj:'orrery',st:[1,2,3,4,5,6],f:17}}));assert.equal(s.snapshot().elite.used,17);
})

test('diagnostics distinguish fight identity, objective, parsing, stale clocks and accepted reset',()=>{
 let now=0;const s=new PuzzleSession(()=>now);created(s);send(s,state());send(s,fight());
 for(const extra of [{h:9},{wk:1001}]){send(s,fight(extra));assert.equal(s.snapshot().elite.hours,undefined);assert.match(s.snapshot().message,/mismatch/);send(s,fight())}
 send(s,fight({pg:{obj:'other'}}));assert.match(s.snapshot().message,/pg.obj/);assert.equal(s.snapshot().elite.hours,undefined);
 send(s,fight());now=5001;send(s,state());assert.equal(s.snapshot().phase,'stale');
 send(s,fight({pg:{obj:'orrery',st:[2,3,4,5,6,7],f:0}}));assert.equal(s.snapshot().elite.used,0);assert.deepEqual(s.snapshot().elite.hours,[2,3,4,5,6,7]);
 s.event('Network.webSocketFrameReceived',{requestId:'r',response:{opcode:1,payloadData:'{broken'}});assert.match(s.snapshot().message,/Malformed room/);assert.equal(s.snapshot().elite,undefined);
 send(s,state());send(s,fight({pg:{obj:'orrery',st:[0],f:0}}));assert.match(s.snapshot().message,/Invalid Orrery clock/);
})
test('room parsing is bounded and only recognizes exact Abyss/Elite room paths',()=>{assert.equal(puzzleRoom(url),`eg:${b}`);assert.equal(puzzleRoom('wss://x/room/sd:123.p0'),'sd:123.p0');for(const v of ['https://x/room/sd:1','wss://x/room/eg:bad','wss://x/room/sd:0','wss://x/room/social','x'.repeat(5000),null])assert.equal(puzzleRoom(v),null)})
test('matching received Elite frames expose only allowlisted seed/hall/decree/clock fields',()=>{
 const s=new PuzzleSession();created(s);send(s,state({co:['PRIVATE'],token:'PRIVATE',nx:[[19,1]]}));send(s,fight());const r=s.snapshot();assert.equal(r.phase,'detected');assert.deepEqual(r.elite,{seed:123,hall:8,law:10,stage:'trial',wake:1000,decrees:[[19,2]],fraying:2,hours:[4,5,3,11,11,0],used:6});assert.equal(JSON.stringify(r).includes('PRIVATE'),false);send(s,fight({pg:{obj:'orrery',st:[0,0,0,0,0,0],f:0}}),'unrelated');assert.equal(s.snapshot().elite.used,6)
 const rev=r.revision;send(s,fight());assert.equal(s.snapshot().revision,rev);send(s,fight({pg:{obj:'orrery',st:[5,5,3,11,11,0],f:7}}));assert.equal(s.snapshot().elite.used,7);assert.ok(s.snapshot().revision>rev)
})
test('hall/wake/circle transitions, stale frames, disconnects and source mismatches withhold old clocks',()=>{
 let now=0;const s=new PuzzleSession(()=>now);created(s);send(s,state());send(s,fight());now=5001;send(s,state());assert.equal(s.snapshot().phase,'stale');send(s,fight());assert.equal(s.snapshot().phase,'detected');send(s,{t:'eg',k:'sg',h:9,sg:'arrive',hw:0});assert.equal(s.snapshot().elite.hours,undefined);send(s,fight());assert.equal(s.snapshot().elite.hours,undefined);send(s,{t:'eg',k:'sg',h:11,sg:'arrive',hw:0});assert.equal(s.snapshot().elite,undefined);send(s,state({egv:11}));send(s,fight());assert.equal(s.snapshot().phase,'unsupported');assert.equal(s.snapshot().elite,undefined);s.event('Network.webSocketClosed',{requestId:'unrelated'});assert.equal(s.snapshot().phase,'unsupported');s.event('Network.webSocketClosed',{requestId:'r'});assert.equal(s.snapshot().elite,undefined)
})
test('bad states, duplicate decrees, malformed payloads, wrong identities and end discard active solutions',()=>{
 for(const bad of [state({b:'ffffffffffffffff'}),state({seed:-1}),state({dc:[[19,1],[19,2]]}),state({dc:[[19,3]]}),fight({pg:{obj:'orrery',st:[12,0,0,0,0,0],f:0}}),{t:'eg',k:'end'}]){const s=new PuzzleSession();created(s);send(s,state());send(s,fight());send(s,bad);assert.equal(s.snapshot().elite,undefined)}
 const s=new PuzzleSession();created(s);send(s,state());send(s,fight());s.event('Network.webSocketFrameReceived',{requestId:'r',response:{opcode:1,payloadData:'x'.repeat(262145)}});assert.equal(s.snapshot().elite,undefined)
})
test('target filtering rejects title-only impersonation and non-loopback debugger connections',()=>{
 const target={type:'page',url:'dagger://game/',webSocketDebuggerUrl:'ws://127.0.0.1:9222/devtools/page/1'};assert.ok(approvedTarget(target,9222));for(const t of [{...target,url:'dagger://launcher/'},{...target,url:'https://evil.invalid',title:'DFO Online'},{...target,webSocketDebuggerUrl:'ws://evil.invalid:9222/devtools/page/1'},{...target,webSocketDebuggerUrl:'ws://127.0.0.1:9223/devtools/page/1'},{...target,webSocketDebuggerUrl:'ws://user:secret@127.0.0.1:9222/devtools/page/1'}])assert.equal(approvedTarget(t,9222),null)
})
test('DFO loopback HTTP launch mode is accepted only at the game entry path',()=>{
 const t={type:'page',url:'http://127.0.0.1:47831/play/index.html',webSocketDebuggerUrl:'ws://127.0.0.1:9222/devtools/page/game'}
 for(const host of ['127.0.0.1','localhost','[::1]'])assert.ok(approvedTarget({...t,url:`http://${host}:47831/play/index.html`},9222))
 for(const url of ['http://evil.invalid:47831/play/index.html','http://127.0.0.1:47831/launcher/index.html','http://127.0.0.1:47831/','http://user:secret@127.0.0.1:47831/play/index.html'])assert.equal(approvedTarget({...t,url},9222),null)
 assert.equal(approvedTarget({...t,type:'worker'},9222),null)
})
test('opt-in observer performs only Network.enable, follows matching events, clears on stop and rejects ambiguous targets',async()=>{
 const RealWS=globalThis.WebSocket;let socket;const commands=[];class Fake extends EventTarget{constructor(){super();socket=this}send(s){commands.push(JSON.parse(s))}close(){this.dispatchEvent(new Event('close'))}emit(m){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(m)}))}}
 globalThis.WebSocket=Fake;let targets=1;const server=createServer((req,res)=>{assert.equal(req.url,'/json/list');res.end(JSON.stringify(Array.from({length:targets},()=>({type:'page',url:'dagger://game/',webSocketDebuggerUrl:`ws://127.0.0.1:${server.address().port}/devtools/page/1`}))));});await new Promise(r=>server.listen(0,'127.0.0.1',r));const o=new OrreryObserver()
 try{assert.equal(o.status().enabled,false);await assert.rejects(o.start(80));await o.start(server.address().port);socket.dispatchEvent(new Event('open'));assert.deepEqual(commands.map(c=>c.method),['Network.enable']);socket.emit({method:'Network.webSocketCreated',params:{requestId:'r',url}});socket.emit({id:1,result:{}});socket.emit({method:'Network.webSocketFrameReceived',params:{requestId:'r',response:{opcode:1,payloadData:JSON.stringify(state())}}});assert.equal(o.status().elite.hall,8);o.stop();assert.equal(o.status().phase,'off');assert.equal(o.status().elite,undefined);const retired=socket;await o.start(server.address().port);socket.dispatchEvent(new Event('open'));socket.emit({id:1,result:{}});retired.emit({method:'Network.webSocketCreated',params:{requestId:'r',url}});assert.equal(o.status().elite,undefined);assert.equal(o.status().phase,'watching');socket.dispatchEvent(new Event('close'));assert.equal(o.status().phase,'error');assert.equal(o.status().elite,undefined);targets=2;await o.start(server.address().port);assert.equal(o.status().phase,'error');assert.equal(o.status().enabled,false)}finally{o.stop();globalThis.WebSocket=RealWS;await new Promise(r=>server.close(r))}
})
