import test from 'node:test'
import assert from 'node:assert/strict'
import {OrreryObserver} from './orrery-observer-loader.mjs'
import {cdpFixture} from './orrery-cdp-fixture.mjs'
import {logic as L} from './orrery-loader.mjs'
import {egBreachNew,egStateOf,egStageWord} from '../../src/net/eliteGates/egBrain.js'
import {egFightState} from '../../src/net/eliteGates/egBodies.js'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
test('real WebSocket CDP transport decodes full DFO producer messages and follows source turns/reset/transition',async()=>{
 const f=await cdpFixture(),o=new OrreryObserver(),b='0123456789abcdef',B=egBreachNew({b,ez:'fixture',s:'fixture',o:'fixture',ew:0,rh:0,seed:123,op:1700000000000,pr:'',co:[]});B.h=8;B.sg='trial';B.hw=1700000001000;B.dc=[[19,2]]
 try{await o.start(f.port);for(let n=0;n<50&&o.status().phase!=='watching';n++)await sleep(20);assert.equal(o.status().phase,'watching');f.push('Network.webSocketCreated',{requestId:'puzzle',url:`wss://fixture.invalid/room/eg:${b}`});const push=m=>f.push('Network.webSocketFrameReceived',{requestId:'puzzle',response:{opcode:1,payloadData:JSON.stringify({t:'eg',...m})}})
 push(egStateOf(B,B.hw));const p=L.elitePuzzleOf(123,8,2),F={h:8,wokeAt:B.hw,bodies:[],blows:[],tethers:[],marks:[],pg:{obj:'orrery',st:p.current.slice(),f:0},zones:[]};push(egFightState(F,B.hw));await sleep(50);assert.equal(o.status().elite.fraying,2);assert.deepEqual(o.status().elite.hours,p.current)
 for(const s of p.steps)for(let n=0;n<s.count;n++){F.pg.st=L.turnHours(p.gear,F.pg.st,s.stone,s.direction==='RIGHT'?1:-1);F.pg.f++;push(egFightState(F,B.hw+1000))}await sleep(50);assert.equal(L.elitePuzzleOf(123,8,2,o.status().elite.hours).turns,0)
 F.pg.st=p.current.slice();F.pg.f=0;push(egFightState(F,B.hw+2000));await sleep(30);assert.equal(o.status().elite.used,0);B.h=9;B.sg='arrive';B.hw=0;push(egStageWord(B,1700000004000));await sleep(30);assert.equal(o.status().elite.hours,undefined);assert.deepEqual(f.commands.map(m=>m.method),['Network.enable']);o.stop();assert.equal(o.status().elite,undefined)
 }finally{o.stop();await f.close()}
})
