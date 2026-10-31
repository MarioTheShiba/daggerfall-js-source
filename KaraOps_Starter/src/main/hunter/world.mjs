// Offline composition of the source world host. No browser/session state or networking.
import {cached,cacheKey} from './cache.mjs'
import {join} from 'node:path'
const tick=()=>new Promise(resolve=>setImmediate(resolve))
export async function createHunterWorld(game,{bytes,rows,rawMaps,rawWoods},progress){
 const load=game.load
 const frame=await load('frame','world/tamriel/tamrielFrame'),land=await load('land','world/tamriel/tamrielLand'),grid=await load('grid','world/worldWide/worldGrid')
 const ground=await load('worldGround','world/tamriel/tamrielGround'),traceModule=await load('trace','ui/tamrielTrace'),{DFPalette}=await load('palette','formats/dfPalette'),{isWaterPixel}=await load('water','ui/overworldModel')
 const filed=await load('filedLand','world/land/landLayer')
 const bayClimate=(x,y)=>filed.filedClimate(x,y,game.maps.getClimateIndex(x,y)),bayHeight=(x,y)=>filed.filedHeight(x,y,game.woods.getHeightMapValue(x,y))
 progress({phase:'Tracing local Tamriel geography and fitting the Bay'})
 const palette=new DFPalette();palette.load(bytes('ART_PAL.COL'),'ART_PAL.COL')
 const trace=await traceModule.preloadTamrielTrace({fetchBytes:async name=>bytes(name),palette,indexedDBRef:null})
 if(!trace)throw new Error('WORLD_TRACE_FAILED: no substitute continent used')
 const fit=land.fitBayToPicture({trace,bayLand:(x,y)=>!isWaterPixel(bayClimate(x,y),bayHeight(x,y))})
 if(!fit)throw new Error('WORLD_FIT_FAILED')
 frame.setTamrielFit({ox:fit.ox*fit.ppu,oy:fit.oy*fit.ppu,ppu:fit.ppu});land.setTamrielTrace(trace)
 ground.groundMaps(game.maps)
 const woods=ground.groundWoods(game.woods),C=await load('country','world/tamrielCountry'),D=await load('lairs','world/tamrielDungeons'),arena=await load('arena','world/arenaPlaces'),cap=await load('capitals','world/tamrielCapitals'),A=await load('arenaLocations','world/arenaLocations'),road=await load('worldRoad','world/tamrielRoads'),paths=await load('paths','world/arenaRoads'),past=await load('past','world/pastBayPlaces')
 arena.setArenaStanding(true);cap.setCapitalsStanding(!!cap.capitalBase(rows,game.modules.textures.isMainStoryDungeon))
 const cT=C.countryTemplates(rows,game.modules.textures.isMainStoryDungeon),lT=D.lairTemplates(rows,game.modules.textures.isMainStoryDungeon),pools=D.lairPools(lT),aT=A.arenaTemplates(rows,game.modules.textures.isMainStoryDungeon)
 const bayLand=C.bayLand(bayClimate,(x,y,c)=>isWaterPixel(c,bayHeight(x,y)))
 const climate=bayClimate,plateau=C.createCountryGround(woods)
 const common={climateAt:(x,y)=>game.maps.getClimateIndex(x,y),heightAt:(x,y)=>woods.getHeightMapValue(x,y),ground:(x,y)=>past.pastBayPlacesIn(x,y,x+1,y+1).length>0||plateau(x,y)}
 const country={...common,templates:cT,rates:C.countryRates(C.countryCounts(cT,climate),bayLand)},lairs={...common,templates:lT,rates:C.countryRates(C.countryCounts(lT,climate),bayLand,D.LAIR_TYPES)}
 const pixels=arena.arenaPixels(),stood=pixels?.stood.filter(p=>A.arenaTemplateOf(aT,p))??[]
 const placeAt=(x,y)=>{
  if(cap.capitalOnPixel(x,y)||arena.arenaPlaceOnPixel(x,y)||C.countryStandsAt(country,x,y))return true
  const a=D.lairStandsAt(lairs,x,y)
  return !!a&&!!D.lairLayout(pools.get(a.pick.template.mapTableData.dungeonType),D.lairBlockCount(a.pick.template),D.lairPlaceId(a.c))
 }
 const zone=await load('zone','systems/wild/cyrodiilZone'),mask=zone.cyrodiilMask()
 const gate=game.modules.groundLaw.createSpawnGroundPlace({maps:game.maps,online:true,etherSea:true,plateauDry:game.modules.spawn.createSpawnGround(woods),terrainGen:{roads:()=>game.roads},cloneAt:game.clone,spawnGone:()=>false,zoneMask:()=>mask,placeAt})
 const {WATER_BYTE}=await load('roadConstants','world/roadsProducer')
 const layer=paths.joinLayer(paths.arenaJoins(game.roads,(x,y)=>frame.inBay(x,y)?!isWaterPixel(game.maps.getClimateIndex(x,y),woods.getHeightMapValue(x,y)):woods.getHeightMapValue(x,y)>WATER_BYTE))
 paths.setArenaRoads(layer);past.resetPastBayPlaces()
 const theatres=grid.THEATRE_KEYS.map((key,id)=>({id,key,name:id===0?'Iliac Bay':grid.theatreName(id),px:id===0?780:0,py:id===0?100:0,bounds:id===0?{x0:0,y0:0,x1:999,y1:499}:null,spawnPolicy:id===9?'Excluded by source Cyrodiil open-zone mask':'Deterministic generated spawn candidates; live availability unknown'}))
 const samples=new Map()
 for(let y=0;y<trace.h;y++)for(let x=0;x<trace.w;x++){
  const [bx,by]=frame.pictureToBay(x+.5,y+.5),px=Math.floor(bx),py=Math.floor(by),t=grid.theatreAt(px,py)
  if(t<=0)continue
  const row=theatres[t],b=row.bounds??={x0:px,y0:py,x1:px,y1:py};b.x0=Math.min(b.x0,px);b.x1=Math.max(b.x1,px);b.y0=Math.min(b.y0,py);b.y1=Math.max(b.y1,py)
  if(!samples.has(t))samples.set(t,[]);samples.get(t).push([px,py])
 }
 for(const row of theatres.slice(1)){const s=samples.get(row.id)??[];const cx=(row.bounds?.x0+row.bounds?.x1)/2,cy=(row.bounds?.y0+row.bounds?.y1)/2;s.sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cy)-Math.hypot(b[0]-cx,b[1]-cy));if(s[0])[row.px,row.py]=s[0]}
 const lattice=road.regionLattice(frame.tamrielFrameInBay()),done=new Set();let state=null
 async function prepare(request,notify=progress,dataDir){
  if(frame.inBay(request.px-request.radius,request.py-request.radius)&&frame.inBay(request.px+request.radius,request.py+request.radius))return
  if(request.theatre===9)return // every requested theatre-9 spawn is excluded by the source zone mask
  if(!state){
   const walkable=(x,y)=>!frame.inBay(x,y)&&woods.getHeightMapValue(x,y)>WATER_BYTE&&!cap.capitalOnPixel(x,y),obstacles=[],gates=[]
   cap.CAPITALS.forEach((_,k)=>{obstacles.push(...cap.capitalSpanPixels(k));gates.push(...cap.capitalGates(k,{walkable}))})
   const joins=paths.arenaJoins(game.roads,(x,y)=>frame.inBay(x,y)?!isWaterPixel(game.maps.getClimateIndex(x,y),woods.getHeightMapValue(x,y)):woods.getHeightMapValue(x,y)>WATER_BYTE)
   const towns=A.arenaRoadTowns({stood:stood.filter(p=>!p.pinned)})??[],{cyrodiilTrunksFor}=await load('roadHost','scenes/tamrielRoadsHost'),{createRoadsWorkerState}=await load('roadWorker','world/tamrielRoadsWorker')
   state=createRoadsWorkerState();state.handle({t:'init',inThread:true,woodsBytes:bytes('WOODS.WLD'),trace,fit:frame.tamrielFit(),lattice,spec:road.rollSpec({countryRates:country.rates,countryTemplates:cT,lairRates:lairs.rates,lairTemplates:lT,lairPools:pools}),nodes:[...towns,...gates.map(g=>({x:g.x,y:g.y,type:0})),...joins.map(j=>({x:j.gate[0],y:j.gate[1],type:0}))],obstacles,gates,held:[...stood.map(p=>({x:p.bx,y:p.by})),...paths.joinRunPixels(joins)],trunks:cyrodiilTrunksFor(pixels,walkable)},()=>{})
  }
  const started=performance.now()
  for(let j=0;j<lattice.rows;j++)for(let i=0;i<lattice.cols;i++){
   const r=road.regionOf(lattice,i,j),x0=request.px-request.radius,y0=request.py-request.radius,x1=request.px+request.radius+1,y1=request.py+request.radius+1
   if(r.gx>=x1||r.gy>=y1||r.core.x1+road.REGION_APRON<=x0||r.core.y1+road.REGION_APRON<=y0||done.has(`${i},${j}`))continue
   if(!road.regionWanted(r,(x,y)=>woods.getHeightMapValue(x,y)))continue
   notify({phase:`Source roads: preparing region ${i},${j}; cancel remains available`})
   const build=async()=>{const gen=state.steps({i,j,id:0});let step;let last=performance.now();while(!(step=gen.next()).done){if(performance.now()-started>240000)throw new Error('WORLD_ROAD_BUDGET: incomplete road preparation; no eligibility or exhaustive coverage claimed');if(performance.now()-last>12){await tick();last=performance.now()}}const m=step.value.msg;if(m.error)throw new Error(`WORLD_ROADS_FAILED: ${m.error}`);return {layer:Object.fromEntries(Object.entries(m.layer).map(([k,v])=>[k,Array.from(v)])),places:{keys:Array.from(m.places.keys),types:Array.from(m.places.types)}}}
   const out=dataDir?await cached(join(dataDir,'hunter-cache'),cacheKey(game.provenance,{i,j,world:'default-traced-fit-v1'},'world-roads'),build):await build()
   paths.mergeArenaRoads(layer,paths.unpackArenaRoads(out.layer));past.addPastBayPlaces(past.unpackPastBayPlaces(out.places));done.add(`${i},${j}`);await tick()
  }
 }
 return {frame,grid,gate,woods,placeAt,prepare,theatres,fit:frame.tamrielFit(),traceCells:trace.land.reduce((n,v)=>n+v,0),roadRegions:()=>[...done],auditInputs:{rows,countryTemplates:cT,lairTemplates:lT,lairPools:pools,arenaTemplates:aT,rawMaps,rawWoods,bayLand}}
}
