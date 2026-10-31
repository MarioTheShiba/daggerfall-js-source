import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import type { KaraOpsSettings } from '../../shared/types'
import type { HunterHistory, HunterStatus, ScanRequest, NavigationRequest } from '../../shared/hunterTypes'

export function validateNavigation(value:unknown): NavigationRequest {
  if(!value||typeof value!=='object'||JSON.stringify(value).length>16000)throw new Error('Invalid navigation request')
  const v=value as NavigationRequest
  if(!['single','species','tour','between'].includes(v.goal)||!Array.isArray(v.targetIds)||v.targetIds.length>16||v.targetIds.some(id=>typeof id!=='string'||!/^enemy:\d{1,5}$/.test(id))||typeof v.startId!=='string'||(v.startId!=='entrance'&&!/^enemy:\d{1,5}$/.test(v.startId)))throw new Error('Invalid navigation objectives')
  if(new Set(v.targetIds).size!==v.targetIds.length||(v.goal==='single'||v.goal==='between')&&v.targetIds.length!==1||v.goal==='tour'&&v.targetIds.length===0)throw new Error('Select distinct objectives')
  if(!Number.isInteger(v.species)||v.species<0||v.species>1023||typeof v.openDoors!=='boolean'||typeof v.returnToEntrance!=='boolean'||!Number.isInteger(v.openSpellLevel)||v.openSpellLevel<0||v.openSpellLevel>1000||![0,1,2,3].includes(v.maxDrop))throw new Error('Invalid navigation capabilities')
  if(!v.doorStates||typeof v.doorStates!=='object'||Array.isArray(v.doorStates)||Object.keys(v.doorStates).length>256||Object.entries(v.doorStates).some(([k,s])=>!/^act:\d+:\d+$/.test(k)||!['open','closed','unlocked'].includes(s)))throw new Error('Invalid declared door states')
  return {goal:v.goal,targetIds:[...v.targetIds],startId:v.startId,species:v.species,openDoors:v.openDoors,returnToEntrance:v.returnToEntrance,openSpellLevel:v.openSpellLevel,maxDrop:v.maxDrop,doorStates:{...v.doorStates}}
}

export function validateRequest(value: unknown): ScanRequest {
  if (!value || typeof value !== 'object') throw new Error('Invalid scan request')
  const v = value as Record<string, unknown>
  for (const [key, min, max] of [['px', -8191, 8191], ['py', -8191, 8191], ['radius', 0, 50], ['species', 0, 1023], ['level', 1, 1000], ['minTargets', 1, 1000], ['region', -1, 70]] as const) {
    if (!Number.isInteger(v[key]) || (v[key] as number) < min || (v[key] as number) > max) throw new Error(`${key}: expected integer ${min}–${max}`)
  }
  if (!['vanilla', 'dex', 'dex-mudex'].includes(String(v.profile)) || typeof v.eliteOnly !== 'boolean' || typeof v.alternate !== 'boolean') throw new Error('Invalid encounter profile')
  if(v.theatre!==undefined&&(!Number.isInteger(v.theatre)||(v.theatre as number)<-1||(v.theatre as number)>9))throw new Error('Invalid theatre')
  if(v.rankBy!==undefined&&!['targets','purity'].includes(String(v.rankBy)))throw new Error('Invalid ranking')
  return { px: v.px, py: v.py, radius: v.radius, species: v.species, level: v.level, minTargets: v.minTargets, region: v.region, profile: v.profile, eliteOnly: v.eliteOnly, alternate: v.alternate,...(v.theatre!==undefined?{theatre:v.theatre}:{}),...(v.rankBy!==undefined?{rankBy:v.rankBy}:{}) } as ScanRequest
}

export class HunterService {
  private worker: Worker | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private starting = false
  private current: HunterStatus = { id: 0, state: 'idle', progress: { phase: 'Ready' } }
  constructor(private workerPath: string, private dataDir: string) {}
  status(): HunterStatus { return this.current }
  history(): HunterHistory {
    try {
      const text = readFileSync(join(this.dataDir, 'hunter-history.json'), 'utf8')
      if (text.length > 2000000) throw new Error('History too large')
      const value = JSON.parse(text) as HunterHistory
      if (!Array.isArray(value.observations)) throw new Error('Invalid history')
      const observations = value.observations.slice(-500).filter(o => {
        try {
          validateRequest(o.request)
          return Number.isInteger(o.mapId) && Number.isInteger(o.px) && Number.isInteger(o.py) && typeof o.name === 'string' && o.name.length < 1000 &&
            typeof o.sourceFingerprint === 'string' && o.sourceFingerprint.length === 64 && o.assetHashes && typeof o.assetHashes === 'object' &&
            typeof o.notes === 'string' && o.notes.length <= 1000 && typeof o.observedAt === 'string' && o.observedAt.length < 50 &&
            (o.actualCount === null || (Number.isInteger(o.actualCount) && o.actualCount >= 0 && o.actualCount <= 9999))
        } catch { return false }
      })
      return { observations, ...(value.lastRequest ? { lastRequest: validateRequest(value.lastRequest) } : {}) }
    } catch { return { observations: [] } }
  }
  private saveHistory(value: HunterHistory): HunterHistory {
    const path = join(this.dataDir, 'hunter-history.json')
    writeFileSync(`${path}.tmp`, JSON.stringify(value, null, 2), 'utf8'); renameSync(`${path}.tmp`, path)
    return value
  }
  async cancel(): Promise<void> {
    const worker = this.worker; this.worker = null
    if (this.timer) clearTimeout(this.timer)
    if (this.current.state === 'running') this.current = { ...this.current, state: 'cancelled', progress: { ...this.current.progress, phase: 'Cancelled; no incomplete candidates returned' } }
    if (worker) await worker.terminate()
  }
  async map(settings: KaraOpsSettings, mapId: unknown): Promise<number> {
    if (!Number.isInteger(mapId)) throw new Error('Invalid map ID')
    const scan = this.current.scan, result = scan?.results.find(r => r.mapId === mapId)
    if (!scan || !result || this.current.state !== 'complete') throw new Error('Select a completed scan result first')
    return this.start(settings, null, { px: result.px, py: result.py, request: scan.request, expected: scan.provenance })
  }
  async navigate(settings:KaraOpsSettings,mapId:unknown,input:unknown):Promise<number>{
    const navigation=validateNavigation(input),scan=this.current.scan,geometry=this.current.geometry
    if(!Number.isInteger(mapId)||!scan||!geometry||geometry.mapId!==mapId||this.current.state!=='complete')throw new Error('Open a completed 2D map before requesting navigation')
    return this.start(settings,null,{px:geometry.px,py:geometry.py,request:scan.request,expected:geometry.provenance,navigation})
  }
  async jackpot(settings:KaraOpsSettings,input:unknown):Promise<number>{
    if(!input||typeof input!=='object'||JSON.stringify(input).length>12000)throw new Error('Invalid Jackpot command')
    const j=input as import('../../shared/jackpotTypes').JackpotCommand
    if(!['capture','rank','library','inspect','aurum','aurumRoute','import','migrateCache','approval','claim'].includes(j.operation))throw new Error('Invalid Jackpot operation')
    if(!['capture','library','import','migrateCache','approval','claim'].includes(j.operation)&&(typeof j.id!=='string'||!/^[a-f0-9]{64}$/.test(j.id)))throw new Error('Invalid capture ID')
    if(['inspect','aurum','aurumRoute'].includes(j.operation)&&!Number.isSafeInteger(j.mapId))throw new Error('Invalid captured map ID')
    if(j.operation==='approval'){
      if(typeof j.approved!=='boolean'||typeof j.authority!=='string'||j.authority.length>100||typeof j.evidence!=='string'||j.evidence.length>1000||j.approved&&(!j.authority.trim()||!j.evidence.trim()))throw new Error('Approval requires named developer authority and evidence')
      const path=join(this.dataDir,'coffer-approval.json');writeFileSync(path+'.tmp',JSON.stringify({approved:j.approved,authority:j.authority,evidence:j.evidence,recordedAt:new Date().toISOString(),manualAttestation:true}));renameSync(path+'.tmp',path)
      if(this.current.jackpot?.aurum){this.current.jackpot.aurum=undefined}
      return this.current.id
    }
    if(j.operation==='claim'){
      const a=this.current.jackpot?.aurum;if(!a?.id||!['unknown','manually_unclaimed','manually_claimed'].includes(j.claim??''))throw new Error('Analyze a coffer before recording a manual account note')
      const path=join(this.dataDir,'coffer-notes.json');let notes:Record<string,string>={};try{notes=JSON.parse(readFileSync(path,'utf8'))}catch{};notes[a.id]=j.claim!;writeFileSync(path+'.tmp',JSON.stringify(notes));renameSync(path+'.tmp',path);a.accountState=j.claim!;return this.current.id
    }
    if(j.operation==='import'&&!this.current.scan)throw new Error('Complete an ordinary Hunter scan first')
    if(j.combine!==undefined&&typeof j.combine!=='boolean')throw new Error('Invalid capture union switch')
    const command={combine:j.combine,operation:j.operation,id:j.id,mapId:j.mapId,criteria:j.criteria,...(j.operation==='import'?{scan:this.current.scan}:{})}
    return this.start(settings,j.operation==='capture'?validateRequest(j.request):null,undefined,command)
  }
  async start(settings: KaraOpsSettings, input: unknown, mapSpec?: { px: number; py: number; request: ScanRequest; expected: import('../../shared/hunterTypes').Provenance; navigation?: NavigationRequest }, jackpot?:Omit<import('../../shared/jackpotTypes').JackpotCommand,'request'>): Promise<number> {
    if (this.starting) throw new Error('A Hunter request is already starting')
    const request = input === null ? null : validateRequest(input)
    if ((!jackpot||['capture','aurum','aurumRoute','import','migrateCache'].includes(jackpot.operation))&&(!settings.arena2Path || !settings.dfoSourcePath)) throw new Error('Choose ARENA2 and DFO source folders in Settings first.')
    this.starting = true
    try {
    await this.cancel()
    const id = this.current.id + 1
    this.current = { id, state: 'running', catalog: this.current.catalog, jackpot:this.current.jackpot, ...((mapSpec||jackpot) ? { scan: this.current.scan } : {}), ...((mapSpec?.navigation||jackpot) ? {geometry:this.current.geometry,navigation:mapSpec?.navigation?undefined:this.current.navigation}:{}), progress: { phase: 'Validating files and loading algorithms' } }
    if (request) this.saveHistory({ ...this.history(), lastRequest: request })
    const worker = new Worker(this.workerPath, { workerData: { settings, request, mapSpec,jackpot, appPath:process.env.KARAOPS_APP_PATH, dataDir: this.dataDir }, resourceLimits: { maxOldGenerationSizeMb:1536 } })
    this.worker = worker
    this.timer = setTimeout(() => {
      if (this.worker !== worker) return
      void this.cancel().then(() => { if (this.current.id === id) this.current = { ...this.current, state: 'analysis_error', error: 'Worker exceeded 360-second initialization/road/scan budget. Coverage and reachability remain unverified.' } })
    }, 360000)
    const finish = (): void => { if (this.timer) clearTimeout(this.timer); this.worker = null; void worker.terminate() }
    worker.on('message', message => {
      if (this.worker !== worker) return
      if (message.kind === 'progress') this.current = { ...this.current, progress: message.value }
      if(message.kind==='jackpot'){
        if(message.value.aurum){let approval:{approved?:boolean;authority?:string;evidence?:string}={};try{approval=JSON.parse(readFileSync(join(this.dataDir,'coffer-approval.json'),'utf8'))}catch{};if(!approval.approved||!approval.authority?.trim()||!approval.evidence?.trim()){const {foot,sheet,pile,navigationResult,...ordinary}=message.value.aurum;message.value.aurum={...ordinary,approved:false}}}
        this.current={...this.current,state:'complete',...(message.value.aurum?.approved&&message.value.aurum?.navigationResult?{navigation:undefined}:{}),jackpot:{library:[],...this.current.jackpot,...message.value},catalog:message.value.catalog??this.current.catalog,progress:{phase:'Jackpot ready'}};finish()}
      if(message.kind==='inspect'){this.current={...this.current,state:'complete',scan:message.value,geometry:undefined,navigation:undefined,progress:{phase:'Captured dungeon selected; rebuild map to verify current inputs'}};finish()}
      if (message.kind === 'complete') { this.current = { ...this.current, state: 'complete', ...(mapSpec?.navigation ? {navigation:message.value} : mapSpec ? { geometry: message.value } : request ? { scan: message.value } : { catalog: message.value }), progress: { phase: mapSpec?.navigation?'Navigation analysis ready':mapSpec ? '2D map ready' : request ? message.value.stats.phase : 'Data validated' } }; finish() }
      if (message.kind === 'error') { this.current = { ...this.current, state: 'analysis_error', error: message.message }; finish() }
    })
    worker.on('error', error => { if (this.worker === worker) { this.current = { ...this.current, state: 'analysis_error', error: error.message }; finish() } })
    worker.on('exit', code => { if (this.worker === worker) { this.current = { ...this.current, state: 'analysis_error', error: `Worker exited before completion (${code})` }; finish() } })
    return id
    } finally { this.starting = false }
  }
  observe(mapId: unknown, actualCount: unknown, notes: unknown): HunterHistory {
    const scan = this.current.scan
    const result = scan?.results.find(r => r.mapId === mapId)
    if (!scan || !result || this.current.state !== 'complete') throw new Error('Select a completed scan result first')
    if (actualCount !== null && (!Number.isInteger(actualCount) || (actualCount as number) < 0 || (actualCount as number) > 9999)) throw new Error('Actual count: 0–9999 or null for a bookmark')
    if (typeof notes !== 'string' || notes.length > 1000) throw new Error('Notes: up to 1000 characters')
    const history = this.history()
    history.observations.push({ mapId: result.mapId, px: result.px, py: result.py, name: result.name, sourceFingerprint: scan.provenance.sourceFingerprint, assetHashes: scan.provenance.assetHashes, request: scan.request, observedAt: new Date().toISOString(), actualCount: actualCount as number | null, notes })
    history.observations = history.observations.slice(-500)
    return this.saveHistory(history)
  }
}
