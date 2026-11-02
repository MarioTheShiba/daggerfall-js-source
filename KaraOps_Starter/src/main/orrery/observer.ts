import type {OrreryStatus} from '../../shared/orreryTypes'
import {PuzzleSession} from './protocol'
export function approvedTarget(t:any,port:number):string|null{
 try{if(t?.type!=='page'||typeof t.url!=='string'||t.url.length>4096)return null;const game=new URL(t.url);if(!(game.protocol==='dagger:'&&game.hostname==='game')&&!(game.protocol==='https:'&&['daggerfalljs.dev','www.daggerfalljs.dev'].includes(game.hostname)))return null
 const ws=new URL(t.webSocketDebuggerUrl);return ws.protocol==='ws:'&&['127.0.0.1','localhost','[::1]'].includes(ws.hostname)&&Number(ws.port)===port&&ws.pathname.startsWith('/devtools/page/')&&!ws.username&&!ws.password&&!ws.search&&!ws.hash?ws.href:null}catch{return null}
}
export class OrreryObserver {
 private ws:WebSocket|null=null
 private generation=0
 private enabled=false
 private message='Observer off. Manual solving is available.'
 private phase:OrreryStatus['phase']='off'
 private session=new PuzzleSession()
 stop():OrreryStatus{this.enabled=false;this.generation++;const ws=this.ws;this.ws=null;ws?.close();this.session.clear();this.phase='off';this.message='Observer stopped; no connection active.';return this.status()}
 status():OrreryStatus{return this.enabled&&this.phase==='watching'?this.session.snapshot():{enabled:this.enabled,phase:this.phase,message:this.message,revision:0}}
 async start(value:unknown):Promise<OrreryStatus>{
  if(typeof value!=='number'||!Number.isInteger(value)||value<1024||value>65535)throw Error('Choose a local debugging port from 1024 to 65535.')
  this.stop();this.enabled=true;this.phase='connecting';this.message='Connecting to the opt-in local DFO debugging endpoint.';const gen=++this.generation
  try{
   const r=await fetch(`http://127.0.0.1:${value}/json/list`,{signal:AbortSignal.timeout(2000),redirect:'error'})
   if(!r.ok||!r.body)throw Error('No target list')
   const reader=r.body.getReader();let body='',size=0;try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>100000)throw Error('Target list too large');body+=new TextDecoder().decode(part.value)}}finally{await reader.cancel()}
   if(gen!==this.generation)return this.status()
   const list=JSON.parse(body);if(!Array.isArray(list)||list.length>100)throw Error('Invalid target list')
   const targets=list.map(t=>approvedTarget(t,value)).filter(Boolean);if(targets.length!==1)throw Error('Open exactly one supported DFO game target, then reconnect.')
   const socket=new WebSocket(targets[0]!);this.ws=socket
   socket.addEventListener('open',()=>{if(gen!==this.generation){socket.close();return}socket.send(JSON.stringify({id:1,method:'Network.enable',params:{maxTotalBufferSize:1048576,maxResourceBufferSize:262144,maxPostDataSize:0}}))})
   socket.addEventListener('message',event=>{if(gen!==this.generation)return;const s=typeof event.data==='string'?event.data:'';if(s.length>1048576){this.session.clear();return}try{const m=JSON.parse(s);if(m.id===1){if(m.error){this.fail('DFO refused observation; reconnect manually.');return}this.phase='watching'}else if(this.phase==='watching'&&typeof m.method==='string')this.session.event(m.method,m.params)}catch{this.session.clear()}})
   const timer=setTimeout(()=>{if(gen===this.generation&&this.phase==='connecting')this.fail('Debugger handshake timed out. Reconnect manually.')},3000);timer.unref()
   socket.addEventListener('close',()=>{clearTimeout(timer);if(gen===this.generation)this.fail('Debugger disconnected. Automatic state cleared; reconnect manually.')})
   socket.addEventListener('error',()=>{if(gen===this.generation)this.fail('Debugger connection failed. Reconnect manually.')})
  }catch{if(gen===this.generation)this.fail('Cannot connect. Start DFO with loopback remote debugging and exactly one supported game window, then reconnect.')}
  return this.status()
 }
 private fail(message:string){const ws=this.ws;this.ws=null;this.generation++;ws?.close();this.session.clear();this.phase='error';this.message=message;this.enabled=false}
}
