import {useEffect,useRef,useState} from 'react'
import {Observer} from './Observer'
import type {OrreryStatus} from '../../../shared/orreryTypes'
import {STONES,breachHall,calibratedPuzzle,elitePuzzleOf,hourShown,measuredGear,puzzleOf,shownToHours,slotFromText,turnHours,withinFray,type OrreryPuzzle} from './logic'
import './orrery.css'

interface Draft {mode:'abyss'|'elite'|'manual';seed:string;hall:number;slot:string;fraying:0|1|2;hours:number[];targets:number[];gear:number[][];measured:boolean[];used:number;fray:number}
const defaults=():Draft=>({mode:'elite',seed:'',hall:8,slot:'',fraying:0,hours:Array(6).fill(12),targets:Array(6).fill(12),gear:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i===j?1:0)),measured:Array(6).fill(false),used:0,fray:48})
const storageKey='karaops.orrery.v08'
function load():Draft{try{const raw=localStorage.getItem(storageKey);if(!raw||raw.length>12000)return defaults();const d=JSON.parse(raw);if(!['abyss','elite','manual'].includes(d.mode)||typeof d.seed!=='string'||typeof d.slot!=='string'||d.seed.length>40||d.slot.length>4096||!Number.isInteger(d.hall)||d.hall<1||d.hall>10000||![0,1,2].includes(d.fraying)||!Number.isInteger(d.used)||d.used<0||d.used>48||!Number.isInteger(d.fray)||d.fray<1||d.fray>48)return defaults();shownToHours(d.hours);shownToHours(d.targets);if(d.gear.length!==6||d.gear.some((r:number[])=>r.length!==6||r.some(x=>!Number.isInteger(x)||Math.abs(x)>11))||d.measured.length!==6||d.measured.some((x:unknown)=>typeof x!=='boolean'))return defaults();return d}catch{return defaults()}}
export function Orrery(){
 const [observed,setObserved]=useState<OrreryStatus|null>(null),[following,setFollowing]=useState(false)
 const wasFollowing=useRef(false)
 const [d,setDraft]=useState<Draft>(load),[run,setRun]=useState<OrreryPuzzle|null>(null),[error,setError]=useState(''),[dirty,setDirty]=useState(false),[confirmed,setConfirmed]=useState(0),[compact,setCompact]=useState(false),[measurement,setMeasurement]=useState<{stone:number;before:number[]}|null>(null)
 function update(p:Partial<Draft>,identity=false){setDraft(prev=>{const next={...prev,...p};try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{}return next});setError('');if(identity){setRun(null);setMeasurement(null);setConfirmed(0)}else setDirty(true)}
 let hallInfo='';try{if(d.mode==='elite'&&/^\d+$/.test(d.seed)){const s=breachHall(Number(d.seed),d.hall);hallInfo=`Hall ${d.hall} · Circle ${s.circle} · ${s.kind}${s.twist?' · '+s.twist:''}`}}catch(e){hallInfo=String((e as Error).message)}
 function generate(){try{
   let p:OrreryPuzzle
   if(d.mode==='elite'){if(!/^\d+$/.test(d.seed))throw Error('Enter the breach seed as decimal digits. If unavailable, use Manual calibration.');p=elitePuzzleOf(Number(d.seed),d.hall,d.fraying)}
   else {const slot=slotFromText(d.slot);if(slot===null)throw Error('Enter a positive slot ID or sd:<slot> room key.');p=puzzleOf(slot)}
   update({hours:p.initial,targets:p.target,used:0},true);setRun(p);setDirty(false);setCompact(true);setError('')
 }catch(e){setRun(null);setError((e as Error).message)}}
 function recalculate(){try{
   if(measurement)throw Error('Finish or cancel the active gearing measurement first.')
   let p:OrreryPuzzle
   if(d.mode==='manual'){if(!d.measured.every(Boolean))throw Error('Measure all six handle rows before solving without a seed.');p=calibratedPuzzle(shownToHours(d.hours),shownToHours(d.targets),d.gear,d.fray)}
   else if(d.mode==='elite'){if(!/^\d+$/.test(d.seed))throw Error('Enter a decimal breach seed.');p=elitePuzzleOf(Number(d.seed),d.hall,d.fraying,shownToHours(d.hours))}
   else{const slot=slotFromText(d.slot);if(slot===null)throw Error('Enter a valid Abyss slot.');p=puzzleOf(slot,shownToHours(d.hours))}
   withinFray(p.turns,d.used,p.fray);setRun(p);setDirty(false);setError('');setConfirmed(0)
 }catch(e){setRun(null);setError((e as Error).message)}}
 const budget=run?run.turns+d.used<=run.fray:true
 function acknowledge(){if(!run||dirty||!budget||!run.steps.length)return;const s=run.steps[0],current=turnHours(run.gear,run.current,s.stone,s.direction==='RIGHT'?1:-1);const next=calibratedPuzzle(current,shownToHours(run.target),run.gear,run.fray);update({hours:current.map(hourShown),used:d.used+1});setRun({...run,current:next.current,steps:next.steps,turns:next.turns,order:next.order});setDirty(false);setConfirmed(n=>n+1)}
 function capture(stone:number){try{if(d.used>=d.fray-1)throw Error('Not enough fray for a safe measurement. Re-read the puzzle after a reset.');setMeasurement({stone,before:shownToHours(d.hours)});setRun(null);setError('')}catch(e){setError((e as Error).message)}}
 function record(){if(!measurement)return;try{const row=measuredGear(measurement.before,shownToHours(d.hours),measurement.stone);update({gear:d.gear.map((r,i)=>i===measurement.stone?row:r),measured:d.measured.map((v,i)=>i===measurement.stone?true:v),used:d.used+1});setMeasurement(null)}catch(e){setError((e as Error).message)}}
 useEffect(()=>{
  if(!following){if(wasFollowing.current){setRun(null);setError('Observation following stopped. Recalculate manually before continuing.')}wasFollowing.current=false;return}
  wasFollowing.current=true
  const e=observed?.elite
  if(observed?.phase!=='detected'||!e?.hours||e.used===undefined||e.stage!=='trial'||e.law!==10){setRun(null);setError('Waiting for a fresh, matching Elite Orrery snapshot. Automatic instructions withheld.');return}
  try{const p=elitePuzzleOf(e.seed,e.hall,e.fraying,e.hours);withinFray(p.turns,e.used,p.fray);setDraft(prev=>({...prev,mode:'elite',seed:String(e.seed),hall:e.hall,fraying:e.fraying,hours:e.hours!.map(hourShown),targets:p.target,used:e.used!}));setRun(p);setDirty(false);setCompact(true);setConfirmed(0);setMeasurement(null);setError('')}catch(e){setRun(null);setError((e as Error).message)}
 },[following,observed?.phase,observed?.revision])
 return <div className={`orrery ${compact&&run?'compact':''}`}>
  <div className="eyebrow">MODULE / OFFLINE PUZZLE SOLVER</div><h1>Orrery Solver</h1>
  <p>Abyss Dungeon and Elite Breach Athenaeum. Instructions only; you turn every handle in-game.</p>
  <Observer onStatus={setObserved} following={following} onFollow={setFollowing}/>
  {following&&<p role="status">Following observed Elite state. Instructions update from received snapshots; manual progress confirmation is disabled.</p>}
  {run&&<button className="orrery-view" onClick={()=>setCompact(v=>!v)}>{compact?'Edit setup and clocks':'Compact run view'}</button>}
  <fieldset disabled={following} style={{border:0,padding:0,margin:0,minWidth:0}}>
  <div className="orrery-modes" role="group" aria-label="Puzzle mode">{(['elite','abyss','manual'] as const).map(mode=><button className={d.mode===mode?'selected':''} key={mode} onClick={()=>update({mode},true)}>{mode==='elite'?'Elite Breach':mode==='abyss'?'Abyss Dungeon':'Manual calibration'}</button>)}</div>
  <section className="orrery-panel orrery-setup">
   {d.mode==='elite'&&<><div className="orrery-inputs"><label>Breach seed<input aria-label="Breach seed" inputMode="numeric" value={d.seed} maxLength={10} onChange={e=>update({seed:e.target.value},true)}/></label><label>Hall number<input aria-label="Hall number" type="number" min={1} max={10000} value={d.hall} onChange={e=>update({hall:Number(e.target.value)},true)}/></label><label>Fraying decree<select aria-label="Fraying decree" value={d.fraying} onChange={e=>update({fraying:Number(e.target.value) as 0|1|2},true)}><option value={0}>None (48)</option><option value={1}>Rank I — depth adjusted</option><option value={2}>Rank II — depth adjusted</option></select></label></div><p role="status">{hallInfo||'Enter seed and hall to identify the source-derived circle and hall kind.'}</p></>}
   {d.mode==='abyss'&&<label>Abyss slot or room key<input aria-label="Abyss slot" placeholder="sd:123.p0 or 123" maxLength={4096} value={d.slot} onChange={e=>update({slot:e.target.value},true)}/></label>}
   {d.mode!=='manual'&&<><button onClick={generate}>Generate fresh puzzle</button><small>Resets local progress/fray to zero. Use only for an untouched puzzle or confirmed snap. For a moved puzzle, enter all current hours and used fray below, then recalculate.</small></>}
   {d.mode==='manual'&&<><p>Read the target hours from the six plaques. Measure every handle’s gearing: enter all six hours, capture “before”, turn that handle FORWARD once yourself, wait for it to settle, enter all six hours again and record. Repeat for six handles. Calibration costs fray; never undo a measurement without updating hours and used fray.</p><label>Observed fray limit<input aria-label="Manual fray limit" type="number" min={1} max={48} value={d.fray} onChange={e=>update({fray:Number(e.target.value)})}/></label></>}
  </section>
  <section className="orrery-panel orrery-edit-clocks"><h2>Six clocks</h2><div className="orrery-clocks">{STONES.map((name,i)=><div className="orrery-clock" key={name}><strong>{name}</strong><label>Current<input aria-label={`${name} current hour`} type="number" min={1} max={12} value={d.hours[i]} onChange={e=>update({hours:d.hours.map((v,j)=>i===j?Number(e.target.value):v)})}/></label><label>Target{d.mode==='manual'?<input aria-label={`${name} target hour`} type="number" min={1} max={12} value={d.targets[i]} onChange={e=>update({targets:d.targets.map((v,j)=>i===j?Number(e.target.value):v)})}/>:<output>{run?run.target[i]:'—'}</output>}</label>{d.mode==='manual'&&<button disabled={!!measurement} onClick={()=>capture(i)}>{d.measured[i]?'Re-measure':'Capture before'} {name}</button>}</div>)}</div>
   {measurement&&<div className="orrery-notice"><strong>Measuring {STONES[measurement.stone]}: turn RIGHT / forward exactly once in-game.</strong><p>Enter the six resulting hours above, then record. Do not turn another handle during this measurement.</p><button onClick={record}>Record observed forward turn</button> <button onClick={()=>setMeasurement(null)}>Cancel measurement</button></div>}
   <div className="orrery-inputs"><label>Used fray (all players’ turns)<input aria-label="Used fray" type="number" min={0} max={47} value={d.used} onChange={e=>update({used:Number(e.target.value)})}/></label><button onClick={recalculate}>Recalculate from current hours</button></div>
   <small>Current hours and progress are manual observations. A refused click does not count. After a snap, re-read all clocks and set used fray to 0. Any other player’s turn invalidates the displayed route.</small>
  </section>
  </fieldset>
  {error&&<p role="alert" className="orrery-error">{error}</p>}
  {run&&<section className="orrery-panel" aria-label="Computed solution"><h2>{d.mode==='elite'?`Hall ${run.hall} · Circle ${run.circle}`:d.mode==='abyss'?`Abyss slot ${run.slot}`:'Calibrated puzzle'}</h2>
   {compact&&<div className="orrery-clocks orrery-readout">{STONES.map((s,i)=><div key={s}><strong>{s}</strong><span>{hourShown(run.current[i])} → {run.target[i]}</span><small>current → target</small></div>)}</div>}
   {dirty?<p role="alert">Inputs changed — recalculate before following instructions.</p>:<><div className="orrery-summary"><strong>{run.turns} turns remaining</strong><span>{d.used} / {run.fray} fray used</span><span>{confirmed} presses confirmed locally</span></div>
   {!budget&&<p role="alert" className="orrery-error">Shortest route exceeds remaining fray. It would snap before Concord. Do not follow it as a continuous route; re-read after a game reset.</p>}
   {run.turns===0?<p className="orrery-success">All six clocks match the targets — Concord.</p>:<><p>RIGHT = forward (+1), LEFT = backward (−1), as you face the named stone. Allow at least 700 ms between turns of the same stone; confirm only accepted, settled turns.</p><ol className="orrery-steps">{run.steps.map((s,i)=><li key={s.stone} className={i===0?'next':''}><strong>{s.name}</strong><span>{s.direction==='RIGHT'?'FORWARD / RIGHT':'BACKWARD / LEFT'} × {s.count}</span></li>)}</ol><button disabled={!budget||following} onClick={acknowledge}>I turned {run.steps[0].name} {run.steps[0].direction} once</button><small>Confirms ONE manual turn and updates all geared clocks. No game command is sent.</small></>}
   </>}
   <details><summary>Gearing and shortest-route evidence</summary><p>Each row is one forward handle turn; columns follow the six named clocks above. Source-compatible triangular gearing has one solution modulo 12; choosing each residue’s shortest direction gives a global minimum handle count. Walking time between stones is not optimized.</p><table><thead><tr><th>Handle</th>{STONES.map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{run.gear.map((r,i)=><tr key={i}><th>{STONES[i]}</th>{r.map((v,j)=><td key={j}>{v>0?'+':''}{v}</td>)}</tr>)}</tbody></table></details>
  </section>}
  <p className="orrery-live">Manual solving is always available. Optional CDP puzzle observation is opt-in, read-only and source-tested; actual game-runtime compatibility is not certified. Pinned DFO law; if the game differs, disconnect observation and use measured calibration.</p>
 </div>
}
