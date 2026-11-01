import {createServer,type Server,type IncomingMessage,type ServerResponse} from 'node:http'
import {randomBytes,timingSafeEqual,createHash} from 'node:crypto'
import {liveFrame,liveOrigin,sameLiveIdentity} from '../../shared/liveProtocol'
import type {LiveFrame,LiveIdentity,LiveStatus} from '../../shared/liveTypes'
import type {HunterGeometry} from '../../shared/hunterTypes'

export function geometryIdentity(g:HunterGeometry):LiveIdentity|null {
 if(!g.layoutFingerprint)return null
 const assets=JSON.stringify(Object.fromEntries(Object.entries(g.provenance.assetHashes).sort(([a],[b])=>a.localeCompare(b))))
 return {mapId:g.mapId,sourceFingerprint:g.provenance.sourceFingerprint,assetFingerprint:createHash('sha256').update(assets).digest('hex'),layoutFingerprint:g.layoutFingerprint}
}
export class CompanionService {
 constructor(private now:()=>number=()=>performance.now()){}
 private server:Server|null=null
 private token='';private origin='';private endpoint='';private context:LiveIdentity|null=null;private geometry:HunterGeometry|undefined
 private frame:LiveFrame|undefined;private received:number|null=null;private lastSequence=-1;private stream='';private epoch=-1;private changed=false
 private state:LiveStatus['state']='off';private reason='Live receiver is off. A developer-integrated game producer is required.'
 private rateAt=0;private rateCount=0;private starting=false
 setGeometry(g:HunterGeometry|undefined):void {
  if(g===this.geometry)return
  const next=g?geometryIdentity(g):null
  if(!next||!this.context||!sameLiveIdentity(next,this.context)){this.frame=undefined;this.state=this.server?'waiting':'off';this.reason='Waiting for matching dungeon/source/assets/layout telemetry'}
  this.geometry=g;this.context=next
 }
 status():LiveStatus {
  const age=this.received===null?undefined:this.now()-this.received
  if(this.frame&&age!==undefined&&age>1000){this.frame=undefined;this.state='stale';this.reason='Telemetry expired; player/HUD markers hidden'}
  return {enabled:!!this.server,state:this.state,reason:this.reason,...(this.server?{endpoint:this.endpoint,token:this.token,origin:this.origin}:{}),...(age!==undefined?{ageMs:age}:{}),...(this.frame?{frame:this.frame,discontinuity:this.changed}:{})}
 }
 async start(value:unknown):Promise<LiveStatus>{
  if(this.starting)throw new Error('Live receiver is already starting')
  const origin=liveOrigin(value);this.starting=true
  try{await this.stop();this.origin=origin;this.token=randomBytes(32).toString('base64url');this.state='waiting';this.reason='Receiver ready; waiting for an approved, matching game producer. Runtime game parity is not yet established.'
   const server=createServer((req,res)=>this.handle(req,res));server.headersTimeout=3000;server.requestTimeout=3000;server.maxConnections=4
   server.on('error',()=>{this.frame=undefined;this.state='error';this.reason='Local receiver error; all live markers hidden'})
   await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.removeListener('error',reject);resolve()})})
   this.server=server;const address=server.address();if(!address||typeof address==='string')throw new Error('Invalid loopback listener')
   this.endpoint=`http://127.0.0.1:${address.port}/v1/frame`;return this.status()
  }finally{this.starting=false}
 }
 async stop():Promise<void>{
  const server=this.server;this.server=null;this.frame=undefined;this.token='';this.lastSequence=-1;this.stream='';this.epoch=-1;this.received=null;this.rateAt=0;this.rateCount=0;this.state='off';this.reason='Live receiver off; all live markers hidden'
  if(server)await new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections()})
 }
 private handle(req:IncomingMessage,res:ServerResponse):void {
  const reply=(code:number,value:object)=>{if(!res.destroyed){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))}}
  const port=this.server?.address(),host=typeof port==='object'&&port?`127.0.0.1:${port.port}`:''
  if(req.headers.host!==host||req.headers.origin!==this.origin){reply(403,{error:'Origin/host refused'});req.resume();return}
  res.setHeader('Access-Control-Allow-Origin',this.origin);res.setHeader('Vary','Origin')
  if(req.method==='OPTIONS'&&req.url==='/v1/frame'){res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');reply(200,{ok:true});return}
  const given=req.headers.authorization??'',expected=`Bearer ${this.token}`
  if(!/^Bearer [A-Za-z0-9_-]{43}$/.test(given)||given.length!==expected.length||!timingSafeEqual(Buffer.from(given),Buffer.from(expected))){reply(401,{error:'Pairing token required'});req.resume();return}
  if(req.method!=='POST'||req.url!=='/v1/frame'||req.headers['content-type']!=='application/json'){reply(405,{error:'Only JSON telemetry POST is supported'});req.resume();return}
  if(this.now()-this.rateAt>1000){this.rateAt=this.now();this.rateCount=0}
  if(++this.rateCount>20){reply(429,{error:'Telemetry rate limit'});req.resume();return}
  if(Number(req.headers['content-length']??0)>8192){reply(413,{error:'Frame too large'});req.resume();return}
  const session=this.server
  let bytes=0,body='';let ended=false
  req.setTimeout(1500,()=>{ended=true;reply(408,{error:'Frame timeout'});req.destroy()})
  req.on('error',()=>{});req.on('data',chunk=>{bytes+=chunk.length;if(bytes>8192){ended=true;reply(413,{error:'Frame too large'});req.destroy()}else body+=chunk.toString('utf8')})
  req.on('end',()=>{if(ended)return;if(!session||this.server!==session){reply(409,{error:'Receiver session ended'});return}
   try{const f=liveFrame(JSON.parse(body));if(!this.context||!sameLiveIdentity(f.identity,this.context)){this.frame=undefined;this.state='mismatch';this.reason='Dungeon/source/asset/layout identity mismatch; markers hidden';reply(409,{error:this.reason});return}
    if(f.streamId!==this.stream&&this.frame&&this.now()-(this.received??0)<=1000){reply(409,{error:'Another telemetry stream is active'});return}
    if(f.streamId===this.stream&&(f.sequence<=this.lastSequence||f.epoch<this.epoch)){reply(409,{error:'Out-of-order frame'});return}
    const previous=this.frame;this.changed=!!previous&&(f.epoch!==previous.epoch||Math.hypot(...f.feet.map((v,i)=>v-previous.feet[i]))>10)
    const b=this.geometry!.bounds;if(f.feet[0]<b.x0-2||f.feet[0]>b.x1+2||f.feet[2]<b.z0-2||f.feet[2]>b.z1+2)throw new Error('Player position outside reconstructed dungeon bounds')
    this.stream=f.streamId;this.lastSequence=f.sequence;this.epoch=f.epoch;this.received=this.now();this.frame=f.foreground?f:undefined;this.state=f.foreground?'tracking':'hidden';this.reason=f.foreground?'Identity-matched telemetry received; actual game coordinate parity still requires runtime validation':'Game not foreground; live markers hidden'
    reply(200,{ok:true,sequence:f.sequence,epoch:f.epoch,discontinuity:this.changed})
   }catch{this.frame=undefined;this.state='error';this.reason='Invalid telemetry; markers hidden';reply(400,{error:this.reason})}
  })
 }
}
