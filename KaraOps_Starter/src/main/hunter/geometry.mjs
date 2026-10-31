import { populationFor } from './engine.mjs'
import {digest} from './compatibility.mjs'
export async function assembleGeometry(game, spec, capture = null) {
  const { px, py, request } = spec
  await game.world.prepare({...request,px,py,radius:0},undefined,game.cacheDir)
  if (game.index.has(`${px},${py}`) || !game.modules.spawn.spawnsDungeon(1,px,py) || !game.gate.spawnAt(px,py,{clocks:false})) throw new Error('DUNGEON_NO_LONGER_ELIGIBLE: rescan before opening this map')
  const built = game.modules.size.dungeonLocationFor(game.clone(px,py), { online: true })
  const dungeon = game.modules.layout.layoutDungeon(built, game.blockReader, game.getModel)
  const floors = await game.load('floors', 'systems/automap/automapFloors')
  const ink = await game.load('ink', 'ui/ink/inkMap')
  const model = await game.load('automapModel', 'systems/automap/automapModel')
  const { worldAabb } = await game.load('activate', 'player/activate')
  const { multiply, trs } = await game.load('mat4', 'world/mat4')
  const { Collider } = await game.load('collider', 'player/collider')
  const collider = new Collider(() => -Infinity), entries = [], doors = []
  for (const [bi,b] of dungeon.blocks.entries()) {
    const origin = trs(b.originX,0,b.originZ,0,0,0), counts = [0,0]
    for (const p of b.layout.placements) {
      const cpu = game.getModel(p.modelIdNum), matrix = multiply(origin,p.matrix), elementIndex = p.action ? 1 : 0
      if (!cpu?.normals || !cpu.positions?.length || !cpu.positions.every(Number.isFinite) || !cpu.normals.every(Number.isFinite)) throw new Error(`GEOMETRY_MISSING: model ${p.modelIdNum} has missing/invalid authored mesh/normals`)
      entries.push({ key:`${bi}:${p.position}`, blockIndex:bi, blockName:b.name, elementIndex, modelIndex:counts[elementIndex]++, aabb:worldAabb(cpu.positions,matrix), positions:cpu.positions, indices:cpu.indices, normals:cpu.normals, matrix })
      collider.addMesh('dungeon', cpu.positions, cpu.indices, matrix)
    }
    for (const d of b.layout.actionDoors) {
      if (d.disabled) continue
      const cpu = game.getModel(d.modelIdNum), matrix = multiply(origin,d.matrix), box = worldAabb(cpu.positions,matrix)
      collider.addMesh('door',cpu.positions,cpu.indices,matrix)
      const [x,y,z] = box.min.map((v,i) => (v+box.max[i])/2)
      doors.push({ id:`door:${bi}:${d.position}`, blockIndex:bi, x,y,z, x0:box.min[0], x1:box.max[0], z0:box.min[2], z1:box.max[2], lock:d.startingLockValue, state:'closed / at rest (prediction)' })
    }
  }
  const automap = model.buildAutomapModel(entries)
  const byKey = new Map(entries.map(e=>[e.key,e]))
  // The checked source builds normal-bearing entries but loses normals in buildAutomapModel.
  // Preserve authored facing here so its own floorTriangles excludes ceilings, as documented.
  for (const row of automap.rows) row.normals = byKey.get(row.key).normals
  const tris = floors.floorTriangles(automap.rows), storeys = floors.deriveFloors(tris), bounds = floors.planBounds(tris,floors.PLAN_CELL)
  if (!bounds || !storeys.length) throw new Error('GEOMETRY_EMPTY: no authored walkable floor surfaces; no map drawn')
  if (Math.ceil((bounds.x1-bounds.x0)/floors.PLAN_CELL)*Math.ceil((bounds.z1-bounds.z0)/floors.PLAN_CELL) > 500000 || storeys.length > 128) throw new Error('GEOMETRY_BUDGET: map exceeds safe raster/storey budget; no partial map drawn')
  const field = floors.levelField(automap.rows,storeys,{bounds}), sheets = floors.groupSheets(field,storeys)
  const sheetOf = floors.sheetOfStorey(sheets,storeys.length), links = floors.storeyLinks(field)
  const sheetAt = y => sheetOf[floors.floorAt(storeys,y)]
  const path = chains => chains.map(chain=>chain.map((p,i)=>`${i?'L':'M'}${p.x},${-p.y}`).join(' ')).join(' ')
  const occupancies = []
  const plans = sheets.map(s => {
    const full = floors.fieldOccupancy(field,s.storeys), pass = new Set()
    occupancies[s.index] = full
    for (const l of links) if (sheetOf[l.from] === s.index && sheetOf[l.to] !== s.index) for (const k of l.far) pass.add(k)
    const plan = floors.floorPlan(automap.rows,s.storeys,{ floors:storeys,bounds,full,pass,segments:ink.boundarySegments,link:ink.linkSegments })
    let fill = '', cells = 0
    for (let z=0;z<full.h;z++) for (let x=0;x<full.w;x++) {
      if (!full.at(x,z)) continue
      const start=x; while(x+1<full.w && full.at(x+1,z)) x++
      cells += x-start+1
      const x0=full.x0+start*full.cell, z0=full.z0+z*full.cell, w=(x-start+1)*full.cell
      fill += `M${x0},${-z0}h${w}v${-full.cell}h${-w}Z`
    }
    return { ...s, fill, walls:path(plan.chains), openings:path(plan.openChains), cells }
  })
  const population = populationFor(game,built,dungeon,request)
  const expanded = built.elite ? game.modules.enemies.expandEliteEnemies(population.resolved,{ clearance:(from,dir,dist)=>collider.raycast([from[0],from[1]+.9,from[2]],dir,dist), floor:at=>{const d=collider.raycast([at[0],at[1]+1,at[2]],[0,-1,0],3);return Number.isFinite(d)?at[1]+1-d:null} }) : population.resolved
  const enemies = expanded.map((e,i)=>{
    const sheet=sheetAt(e.y),occ=occupancies[sheet]
    const projectionOnFloor=!!occ?.at(Math.floor((e.x-occ.x0)/occ.cell),Math.floor((e.z-occ.z0)/occ.cell))
    return {...e,id:`enemy:${i}`,sheet,copies:1,projectionOnFloor}
  })
  const entrance = dungeon.enterMarker ?? dungeon.startMarker
  const stairs = links.map((l,i)=>({ id:`stair:${i}`, x:l.x,z:l.z,y:storeys[l.from].y,dx:l.dx,dz:l.dz,from:sheetOf[l.from],to:sheetOf[l.to], fromStorey:l.from,toStorey:l.to }))
  for (const door of doors) door.sheet = sheetAt(door.y)
  if (capture) Object.assign(capture,{built,dungeon,entries,collider,sheetAt})
  const layoutFingerprint=digest(JSON.stringify(dungeon.blocks.map(b=>({name:b.name,x:b.originX,z:b.originZ,starting:b.isStartingBlock,water:b.layout.waterLevel,placements:b.layout.placements.map(p=>[p.modelIdNum,p.position,...p.matrix]),doors:b.layout.actionDoors.map(d=>[d.modelIdNum,d.position,!!d.disabled,...(d.matrix??[])])}))))
  const assetFingerprint=digest(JSON.stringify(Object.fromEntries(Object.entries(game.provenance.assetHashes).sort(([a],[b])=>a.localeCompare(b)))))
  return { schema:1,layoutFingerprint,assetFingerprint,mapId:built.mapTableData.mapId,px,py,name:built.name,request,provenance:game.provenance,bounds,cell:floors.PLAN_CELL,storeys,plans,enemies,doors,stairs,
    entrance:entrance && {...entrance,sheet:sheetAt(entrance.y)},unresolvedMarkers:population.unresolved,
    stats:{ blocks:dungeon.blocks.length,rows:entries.length,floorTriangles:tris.length,sheets:sheets.length,storeys:storeys.length,enemyBase:population.resolved.length,enemyExpanded:expanded.length },
    warnings:[`${enemies.filter(e=>!e.projectionOnFloor).length} predicted enemy records do not project onto their assigned sheet's 1m floor cells. Coordinates are preserved, not snapped; these positions need inspection.`,
      'Full offline X-Ray, not the live explored map. Door and moving geometry shown at rest; mechanism state and reachability remain unknown.',
      'Uses DFO floorTriangles, deriveFloors, levelField, groupSheets, storeyLinks and floorPlan at its native 1m raster. Stair marks are automap surface joins, not validated routes.',
      'Source automapModel drops authored normals. KaraOps preserves the host entry normals to honor source floor-facing rules and exclude ceilings; see geometry parity report.',
      'Marker floor assignment uses DFO nearest-storey height. X/Z/Y are unchanged source coordinates; no invented snapping. Elite copy positions use source at-rest mesh clearance and floor rays.'] }
}
