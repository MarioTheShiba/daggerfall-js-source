import type { OrreryStatus } from '../../shared/orreryTypes'

// Only parse a WebSocket's public room URL; never inspect frames or authorization headers.
export function slotFromWsUrl(value: string): {slot:number;room:string}|null {
  try {
    if (value.length > 4096) return null
    const url = new URL(value)
    if (url.protocol !== 'wss:' && url.protocol !== 'ws:') return null
    const pathname = decodeURIComponent(url.pathname)
    const match = pathname.match(/(?:^|\/)room\/(sd:([1-9]\d*)(?:\.[A-Za-z0-9_-]{1,128})?)$/i)
    if (!match) return null
    const slot = Number(match[2])
    return Number.isSafeInteger(slot) ? {slot,room:match[1]} : null
  } catch { return null }
}

interface CdpTarget { type?:string;title?:string;url?:string;webSocketDebuggerUrl?:string }
function isDfoTarget(t:CdpTarget):boolean {
  if (t.type !== 'page') return false
  const url = t.url ?? '', title=(t.title ?? '').toLowerCase()
  return url.startsWith('dagger://') || /^https:\/\/(?:www\.)?daggerfalljs\.dev(?:\/|$)/i.test(url) ||
    (title.includes('dfo online') || title.includes('daggerfall online'))
}
function localSocketEndpoint(raw:string,port:number):string|null {
  try { const u = new URL(raw)
    if (u.protocol !== 'ws:' || !['127.0.0.1','localhost','[::1]'].includes(u.hostname) || Number(u.port) !== port || !u.pathname.startsWith('/devtools/page/')) return null
    return raw
  } catch { return null }
}

/** Opt-in CDP observer of newly created DFO room WebSocket URL metadata only. */
export class OrreryObserver {
  private socket:WebSocket|null=null
  private retry:ReturnType<typeof setTimeout>|null=null
  private port=0
  private gen=0
  private state:OrreryStatus={enabled:false,phase:'off',message:'Not connected. The solver still accepts manual slot IDs.'}
  status():OrreryStatus {return {...this.state}}
  async start(value:unknown):Promise<OrreryStatus> {
    if (!Number.isInteger(value) || (value as number)<1024 || (value as number)>65535) throw new Error('Choose a local debugging port from 1024 to 65535')
    this.stop()
    this.port=value as number
    this.state={enabled:true,phase:'connecting',port:this.port,message:'Connecting to DFO debugging endpoint on this computer.'}
    const generation=++this.gen
    await this.connect(generation)
    return this.status()
  }
  stop():OrreryStatus {
    this.gen++
    if (this.retry) clearTimeout(this.retry)
    this.retry=null
    const socket=this.socket;this.socket=null
    if(socket)try{socket.close()}catch{}
    this.state={enabled:false,phase:'off',message:'Observer stopped; no CDP connection active.'}
    return this.status()
  }
  private schedule(generation:number,msg:string):void {
    if(generation!==this.gen)return
    this.state={enabled:true,phase:'connecting',port:this.port,message:msg}
    if(this.retry)clearTimeout(this.retry)
    this.retry=setTimeout(()=>{this.retry=null;void this.connect(generation)},3000)
  }
  private async connect(generation:number):Promise<void>{
    if(generation!==this.gen)return
    const port=this.port
    try {
      const response=await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(1500),redirect:'error'})
      if(!response.ok)throw new Error('Debugger did not return its targets')
      const body=await response.text()
      if(body.length>100000)throw new Error('Target list too large')
      const targets=JSON.parse(body)
      if(!Array.isArray(targets))throw new Error('Invalid debugging target list')
      const target=(targets as CdpTarget[]).find(t=>isDfoTarget(t)&&typeof t.webSocketDebuggerUrl==='string'&&!!localSocketEndpoint(t.webSocketDebuggerUrl,port))
      if(!target||!target.webSocketDebuggerUrl)throw new Error('No DFO game window in debugger targets')
      if(generation!==this.gen)return
      const socket=new WebSocket(target.webSocketDebuggerUrl)
      this.socket=socket
      socket.addEventListener('open',()=>{
        if(this.gen!==generation){socket.close();return}
        // Observer subscribes to metadata; deliberately no Runtime.evaluate, frame capture, or input commands.
        socket.send(JSON.stringify({id:1,method:'Network.enable'}))
        this.state={enabled:true,phase:'watching',port,message:'Watching NEW DFO room connections. Enter the Shattered Hour in-game.'}
      })
      socket.addEventListener('message',event=>{
        if(this.gen!==generation)return
        try {
          const msg=JSON.parse(String(event.data))
          if(msg.method==='Network.webSocketCreated') {
            const detected=slotFromWsUrl(msg.params?.url)
            if(detected)this.state={enabled:true,phase:'detected',port,slot:detected.slot,room:detected.room,message:'Shattered Hour room detected. Solution generated locally.'}
          } else if(msg.method==='Network.webSocketClosed' && this.state.phase==='detected') {
            // Do not declare that game left the room solely from an unrelated socket closing.
          }
        }catch{ /* Ignore malformed and unrelated protocol messages. */ }
      })
      socket.addEventListener('close',()=>{if(this.gen===generation){this.socket=null;this.schedule(generation,'Debugger disconnected. Retrying on localhost...')}})
      socket.addEventListener('error',()=>{ /* close event initiates retry */ })
    }catch(e){this.schedule(generation,`Waiting for DFO debugger on 127.0.0.1:${port}. Restart DFO with the remote-debugging flag.`)}
  }
}
