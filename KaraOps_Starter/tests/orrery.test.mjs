import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {logic as L,reference as R} from './orrery-loader.mjs'
const raw=p=>readFileSync(p,'utf8')
function replay(p){let st={st:p.current.slice(),f:0,ok:false};const o={gear:p.gear,truth:p.target.map(x=>x%12),start:p.initial.map(x=>x%12),fray:p.fray};for(const s of p.steps)for(let n=0;n<s.count;n++){st=R.orreryStep(o,st,s.stone,s.direction==='RIGHT'?1:-1);assert.ok(st);assert.equal(st.x,false)}assert.deepEqual(st.st,o.truth)}
test('Abyss existing slot generation remains source-exact across 216 omen slots',()=>{
 for(let slot=1;slot<=216;slot++){const o=R.orreryOf(slot),p=L.puzzleOf(slot);assert.deepEqual(p.initial,o.start.map(L.hourShown));assert.deepEqual(p.target,o.truth.map(L.hourShown));assert.deepEqual(p.gear,o.gear);assert.equal(p.fray,o.fray);assert.equal(p.turns,R.orreryShortest(o,o.start));replay(p)}
})
test('Elite source generation, deep halls, all Fraying ranks and partially turned puzzles',()=>{
 let count=0,deep=0
 for(const seed of [0,1,123,8675309,2147483647,4294967295])for(const hall of [8,13,28,53,78,103,128,203,278,503,1003]){
  const info=L.breachHall(seed,hall);assert.equal(info.circle,Math.ceil(hall/5));if(info.kind!=='athenaeum')continue
  for(const rank of [0,1,2]){const p=L.elitePuzzleOf(seed,hall,rank);const o=R.orreryOf((R.egSeed(seed,0x0a7e+hall)%2147483646)+1,{...R.egOrreryTurns(info.circle),...(rank?{fray:R.egFrayOf(info.circle,rank)}:{})});assert.deepEqual(p.initial,o.start.map(L.hourShown));assert.deepEqual(p.target,o.truth.map(L.hourShown));assert.deepEqual(p.gear,o.gear);assert.equal(p.turns,R.orreryShortest(o,o.start));assert.ok(p.turns>=R.egOrreryTurns(info.circle).turnsMin);assert.ok(p.turns<=R.egOrreryTurns(info.circle).turnsMax);replay(p)
   let current=p.current;for(let i=0;i<17;i++)current=R.orreryTurn(o,current,i%6,i%2?1:-1);const changed=L.elitePuzzleOf(seed,hall,rank,current);assert.equal(changed.turns,R.orreryShortest(o,current));replay(changed);count++;if(hall>=100)deep++
  }
 }
 assert.ok(count>30);assert.ok(deep>10)
})
test('shortest routes independently minimize every unique handle residue, including half-turn ties',()=>{
 for(let slot=1;slot<=80;slot++){const p=L.puzzleOf(slot),solution=R.orrerySolve({order:p.order,gear:p.gear,truth:p.target.map(x=>x%12)},p.current);const minimum=solution.reduce((n,t)=>n+Math.min(...Array.from({length:7},(_,k)=>Math.abs(t+(k-3)*12))),0);assert.equal(p.turns,minimum);assert.ok(p.steps.every(s=>s.count<=6));replay(p)}
 // Exhaust all 12^2 handle residues on a coupled two-clock subproblem independently of back-substitution.
 const gear=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?1:0));gear[1][0]=-2
 for(let a=0;a<12;a++)for(let b=0;b<12;b++){const target=[a,b,0,0,0,0],route=L.routeFor(gear,Array(6).fill(0),target);let best=Infinity;for(let x=0;x<12;x++)for(let y=0;y<12;y++)if(((x-2*y)%12+12)%12===a&&y===b)best=Math.min(best,Math.min(x,12-x)+Math.min(y,12-y));assert.equal(route.turns,best)}
})
test('manual gearing measurements reconstruct real puzzles and reject unsupported or corrupt calibration',()=>{
 for(let slot=1;slot<=20;slot++){const p=L.puzzleOf(slot),gear=p.gear.map((_,i)=>L.measuredGear(p.current,L.turnHours(p.gear,p.current,i,1),i)),manual=L.calibratedPuzzle(p.current,p.target.map(x=>x%12),gear,p.fray);assert.equal(manual.turns,p.turns);replay(manual)}
 assert.throws(()=>L.measuredGear([0,0,0,0,0,0],[0,0,0,0,0,0],0),/forward measurement/)
 const cycle=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?1:0));cycle[0][1]=1;cycle[1][0]=1;assert.throws(()=>L.routeFor(cycle,Array(6).fill(0),Array(6).fill(0)),/not proof/)
})
test('fray budget honors Concord before snap, rank/depth bounds and solved state',()=>{
 assert.equal(L.withinFray(12,24,36),true);assert.equal(L.withinFray(13,24,36),false);assert.throws(()=>L.withinFray(1,36,36),/after a snap/)
 assert.equal(L.withinFray(0,36,36),true)
 for(const c of [1,5,6,20,21,56,201]){const range=R.egOrreryTurns(c);assert.ok(range.turnsMax<=36);assert.equal(R.egFrayOf(c,1),Math.min(48,36+2*Math.floor((c-1)/5)));assert.equal(R.egFrayOf(c,2),Math.min(48,32+2*Math.floor((c-1)/5)))}
 const p=L.puzzleOf(1),o={gear:p.gear,truth:p.target.map(x=>x%12),start:p.current,fray:p.fray},last=p.steps.at(-1),dir=last.direction==='RIGHT'?1:-1,almost=R.orreryTurn(o,o.truth,last.stone,-dir),s=R.orreryStep(o,{st:almost,f:p.fray-1,ok:false},last.stone,dir);assert.equal(s.ok,true);assert.equal(s.x,false);assert.equal(s.f,p.fray)
 const miss=R.orreryStep(o,{st:o.start,f:p.fray-1,ok:false},0,1);assert.equal(miss.x,true);assert.equal(miss.f,0)
 assert.equal(L.puzzleOf(1,o.truth).turns,0)
})
test('invalid identity, hours, unsupported halls and URL inputs fail explicitly',()=>{
 for(const seed of [-1,4294967296,NaN,1.5])assert.throws(()=>L.elitePuzzleOf(seed,8))
 for(const h of [0,10001,NaN,8.5])assert.throws(()=>L.breachHall(1,h))
 assert.throws(()=>L.elitePuzzleOf(1,1),/not an Athenaeum/);assert.throws(()=>L.puzzleOf(0));assert.throws(()=>L.shownToHours([0,1,2,3,4,5]));assert.throws(()=>L.puzzleOf(1,[12,0,0,0,0,0]))
 assert.equal(L.slotFromText('sd:123.p0'),123);assert.equal(L.slotFromText('https://example.invalid/room/sd:123.p0'),123);assert.equal(L.slotFromText('123'),123);assert.equal(L.slotFromText('eg:123'),null)
})
test('Orrery exposes manual observations only, and reuses existing sandbox and data storage',()=>{
 const ui=raw('src/renderer/src/orrery/Orrery.tsx');assert.match(ui,/Live puzzle detection unavailable/);assert.doesNotMatch(ui,/window\.karaops|fetch\(|WebSocket|remote-debugging-port/);assert.match(raw('src/renderer/src/App.tsx'),/<Orrery/);assert.match(ui,/Inputs changed/);assert.match(ui,/I turned/);assert.match(ui,/localStorage/)
})
