import {digest} from './compatibility.mjs'
export const JACKPOT_SCHEMA=1
export function familyPopulation(counts,copies,loot){
 const families=Object.fromEntries([...loot.FAMILY_IDS,'unclassified'].map(id=>[id,{base:0,expanded:0,percentage:0}]))
 const total=Object.values(counts).reduce((a,n)=>a+n,0)
 for(const [species,n]of Object.entries(counts)){const f=loot.foeFamily(Number(species))??'unclassified';families[f].expanded+=n;families[f].base+=n/copies}
 for(const f of Object.values(families))f.percentage=total?f.expanded/total*100:0
 return families
}
export function conditionalLegendary(loot,target,item,family){
 const pool=loot.legendariesFor(item),weights=pool.map(r=>family&&loot.foundAmong(r.id)===family?loot.SIGNATURE_WEIGHT:1),index=pool.findIndex(r=>r.id===target)
 return {probability:index<0?0:weights[index]/weights.reduce((a,n)=>a+n,0),pool:pool.map(r=>r.id),weights,conditioning:'Given this exact compatible item has already rolled Legendary; not a drop/kill probability.'}
}
export async function farmingCatalog(game){
 const loot=await game.load('loot','systems/loot/lootRarity'),items=await game.load('itemTemplates','systems/item/itemTemplates')
 await game.load('foeCap','systems/foeLootCap');await game.load('roomLoot','systems/roomLoot')
 game.loot=loot
 const legendaries=loot.allLegendaries().map(r=>{
  const group=r.group==='Clothing'?'MensClothing':r.group
  const index=(items.GROUP_TEMPLATE_INDICES[group]??[]).find(i=>loot.legendariesFor({group,templateIndex:i}).some(x=>x.id===r.id))
  const reference=index===undefined?null:{group,templateIndex:index,name:items.templateByIndex(index)?.name??`${group} ${index}`}
  return {id:r.id,name:r.name,group:r.group,favoredFamily:loot.foundAmong(r.id),reference,conditional:reference?Object.fromEntries([...loot.FAMILY_IDS,'unclassified'].map(f=>[f,conditionalLegendary(loot,r.id,reference,f==='unclassified'?null:f)])):null}
 })
 return {families:Object.entries(loot.FOE_FAMILIES).map(([id,species])=>({id,species})),legendaries,signatureWeight:loot.SIGNATURE_WEIGHT,source:'systems/loot/lootRarity.js FOE_FAMILIES/foeFamily/foundAmong/legendariesFor/pickLegendary/rarityChances',limitations:['Registered browser-only/custom Legendary records are not auto-loaded. Catalog includes the selected source module exports.', 'Legendary ranking uses a reference-roll opportunity model, not expected drops per kill or hour. Eligible item counts, template mix, live room terms, Renown/finders, caps, champions and current loot state are not observed.']}
}
export function lootPopulation(game,built,dungeon,base,request){
 const L=game.loot,copies=built.elite?3:1,fixedCounts={},baseCounts={}
 for(const e of base){baseCounts[e.mobileType]=(baseCounts[e.mobileType]??0)+1;if(e.fixed)fixedCounts[e.mobileType]=(fixedCounts[e.mobileType]??0)+1}
 const counts=Object.fromEntries(Object.entries(baseCounts).map(([k,n])=>[k,n*copies]))
 const enemySources=Object.entries(counts).map(([id,n])=>{
  const mobileType=Number(id),basics=game.modules.basics.ENEMY_BASICS[mobileType],source=L.corpseSource(basics,request.level,mobileType),rule=game.modules.foeCap.plainFoeLootRule({level:request.level,mobileType,elite:built.elite},basics)
  return {mobileType,count:n,family:L.foeFamily(mobileType)??'unclassified',source,legendaryPerEligibleRoll:L.rarityChances({...source,luck:50,find:1,rollerLevel:request.level,qualityMult:built.elite?game.modules.spawn.ELITE_LOOT_QUALITY_MULT:1,...(rule?.plainLadder?{weights:game.modules.foeCap.plainFoeRarityWeights(game.modules.roomLoot.ROOM_BASE_QUARTERS)}:{})}).legendary/1000,sourceLevelAssumption:basics?.level==null?'Captured effective level used for class/custom source; actual entity scaling unobserved':'Source ENEMY_BASICS level'}
 })
 let random=0,fixed=0;for(const b of dungeon.blocks)for(const m of b.layout.markers){if(!m.archive&&m.record===19)random++;else if(m.archive===216)fixed++}
 const pile={markers:random+fixed,random,fixed,family:L.dungeonFamily(built.mapTableData.dungeonType),tier:L.dungeonRarityTier(built.mapTableData.dungeonType)}
 pile.legendaryPerEligibleRoll=L.rarityChances({kind:'pile',tier:pile.tier,luck:50,find:1,rollerLevel:request.level,qualityMult:built.elite?game.modules.spawn.ELITE_LOOT_QUALITY_MULT:1}).legendary/1000
 return {baseCounts,fixedCounts,families:familyPopulation(counts,copies,L),enemySources,treasure:pile}
}
export function criteria(value,catalog){
 if(!value||typeof value!=='object')throw new Error('Invalid Jackpot criteria')
 const v=value,modes=['dragonlings','daedra','warrior','caster','rogue','undead','species','family','total','weighted','legendary']
 if(!modes.includes(v.mode)||!['count','purity'].includes(v.measure)||!['base','expanded'].includes(v.basis))throw new Error('Invalid Jackpot ranking mode')
 if(!Number.isInteger(v.minPopulation)||v.minPopulation<0||v.minPopulation>10000||!Number.isInteger(v.species)||v.species<0||v.species>1023||!Number.isInteger(v.theatre)||v.theatre< -1||v.theatre>9)throw new Error('Invalid Jackpot population/filter')
 if(![...catalog.families.map(f=>f.id),'unclassified'].includes(v.family))throw new Error('Unknown source family')
 if(typeof v.legendary!=='string'||!catalog.legendaries.some(l=>l.id===v.legendary))throw new Error('Unknown source Legendary')
 if(!v.weights||typeof v.weights!=='object'||Array.isArray(v.weights)||Object.keys(v.weights).length>16||Object.entries(v.weights).some(([f,w])=>!catalog.families.some(x=>x.id===f)||typeof w!=='number'||!Number.isFinite(w)||w<0||w>1000))throw new Error('Invalid family weights')
 return {mode:v.mode,measure:v.measure,basis:v.basis,minPopulation:v.minPopulation,species:v.species,theatre:v.theatre,family:v.family,legendary:v.legendary,weights:{...v.weights}}
}
export function rankDataset(dataset,input){
 const c=criteria(input,dataset.catalog),legend=dataset.catalog.legendaries.find(l=>l.id===c.legendary),rows=[]
 for(const row of dataset.candidates){
  const pop=row.population[c.basis==='base'?'base':'expanded'];if(pop<c.minPopulation||c.theatre!==-1&&row.theatre!==c.theatre)continue
  const divide=c.basis==='base'?row.copies:1
  let amount=0,reason='',enemyMass=null,pileMass=null
  if(c.mode==='legendary'){
   if(row.analysis.legacyIncomplete)continue
   if(!legend.conditional)continue
   enemyMass=row.analysis.enemySources.reduce((sum,s)=>sum+s.count/divide*s.legendaryPerEligibleRoll*legend.conditional[s.family].probability,0)
   pileMass=row.analysis.treasure.markers*row.analysis.treasure.legendaryPerEligibleRoll*legend.conditional[row.analysis.treasure.family??'unclassified'].probability
   amount=enemyMass+pileMass;reason=`Reference-roll opportunity: one ${legend.reference.group}/${legend.reference.templateIndex} eligible roll per modeled corpse and layout pile. Real expected target drops UNKNOWN.`
  }else if(c.mode==='total')amount=pop
  else if(c.mode==='dragonlings'||c.mode==='species')amount=(row.counts[c.mode==='dragonlings'?34:c.species]??0)/divide
  else if(c.mode==='weighted')amount=Object.entries(c.weights).reduce((sum,[f,w])=>sum+(row.analysis.families[f]?.[c.basis]??0)*w,0)
  else amount=row.analysis.families[c.mode==='family'?c.family:c.mode]?.[c.basis]??0
  const score=c.measure==='purity'?(pop?amount/pop*100:0):amount
  if(amount>0)rows.push({candidate:row,score,amount,population:pop,percentage:pop?amount/pop*100:0,reason,enemyMass,pileMass,expectedDrops:null,probabilityStatus:c.mode==='legendary'?'conditional_reference_roll_only':'not_applicable'})
 }
 rows.sort((a,b)=>b.score-a.score||b.amount-a.amount||a.candidate.mapId-b.candidate.mapId)
 return {schema:JACKPOT_SCHEMA,criteria:c,snapshot:{id:dataset.id,sourceFingerprint:dataset.provenance.sourceFingerprint,configurationFingerprint:dataset.configurationFingerprint,request:dataset.request,coverage:dataset.coverage,candidates:dataset.candidates.length,scope:dataset.scope,capturedAt:dataset.capturedAt},catalog:dataset.catalog,unverifiedLootCandidates:c.mode==='legendary'?dataset.candidates.filter(r=>r.analysis.legacyIncomplete).length:0,matching:rows.length,rows:rows.slice(0,100),truncated:rows.length>100,exhaustiveWorld:false,legendary:c.mode==='legendary'?legend:null}
}
export function datasetOf(scan,catalog,scope='all_analyzed_populations'){
 const configurationFingerprint=digest(JSON.stringify({request:{px:scan.request.px,py:scan.request.py,radius:scan.request.radius,level:scan.request.level,profile:scan.request.profile,alternate:scan.request.alternate,eliteOnly:scan.request.eliteOnly,theatre:scan.request.theatre,region:scan.request.region},source:scan.provenance.sourceFingerprint,assets:scan.provenance.assetHashes,world:scan.provenance.worldData?.fingerprint}))
 return {schema:JACKPOT_SCHEMA,id:configurationFingerprint,configurationFingerprint,capturedAt:new Date().toISOString(),request:scan.request,provenance:scan.provenance,coverage:scan.coverage,scope,catalog,candidates:(scan.populations??scan.results).map(({targets,...row})=>({...row,targets:[],configurationFingerprint,sourceFingerprint:scan.provenance.sourceFingerprint,markerCoordinatesOmitted:true}))}
}
export function migrateRetained(scan,catalog){
 const loot={FAMILY_IDS:catalog.families.map(f=>f.id),foeFamily:id=>catalog.families.find(f=>f.species.includes(id))?.id??null}
 const rows=scan.results.map(row=>({...row,analysis:row.analysis??{legacyIncomplete:true,baseCounts:Object.fromEntries(Object.entries(row.counts).map(([s,n])=>[s,n/row.copies])),fixedCounts:null,families:familyPopulation(row.counts,row.copies,loot),enemySources:[],treasure:{markers:null}}}))
 return datasetOf({...scan,results:rows},catalog,'legacy_retained_results_only_missing_candidates_require_rescan')
}
export function exportRanking(result,format){
 if(format==='json')return JSON.stringify(result,null,2)
 if(format!=='csv')throw new Error('Export format must be json or csv')
 const quote=v=>`"${String(v??'').replaceAll('"','""')}"`
 const header=['rank','mapId','name','province','px','py','score','amount','basis','totalBase','totalExpanded','species','families','sourceFingerprint','configurationFingerprint','verification','scope','expectedDrops']
 return [header.map(quote).join(','),...result.rows.map((r,i)=>[i+1,r.candidate.mapId,r.candidate.name,r.candidate.province,r.candidate.px,r.candidate.py,r.score,r.amount,result.criteria.basis,r.candidate.population.base,r.candidate.population.expanded,JSON.stringify(r.candidate.counts),JSON.stringify(r.candidate.analysis.families),result.snapshot.sourceFingerprint,result.snapshot.configurationFingerprint,r.candidate.verification,result.snapshot.scope,'UNKNOWN'].map(quote).join(','))].join('\r\n')
}
export function mergeDatasets(base,datasets){
 const identity=d=>JSON.stringify([d.schema,d.provenance.sourceFingerprint,d.provenance.assetHashes,d.provenance.worldData?.fingerprint,d.request.level,d.request.profile,d.request.alternate,d.request.eliteOnly])
 const compatible=datasets.filter(d=>identity(d)===identity(base)),rows=new Map(),visited=new Set()
 for(const d of compatible){for(const r of d.candidates){const old=rows.get(r.mapId);if(old&&JSON.stringify(old.counts)!==JSON.stringify(r.counts))throw new Error('CAPTURE_CONFLICT: duplicate map has different counts under the same inputs');if(!old||old.analysis?.legacyIncomplete&&!r.analysis?.legacyIncomplete)rows.set(r.mapId,{...r,captureId:d.id})}
  const q=d.request;for(let y=Math.max(-8191,q.py-q.radius);y<=Math.min(8191,q.py+q.radius);y++)for(let x=Math.max(-8191,q.px-q.radius);x<=Math.min(8191,q.px+q.radius);x++)if(Math.hypot(x-q.px,y-q.py)<=q.radius)visited.add(`${x},${y}`)
 }
 return {...base,scope:'union_of_compatible_saved_queries',configurationFingerprint:digest(compatible.map(d=>d.id).sort().join(',')),candidates:[...rows.values()],coverage:{...base.coverage,kind:'union_of_saved_queries',queries:compatible.map(d=>({id:d.id,request:d.request,coverage:d.coverage})),visitedPixels:visited.size,populationsExamined:rows.size,completeWithinQuery:compatible.every(d=>d.coverage?.completeWithinQuery),exhaustiveWorld:false,note:`Union of ${compatible.length} compatible saved queries; overlap deduplicated. Other levels/source versions are excluded. Unexplored coordinates remain unexamined.`}}
}
