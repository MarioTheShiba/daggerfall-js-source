import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { OrreryStatus } from '../../../shared/orreryTypes'
import {puzzleOf, slotFromText, STONES} from './logic'

const panel:CSSProperties={background:'#172131',border:'1px solid #344458',borderRadius:12,padding:20,margin:'16px 0'}
const field:CSSProperties={background:'#0b1522',color:'#f6e4b7',padding:'10px 13px',borderRadius:7,border:'1px solid #506077',maxWidth:280}
const action:CSSProperties={background:'#e7bd70',color:'#121721',padding:'10px 17px',fontWeight:750,border:'none',borderRadius:8,cursor:'pointer'}
const secondary:CSSProperties={...action,background:'#354359',color:'#eff3f8'}
const empty:OrreryStatus={enabled:false,phase:'off',message:'Observer is off.'}
export function Orrery(){
 const [status,setStatus]=useState<OrreryStatus>(empty)
 const [port,setPort]=useState(9222)
 const [slotText,setSlotText]=useState('')
 const [manual,setManual]=useState<number|null>(null)
 const [fray,setFray]=useState(48)
 const [completed,setCompleted]=useState(0)
 const [working,setWorking]=useState(false)
 const [error,setError]=useState('')
 const slot=status.enabled&&status.slot?status.slot:manual
 const puzzle=useMemo(()=>{if(slot===null)return null;try{return puzzleOf(slot)}catch{return null}},[slot])
 useEffect(()=>{let active=true;const refresh=()=>{void window.karaops.orrery.status().then(x=>{if(active)setStatus(x)}).catch(()=>{})};refresh();const timer=setInterval(refresh,600);return()=>{active=false;clearInterval(timer)}},[])
 useEffect(()=>setCompleted(0),[slot])
 async function begin(){setWorking(true);setError('');try{setStatus(await window.karaops.orrery.start(port))}catch(e){setError(String(e))}finally{setWorking(false)}}
 async function stop(){setWorking(true);setError('');try{setStatus(await window.karaops.orrery.stop())}catch(e){setError(String(e))}finally{setWorking(false)}}
 function submit(){const value=slotFromText(slotText);if(value===null){setError('Enter a positive slot ID or an sd:<slot> room key.');return}setError('');setManual(value);setCompleted(0)}
 const totalUsed=puzzle?.steps.slice(0,completed).reduce((s,x)=>s+x.count,0)??0
 const remaining=(puzzle?.turns??0)-totalUsed
 return <div>
   <div className="eyebrow">MODULE / SHATTERED HOUR</div>
   <h1>Orrery of Endings</h1>
   <p className="lead">Automatically identify your Shattered Hour slot from DFO's new WebSocket connection, then reconstruct the six clocks and guide your turns. You operate the handles yourself.</p>
   <section style={panel}>
     <h2>DFO DevTools connection</h2>
     <p>Read-only · opt-in · local computer only · WebSocket URL metadata, not messages or gameplay commands.</p>
     <label style={{display:'block',marginBottom:8}}>DFO debugging port</label>
     <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
       <input aria-label="Debugging port" type="number" value={port} min={1024} max={65535} onChange={e=>setPort(Number(e.target.value))} style={field}/>
       {!status.enabled?<button type="button" disabled={working} style={action} onClick={()=>void begin()}>CONNECT TO DFO</button>
       :<button type="button" disabled={working} style={secondary} onClick={()=>void stop()}>DISCONNECT</button>}
     </div>
     <p style={{color:status.phase==='detected'?'#9fe4b5':'#b4c4d5',marginTop:14}}>{status.message}</p>
     {status.room&&<p>Current detected room: <code>{status.room}</code></p>}
     <p style={{fontSize:13,color:'#b4c4d5'}}>Start DFO with <code>--remote-debugging-port=9222 --remote-debugging-address=127.0.0.1</code>, then connect KaraOps BEFORE entering the Hour. DevTools' menu toggle by itself does not start this network endpoint.</p>
   </section>
   <section style={panel}>
     <h2>Manual fallback</h2>
     <p>If DFO is already inside the Hour, or its client does not expose a CDP target, enter the room or slot here.</p>
     <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
       <input value={slotText} onChange={e=>setSlotText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit()}} style={field} placeholder="sd:123.p0 or 123"/>
       <button type="button" onClick={submit} style={secondary}>SOLVE SLOT</button>
     </div>
   </section>
   {error&&<p style={{color:'#ffb1b1'}}>{error}</p>}
   {puzzle&&<section style={panel}>
     <h2>Solution for Hollow #{puzzle.slot}</h2>
     <p>The starting hours and exact targets are reconstructed locally. This route assumes clocks haven't been moved by other players.</p>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:8}}>
       {STONES.map((name,i)=><div key={name} style={{padding:10,border:'1px solid #344458',borderRadius:8}}><strong>{name}</strong><div style={{color:'#d0b376'}}>Start {puzzle.initial[i]} → Target {puzzle.target[i]}</div></div>)}
     </div>
     <div style={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:12,margin:'16px 0'}}>
       <strong>{remaining} handle presses remaining</strong>
       <label>Fray limit <select style={field} value={fray} onChange={e=>setFray(Number(e.target.value))}><option value={48}>48 normal</option><option value={36}>36 Fraying</option></select></label>
       <button style={secondary} onClick={()=>setCompleted(0)}>RESET PROGRESS</button>
     </div>
     {remaining>fray-totalUsed&&<p style={{color:'#ffb1b1'}}>Warning: this route may exceed the selected fray budget.</p>}
     {puzzle.steps.length===0&&<p>The six clocks already match the targets.</p>}
     {puzzle.steps.map((step,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',gap:14,padding:14,margin:'8px 0',borderRadius:8,border:'1px solid '+(i===completed?'#c8a35f':'#344458'),opacity:i<completed?.55:1}}>
       <span><strong>{i+1}. {step.name}</strong> — {step.direction} × {step.count}</span>
       <span>{i<completed?'✓':i===completed?'NEXT':''}</span>
     </div>)}
     <button disabled={completed>=puzzle.steps.length} type="button" style={action} onClick={()=>setCompleted(v=>v+1)}>{completed>=puzzle.steps.length?'✓ ROUTE COMPLETED':'I COMPLETED THE HIGHLIGHTED GROUP'}</button>
     <p style={{fontSize:13,color:'#b4c4d5',marginTop:14}}>Only mark a group complete after making its actual in-game turns. If anyone moved a clock, use the standalone manual calibration solver instead. No movement or turn is sent to DFO.</p>
   </section>}
   {!puzzle&&<section style={panel}>No dungeon detected yet. Connect to DFO, enter the Shattered Hour, or supply a slot manually.</section>}
 </div>
}
