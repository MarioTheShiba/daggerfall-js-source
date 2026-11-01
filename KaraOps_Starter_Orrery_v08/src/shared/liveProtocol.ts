import type {LiveFrame,LiveIdentity} from './liveTypes'
export function liveOrigin(value:unknown):string {
 if(typeof value!=='string'||value.length>300)throw new Error('Enter the exact approved game origin')
 const u=new URL(value)
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('Use an http(s) origin without a path, credentials, query or fragment')
 return u.origin
}
export function liveFrame(value:unknown):LiveFrame {
 if(!value||typeof value!=='object')throw new Error('Invalid telemetry frame')
 const v=value as LiveFrame,id=v.identity,r=v.viewport
 const vec=(a:unknown,n:number,limit:number)=>Array.isArray(a)&&a.length===n&&a.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=limit)
 const ordinal=(x:number)=>Number.isSafeInteger(x)&&x>=0&&x<=0xffffffff
 if(v.schema!==1||typeof v.streamId!=='string'||!/^[A-Za-z0-9_-]{8,64}$/.test(v.streamId)||!ordinal(v.sequence)||!ordinal(v.epoch))throw new Error('Invalid telemetry schema/stream/order')
 if(!id||!ordinal(id.mapId)||[id.sourceFingerprint,id.assetFingerprint,id.layoutFingerprint].some(x=>typeof x!=='string'||!/^[a-f0-9]{64}$/.test(x)))throw new Error('Invalid telemetry identity')
 if(!vec(v.feet,3,100000)||!vec(v.viewProjection,16,10000000)||![v.yaw,v.pitch].every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<10000)||typeof v.foreground!=='boolean')throw new Error('Invalid telemetry pose/camera')
 if(!r||![r.x,r.y,r.width,r.height,r.dpr].every(Number.isFinite)||Math.abs(r.x)>30000||Math.abs(r.y)>30000||r.width<1||r.height<1||r.width>20000||r.height>20000||r.dpr<.25||r.dpr>8)throw new Error('Invalid CSS world viewport')
 // Copy only allowed fields. No account, actors, loot, messages or game commands cross this interface.
 return {schema:1,streamId:v.streamId,sequence:v.sequence,epoch:v.epoch,identity:{mapId:id.mapId,sourceFingerprint:id.sourceFingerprint,assetFingerprint:id.assetFingerprint,layoutFingerprint:id.layoutFingerprint},feet:[...v.feet],yaw:v.yaw,pitch:v.pitch,foreground:v.foreground,viewProjection:[...v.viewProjection],viewport:{x:r.x,y:r.y,width:r.width,height:r.height,dpr:r.dpr}}
}
export function sameLiveIdentity(a:LiveIdentity,b:LiveIdentity):boolean {
 return a.mapId===b.mapId&&a.sourceFingerprint===b.sourceFingerprint&&a.assetFingerprint===b.assetFingerprint&&a.layoutFingerprint===b.layoutFingerprint
}
export function projectTelemetry(point:number[],frame:LiveFrame):{x:number;y:number;depth:number}|null {
 const m=frame.viewProjection,[x,y,z]=point,w=m[3]*x+m[7]*y+m[11]*z+m[15]
 if(!Number.isFinite(w)||w<=1e-6)return null
 const nx=(m[0]*x+m[4]*y+m[8]*z+m[12])/w,ny=(m[1]*x+m[5]*y+m[9]*z+m[13])/w,nz=(m[2]*x+m[6]*y+m[10]*z+m[14])/w
 if(![nx,ny,nz].every(Number.isFinite)||Math.abs(nx)>1||Math.abs(ny)>1||Math.abs(nz)>1)return null
 const r=frame.viewport
 return {x:r.x+(nx+1)*r.width/2,y:r.y+(1-ny)*r.height/2,depth:w}
}
