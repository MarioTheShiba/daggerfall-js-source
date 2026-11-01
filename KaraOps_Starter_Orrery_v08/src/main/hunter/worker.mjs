import { parentPort, workerData } from 'node:worker_threads'
import { openGame, scan,scanRequest } from './engine.mjs'
import { assembleGeometry } from './geometry.mjs'
import { cached, cacheKey } from './cache.mjs'
import { join } from 'node:path'
import { navigate } from './navigation.mjs'
import {datasetOf,rankDataset,migrateRetained,criteria,mergeDatasets} from './jackpot.mjs'
import {library,readDataset,saveDataset} from './library.mjs'
import {analyzeCoffer,publicCoffer,AURUM_REVISION,aurumSource} from './aurum.mjs'
import {readFileSync,readdirSync,statSync} from 'node:fs'
import {digest} from './compatibility.mjs'
// The offline worker has no browser globals or networking capability exposed to callers.
globalThis.fetch = async () => { throw new Error('Networking disabled in Hunter worker') }
try {
  const j=workerData.jackpot,dir=join(workerData.dataDir,'jackpot-library')
  if(j&&['rank','library','inspect'].includes(j.operation)){
    if(j.operation==='library')parentPort.postMessage({kind:'jackpot',value:{library:library(dir)}})
    else {let dataset=readDataset(dir,j.id);if(j.operation==='rank'&&j.combine)dataset=mergeDatasets(dataset,library(dir).map(s=>readDataset(dir,s.id)))
      if(j.operation==='rank')parentPort.postMessage({kind:'jackpot',value:{ranking:rankDataset(dataset,j.criteria),library:library(dir),...(dataset.hunterCatalog?{catalog:dataset.hunterCatalog}:{})}})
      else {const row=dataset.candidates.find(r=>r.mapId===j.mapId);if(!row)throw new Error('Dungeon is not in this capture');parentPort.postMessage({kind:'inspect',value:{request:dataset.request,provenance:dataset.provenance,coverage:dataset.coverage,stats:{phase:'Saved capture inspector'},results:[row],diagnostics:[]}})}
    }
  }else{
  const game = await openGame(workerData.settings, value => parentPort.postMessage({ kind: 'progress', value }))
  const { mapSpec, request, dataDir } = workerData
  if (mapSpec && (game.provenance.sourceFingerprint !== mapSpec.expected.sourceFingerprint || JSON.stringify(game.provenance.assetHashes) !== JSON.stringify(mapSpec.expected.assetHashes) || game.provenance.worldData.fingerprint !== mapSpec.expected.worldData?.fingerprint)) throw new Error('INPUT_VERSION_MISMATCH: source, world-data packs or ARENA2 changed after scan. Rescan before showing geometry.')
  game.cacheDir=dataDir
  const compute = () => mapSpec?.navigation ? navigate(game,mapSpec,mapSpec.navigation,value=>parentPort.postMessage({kind:'progress',value})) : mapSpec ? assembleGeometry(game,mapSpec) : scan(game,request,value=>parentPort.postMessage({kind:'progress',value}),dataDir)
  if(['aurum','aurumRoute'].includes(j?.operation)){
    const dataset=readDataset(dir,j.id),row=dataset.candidates.find(r=>r.mapId===j.mapId);if(!row)throw new Error('Dungeon is not in this capture')
    if(game.provenance.sourceFingerprint!==dataset.provenance.sourceFingerprint||JSON.stringify(game.provenance.assetHashes)!==JSON.stringify(dataset.provenance.assetHashes))throw new Error('INPUT_VERSION_MISMATCH: capture and selected source/assets differ; make a new capture')
    const src=await aurumSource(workerData.settings,game,workerData.appPath),texture=digest(readFileSync(join(workerData.settings.arena2Path,'TEXTURE.216')))
    const spec={px:row.px,py:row.py,request:dataset.request}
    const value=await cached(join(dataDir,'hunter-cache'),cacheKey(game.provenance,{...spec,revision:AURUM_REVISION,source:src.fingerprint,texture},'aurum'),()=>analyzeCoffer(game,workerData.settings,spec,workerData.appPath))
    let result=value
    if(j.operation==='aurumRoute'&&value.foot){
      const [x,y,z]=value.foot
      const navigation=await navigate(game,spec,{goal:'single',targetIds:['coffer'],species:34,startId:'entrance',openDoors:true,returnToEntrance:true,openSpellLevel:0,maxDrop:0,doorStates:{}},v=>parentPort.postMessage({kind:'progress',value:v}),{objective:{x,y,z}})
      result={...value,navigation:navigation.status,navigationResult:navigation,diagnostic:value.diagnostic+' Walking route (doors may be opened): '+navigation.status+'. Failed/incomplete searches remain Unverified.'}
    }
    let approval=null;try{approval=JSON.parse(readFileSync(join(dataDir,'coffer-approval.json'),'utf8'))}catch{}
    let accountState='unknown';try{const notes=JSON.parse(readFileSync(join(dataDir,'coffer-notes.json'),'utf8'));accountState=notes[value.id]??'unknown'}catch{}
    parentPort.postMessage({kind:'jackpot',value:{aurum:publicCoffer({...result,accountState},approval)}})
  }else if(j?.operation==='migrateCache'){
    criteria(j.criteria,game.catalog.farming)
    let imported=0,skipped=0,lastDataset=null
    const cacheDir=join(dataDir,'hunter-cache');let files=[];try{files=readdirSync(cacheDir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).slice(0,12)}catch{}
    for(const file of files){
      const path=join(cacheDir,file);if(statSync(path).size>16000000){skipped++;continue}
      let envelope,v;try{envelope=JSON.parse(readFileSync(path,'utf8'));v=envelope.value;if(envelope.schema!=='karaops-2a-1'||digest(JSON.stringify(v))!==envelope.checksum||!Array.isArray(v.results)||Array.isArray(v.populations)||v.results.length>100||v.stats?.phase!=='Complete')continue;scanRequest(v.request)}catch{skipped++;continue}
      if(v.provenance?.sourceFingerprint!==game.provenance.sourceFingerprint||JSON.stringify(v.provenance.assetHashes)!==JSON.stringify(game.provenance.assetHashes)||v.provenance.worldData?.fingerprint!==game.provenance.worldData.fingerprint){skipped++;continue}
      const dataset=migrateRetained(v,game.catalog.farming);dataset.id=digest(dataset.id+dataset.scope+file);dataset.hunterCatalog=game.catalog;dataset.migratedFromCache=file;saveDataset(dir,dataset);imported++;lastDataset=dataset
    }
    parentPort.postMessage({kind:'jackpot',value:{catalog:game.catalog,library:library(dir),...(lastDataset?{ranking:rankDataset(lastDataset,j.criteria)}:{}),importSummary:imported+' retained cache snapshots imported; '+skipped+' incompatible/corrupt entries skipped. Only previously retained rows are recoverable; missing loot metadata stays Unverified and discarded populations require a new capture.'}})
  }else if(j?.operation==='import'){

    if(j.scan.provenance.sourceFingerprint!==game.provenance.sourceFingerprint)throw new Error('INPUT_VERSION_MISMATCH: saved Hunter results use another source')
    const dataset=migrateRetained(j.scan,game.catalog.farming);dataset.id=digest(dataset.id+dataset.scope+JSON.stringify([j.scan.request.species,j.scan.request.minTargets,j.scan.request.rankBy]));saveDataset(dir,dataset)
    parentPort.postMessage({kind:'jackpot',value:{ranking:rankDataset(dataset,j.criteria),library:library(dir),catalog:game.catalog}})
  }else if(j?.operation==='capture'){
    criteria(j.criteria,game.catalog.farming)
    const full=await cached(join(dataDir,'hunter-cache'),cacheKey(game.provenance,request,'all-populations'),()=>scan(game,request,value=>parentPort.postMessage({kind:'progress',value}),dataDir,true))
    const dataset=datasetOf(full,game.catalog.farming);dataset.hunterCatalog=game.catalog;saveDataset(dir,dataset)
    parentPort.postMessage({kind:'jackpot',value:{ranking:rankDataset(dataset,j.criteria),library:library(dir),catalog:game.catalog}})
  }else{
    const value = mapSpec || request ? await cached(join(dataDir,'hunter-cache'),cacheKey(game.provenance,mapSpec ?? request,mapSpec?.navigation?'navigation':mapSpec?'geometry':'scan'),compute) : game.catalog
    parentPort.postMessage({ kind: 'complete', value })
  }
  }
} catch (error) {
  parentPort.postMessage({ kind: 'error', message: String(error.message) })
}
