// Integration SDK only. No game internals are discovered, injected, polled through a debugger, or modified.
// The developer must supply an explicit read-only render-frame sampler from the approved dungeon host.
export function createTelemetryPublisher({endpoint,token,sample,fetcher=globalThis.fetch,foreground=()=>globalThis.document?.hasFocus()&&globalThis.document?.visibilityState==='visible',onState=()=>{}}){
 const url=new URL(endpoint)
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.pathname!=='/v1/frame'||url.search||url.hash||url.username||url.password)throw new Error('Only the paired loopback endpoint is allowed')
 if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token)||typeof sample!=='function')throw new Error('Explicit pairing token and developer sampler required')
 let timer=null,controller=null,sequence=0,active=false,busy=false
 const streamId=globalThis.crypto.randomUUID()
 async function tick(){
  if(!active||busy)return
  busy=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),700)
  try{
   const s=sample();if(!s){onState('no_dungeon');return}
   // Strict allowlist: no accounts, tokens from the game, other players, enemies, actions or commands.
   const frame={schema:1,streamId,sequence:sequence++,epoch:s.epoch,identity:{mapId:s.identity.mapId,sourceFingerprint:s.identity.sourceFingerprint,assetFingerprint:s.identity.assetFingerprint,layoutFingerprint:s.identity.layoutFingerprint},feet:Array.from(s.feet),yaw:s.yaw,pitch:s.pitch,foreground:!!foreground(),viewProjection:Array.from(s.viewProjection),viewport:{x:s.viewport.x,y:s.viewport.y,width:s.viewport.width,height:s.viewport.height,dpr:s.viewport.dpr}}
   const response=await fetcher(url.href,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(frame),signal:controller.signal})
   if(active)onState(response.ok?'sent':'refused')
  }catch{if(active)onState('disconnected')}finally{clearTimeout(timeout);controller=null;busy=false}
 }
 return {start(){if(active)return;active=true;timer=setInterval(()=>void tick(),100);void tick()},stop(){active=false;if(timer)clearInterval(timer);timer=null;controller?.abort();onState('off')}}
}
