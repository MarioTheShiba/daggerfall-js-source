import type {OrreryStatus} from '../../shared/orreryTypes'
import {PuzzleSession} from './protocol'
export function approvedTarget(t:any,port:number):string|null{
 try{if(t?.type!=='page'||typeof t.url!=='string'||t.url.length>4096)return null;const game=new URL(t.url);const localGame=game.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(game.hostname)&&game.pathname==='/play/index.html'&&!game.username&&!game.password;if(!localGame&&!(game.protocol==='dagger:'&&game.hostname==='game')&&!(game.protocol==='https:'&&['daggerfalljs.dev','www.daggerfalljs.dev'].includes(game.hostname)))return null
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
  let diagnostic=`No debugging endpoint responded at 127.0.0.1:${value}. Start DFO with the loopback remote-debugging flags, then reconnect.`
  try{
   const r=await fetch(`http://127.0.0.1:${value}/json/list`,{signal:AbortSignal.timeout(2000),redirect:'error'})
   diagnostic=`Debugger returned HTTP ${r.status}; no usable target list.`
   if(!r.ok||!r.body)throw Error('No target list')
   diagnostic='Debugger target list was malformed or exceeded the supported size.'
   const reader=r.body.getReader();let body='',size=0;try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>100000)throw Error('Target list too large');body+=new TextDecoder().decode(part.value)}}finally{await reader.cancel()}
   if(gen!==this.generation)return this.status()
   const list=JSON.parse(body);if(!Array.isArray(list)||list.length>100)throw Error('Invalid target list')
   const targets=list.map(t=>approvedTarget(t,value)).filter(Boolean)
   diagnostic=targets.length===0?'Debugger is running, but no supported DFO game page was found. Supported pages: dagger://game, official HTTPS, or loopback HTTP /play/index.html.':`Debugger exposes ${targets.length} supported game pages. Keep one game window open, then reconnect.`
   if(targets.length!==1)throw Error('Unsupported target count')
   diagnostic='Game page found, but its local debugger WebSocket could not be opened.'
   const socket=new WebSocket(targets[0]!);this.ws=socket
   socket.addEventListener('open',()=>{if(gen!==this.generation){socket.close();return}this.message='Game debugger connected; waiting for Network.enable acknowledgement.';socket.send(JSON.stringify({id:1,method:'Network.enable',params:{maxTotalBufferSize:1048576,maxResourceBufferSize:262144,maxPostDataSize:0}}))})
   socket.addEventListener('message',event=>{if(gen!==this.generation)return;const s=typeof event.data==='string'?event.data:'';if(s.length>1048576){this.session.transportError();return}try{const m=JSON.parse(s);if(m.id===1){if(m.error){this.fail('DFO refused observation; reconnect manually.');return}this.phase='watching'}else if((this.phase==='watching'||this.phase==='connecting')&&typeof m.method==='string')this.session.event(m.method,m.params)}catch{this.session.transportError()}})
   const timer=setTimeout(()=>{if(gen===this.generation&&this.phase==='connecting')this.fail('Debugger handshake timed out. Reconnect manually.')},3000);timer.unref()
   socket.addEventListener('close',()=>{clearTimeout(timer);if(gen===this.generation)this.fail('Debugger disconnected. Automatic state cleared. Reconnect observer, then manually rejoin the room; old socket creation cannot be replayed.')})
   socket.addEventListener('error',()=>{if(gen===this.generation)this.fail('Debugger connection failed. Reconnect manually.')})
  }catch{if(gen===this.generation)this.fail(diagnostic)}
  return this.status()
 }
 private fail(message:string){const ws=this.ws;this.ws=null;this.generation++;ws?.close();this.session.clear();this.phase='error';this.message=message;this.enabled=false}
}
