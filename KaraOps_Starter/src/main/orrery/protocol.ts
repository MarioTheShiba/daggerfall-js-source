import type {ObservedElite,OrreryStatus} from '../../shared/orreryTypes'
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max
export function puzzleRoom(raw:unknown):string|null{try{if(typeof raw!=='string'||raw.length>4096)return null;const u=new URL(raw);if(!['ws:','wss:'].includes(u.protocol))return null;const m=decodeURIComponent(u.pathname).match(/(?:^|\/)room\/(eg:[0-9a-f]{16}|sd:[1-9]\d*(?:\.[A-Za-z0-9_-]{1,128})?)$/);return m?.[1]??null}catch{return null}}
// No raw payloads, URLs, names, auth headers, receipts or outgoing gameplay messages retained.
export class PuzzleSession {
 private active:string|null=null
 private room=''
 private seen=0
 private clockAt=-Infinity
 private revision=0
 private elite:ObservedElite|undefined
 private slot:number|undefined
 private problem=''
 constructor(private now=()=>performance.now()){}
 clear(){this.active=null;this.room='';this.elite=undefined;this.slot=undefined;this.clockAt=-Infinity;this.problem='';this.revision++}
 event(method:string,p:any){
  if(method==='Network.webSocketCreated'){
   const room=puzzleRoom(p?.url);if(!room||typeof p.requestId!=='string'||p.requestId.length>128)return
   this.clear();this.active=p.requestId;this.room=room;this.seen=this.now()
   if(room.startsWith('sd:')){const n=Number(room.split(':')[1].split('.')[0]);if(integer(n,1,Number.MAX_SAFE_INTEGER))this.slot=n}
   return
  }
  if(p?.requestId!==this.active||!this.active)return
  if(method==='Network.webSocketClosed'||method==='Network.webSocketFrameError'){this.clear();return}
  if(method!=='Network.webSocketFrameReceived'||!this.room.startsWith('eg:'))return
  const frame=p.response
  if(frame?.opcode!==1||typeof frame.payloadData!=='string')return
  if(frame.payloadData.length>262144){this.invalidate('Oversized room message; waiting for valid state.');return}
  let m:any;try{m=JSON.parse(frame.payloadData)}catch{this.invalidate('Malformed room message; waiting for valid state.');return}
  if(!m||m.t!=='eg')return
  if(m.k==='st'){
   if(m.b!==this.room.slice(3)||!integer(m.seed,0,0xffffffff)||!integer(m.h,0,10000)||!integer(m.egv,1,999)||!integer(m.hw,0,Number.MAX_SAFE_INTEGER)||!this.stage(m.sg)||!Array.isArray(m.dc)||m.dc.length>9||m.dc.some((v:any)=>!Array.isArray(v)||v.length!==2||!integer(v[0],0,31)||!integer(v[1],1,2))||new Set(m.dc.map((v:number[])=>v[0])).size!==m.dc.length){this.invalidate('Invalid Elite state; no automatic solution.');return}
   const old=this.elite,dc=m.dc.map((v:number[])=>v.slice()),fraying=(dc.find((v:number[])=>v[0]===19)?.[1]??0) as 0|1|2
   this.elite={seed:m.seed,hall:m.h,law:m.egv,stage:m.sg,wake:m.hw,decrees:dc,fraying}
   // Preserve a clock snapshot only within the identical wake, hall, seed, law and decree set.
   if(old&&old.hall===m.h&&old.seed===m.seed&&old.law===m.egv&&old.wake===m.hw&&JSON.stringify(old.decrees)===JSON.stringify(dc)&&old.stage===m.sg){this.elite.hours=old.hours;this.elite.used=old.used}
   this.seen=this.now();this.problem='';this.revision++;return
  }
  if(m.k==='sg'){
   if(!integer(m.h,0,10000)||!integer(m.hw,0,Number.MAX_SAFE_INTEGER)||!this.stage(m.sg)){this.invalidate('Invalid hall transition.');return}
   const old=this.elite;if(!old)return
   if(Math.ceil(old.hall/5)!==Math.ceil(m.h/5)){this.invalidate('Circle changed; waiting for full decree state.');return}
   if(old.hall!==m.h||old.wake!==m.hw||old.stage!==m.sg){old.hours=undefined;old.used=undefined;this.revision++}
   old.hall=m.h;old.wake=m.hw;old.stage=m.sg;this.seen=this.now();return
  }
  if(m.k==='end'){this.invalidate('Breach ended.');return}
  if(m.k==='efs'){
   const old=this.elite;if(!old||old.hall!==m.h||old.wake!==m.wk||old.stage!=='trial')return
   const pg=m.pg
   if(pg?.obj!=='orrery'){old.hours=undefined;old.used=undefined;this.revision++;return}
   if(!Array.isArray(pg.st)||pg.st.length!==6||pg.st.some((x:unknown)=>!integer(x,0,11))||!integer(pg.f,0,48)){this.invalidate('Invalid Orrery clock state.');return}
   if(JSON.stringify(old.hours)!==JSON.stringify(pg.st)||old.used!==pg.f)this.revision++
   old.hours=pg.st.slice();old.used=pg.f;this.seen=this.now();this.clockAt=this.seen;this.problem=''
  }
 }
 private stage(v:unknown):v is string{return typeof v==='string'&&['wait','sealed','arrive','trial','closing','rest','pull','ended','end'].includes(v)}
 private invalidate(reason:string){this.elite=undefined;this.slot=undefined;this.problem=reason;this.revision++}
 snapshot():OrreryStatus{
  const base={enabled:true,revision:this.revision}
  if(this.problem)return {...base,phase:'error',message:this.problem}
  if(!this.active)return {...base,phase:'watching',message:'Waiting for a NEW Abyss or Elite room connection. Connect before entering/rejoining the room.'}
  if(this.now()-this.seen>5000||(this.elite?.hours&&this.now()-this.clockAt>5000))return {...base,phase:'stale',message:'No recent puzzle state. Automatic instructions withheld; reconnect/re-enter if needed.'}
  if(this.elite?.law!==undefined&&this.elite.law!==10)return {...base,phase:'unsupported',message:`Observed source law ${this.elite.law}; solver pins law 10. Use manual calibration.`}
  return {...base,phase:'detected',message:this.slot?'Abyss slot observed; current clock state unavailable. Fresh generation requires manual confirmation.':this.elite?.hours?'Elite puzzle state observed through CDP; solution is a local-source prediction.':'Room observed; waiting for full state / active Orrery trial.',...(this.slot?{slot:this.slot}:{}),...(this.elite?{elite:structuredClone(this.elite)}:{})}
 }
}
