import {useEffect,useState} from 'react'
import type {LiveStatus} from '../../../shared/liveTypes'
export function Companion({onState}:{onState:(status:LiveStatus)=>void}){
 const [origin,setOrigin]=useState(''),[consent,setConsent]=useState(false),[error,setError]=useState('')
 const [status,setStatus]=useState<LiveStatus>({enabled:false,state:'off',reason:'Live receiver is off'})
 useEffect(()=>{let active=true,polling=false,last=''
  const poll=async()=>{if(polling)return;polling=true;try{const value=await window.karaops.companion.status(),key=JSON.stringify([value.state,value.frame?.streamId,value.frame?.sequence,value.reason,value.endpoint]);if(active&&key!==last){last=key;setStatus(value);onState(value)}}catch(e){if(active){setError(String(e));onState({enabled:false,state:'error',reason:'Receiver unavailable; live marker hidden'})}}finally{polling=false}}
  void poll();const timer=setInterval(()=>void poll(),250);return()=>{active=false;clearInterval(timer)}
 },[onState])
 async function start(){try{setError('');const s=await window.karaops.companion.start(origin);setStatus(s);onState(s)}catch(e){setError(String(e))}}
 return <details className="jackpot"><summary>Live companion — opt-in receiver / producer integration pending</summary>
  <p>Developer approval was reported by you. This receiver accepts a narrow, read-only telemetry schema from an explicitly integrated game producer. No producer has been installed or validated against the running game. The DFO checkout remains unchanged.</p>
  <label>Exact approved game origin<input value={origin} disabled={status.enabled} placeholder="https://your-game-host" maxLength={300} onChange={e=>setOrigin(e.target.value)}/></label>
  <label><input type="checkbox" checked={consent} disabled={status.enabled} onChange={e=>setConsent(e.target.checked)}/>I authorize local telemetry from the developer-approved game integration.</label>
  <button disabled={!consent||!origin||status.enabled} onClick={()=>void start()}>Enable local receiver</button>
  <button disabled={!status.enabled} onClick={()=>void window.karaops.companion.stop().then(()=>{const s:LiveStatus={enabled:false,state:'off',reason:'Receiver off; all live markers hidden'};setStatus(s);onState(s)}).catch(e=>setError(String(e)))}>Disable local receiver</button>
  <p role="status">Receiver: {status.state}. {status.reason}</p>{error&&<p role="alert">{error}</p>}
  {status.enabled&&<details><summary>Private pairing details (never share or put in a URL)</summary><p>Endpoint: {status.endpoint}</p><p>One-session Authorization bearer token: <code>{status.token}</code></p><p>Origin: {status.origin}. No account credentials are read. Stopping the receiver invalidates the token.</p></details>}
  <button disabled>Aurum ESP — awaiting game producer and runtime alignment validation</button>
  <button disabled>Live GPS / automatic rerouting — awaiting validated live integration</button>
  <p>Matching map/source/assets/layout identifiers are required before any telemetry player marker is shown. A marker is received telemetry, not a certified game measurement. Stale, unfocused, disconnected or mismatched data is hidden. No direct line is represented as a walking route.</p>
 </details>
}
