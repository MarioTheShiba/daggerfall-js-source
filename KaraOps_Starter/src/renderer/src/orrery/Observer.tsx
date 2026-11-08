import {useEffect,useState} from 'react'
import type {OrreryStatus} from '../../../shared/orreryTypes'
export function Observer({onStatus,following,onFollow}:{onStatus:(s:OrreryStatus)=>void;following:boolean;onFollow:(v:boolean)=>void}){
 const [status,setStatus]=useState<OrreryStatus|null>(null),[port,setPort]=useState(9222),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{let active=true,pending=false;const refresh=async()=>{if(pending)return;pending=true;try{const s=await window.karaops.orrery.status();if(active){setStatus(s);onStatus(s)}}catch{if(active){onFollow(false);setError('Observer status unavailable.')}}finally{pending=false}};void refresh();const timer=setInterval(()=>void refresh(),500);return()=>{active=false;clearInterval(timer)}},[onStatus,onFollow])
 async function toggle(){setBusy(true);setError('');try{const s=await (status?.enabled?window.karaops.orrery.stop():window.karaops.orrery.start(port));setStatus(s);onStatus(s)}catch(e){setError(String(e))}finally{setBusy(false)}}
 return <details className="orrery-panel"><summary>Optional DFO connection · port {port}{status?' · '+status.phase:''}</summary>
  <p>Explicit local CDP observation. Reads incoming puzzle fields on matched Abyss/Elite room sockets only. No gameplay commands, script evaluation or account data retained. Connect before entering or rejoining the room. CDP cannot replay creation of existing sockets: manually rejoin after connecting. A game-state bridge would require separate explicit authorization and is not implemented.</p>
  <label>DFO debugging port<input aria-label="DFO debugging port" type="number" min={1024} max={65535} value={port} disabled={status?.enabled} onChange={e=>setPort(Number(e.target.value))}/></label>
  <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I authorize read-only observation of this local DFO debugging session.</label>
  <button disabled={busy||(!status?.enabled&&!consent)} onClick={()=>void toggle()}>{status?.enabled?'Disconnect observer':'Connect observer'}</button>
  <p role="status">{status?.message??'Observer off. Manual solving remains available.'}</p>{error&&<p role="alert">{error}</p>}
  {status?.elite&&<p>Observed Hall {status.elite.hall} · law {status.elite.law} · Fraying {status.elite.fraying===0?'none':`rank ${status.elite.fraying}`} · {status.elite.stage}. Active decrees (ID/rank): {status.elite.decrees.map(p=>p.join('/')).join(', ')||'none'}</p>}
  {status?.slot&&<p>Observed Abyss slot: <strong>{status.slot}</strong>. Enter it in Abyss mode; current hours are not observed.</p>}
  <label><input aria-label="Follow observed Elite puzzle" type="checkbox" checked={following} onChange={e=>onFollow(e.target.checked)}/>Follow observed Elite puzzle and recalculate after accepted turns</label>
  <small>Start DFO with <code>--remote-debugging-port=9222 --remote-debugging-address=127.0.0.1</code>. No game-runtime certification: this integration is source-tested; actual compatibility depends on the running DFO client. Law mismatch, stale data or missing clocks withhold instructions.</small>
 </details>
}
