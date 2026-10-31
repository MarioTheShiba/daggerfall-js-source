// Read-only adapter: algorithms are imported from the user's checkout, never copied or patched.
import { readFileSync, statSync, realpathSync, readdirSync } from 'node:fs'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { verifySource, inspectWorldData } from './compatibility.mjs'
import {createHunterWorld} from './world.mjs'

export const REQUIRED_ASSETS = ['MAPS.BSA', 'CLIMATE.PAK', 'POLITIC.PAK', 'WOODS.WLD', 'BLOCKS.BSA', 'ARCH3D.BSA','ART_PAL.COL','MAP.PAL','TMAP00I0.IMG','TAMRIEL2.IMG']
export function scanRequest(value) {
  if (!value || typeof value !== 'object') throw new Error('Invalid scan request')
  const integer = (name, min, max) => {
    const n = value[name]
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${name}: expected integer ${min}–${max}`)
    return n
  }
  const request = { px: integer('px', -8191, 8191), py: integer('py', -8191, 8191), radius: integer('radius', 0, 50),
    species: integer('species', 0, 1023), level: integer('level', 1, 1000), minTargets: integer('minTargets', 1, 1000),
    region: integer('region', -1, 70) }
  if(value.theatre!==undefined)request.theatre=integer('theatre',-1,9)
  if(value.rankBy!==undefined){if(!['targets','purity'].includes(value.rankBy))throw new Error('Invalid ranking');request.rankBy=value.rankBy}
  if (!['vanilla', 'dex', 'dex-mudex'].includes(value.profile)) throw new Error('Unknown encounter profile')
  if (typeof value.eliteOnly !== 'boolean' || typeof value.alternate !== 'boolean') throw new Error('Invalid switches')
  return { ...request, profile: value.profile, eliteOnly: value.eliteOnly, alternate: value.alternate }
}

export async function openGame(settings, progress = () => {}) {
  const source = realpathSync(settings.dfoSourcePath), arena = realpathSync(settings.arena2Path)
  const safeFile = (root, name) => {
    const file = realpathSync(join(root, name)), rel = relative(root, file)
    if (rel.startsWith('..') || isAbsolute(rel) || !statSync(file).isFile()) throw new Error(`File outside selected folder: ${name}`)
    return file
  }
  const assetHashes = {}
  verifySource(source, name => readFileSync(safeFile(source, name)))
  const worldData = inspectWorldData(source, name => readFileSync(safeFile(source, name)))
  const snapshots = new Map()
  const bytes = name => {
    if (!snapshots.has(name)) snapshots.set(name,new Uint8Array(readFileSync(safeFile(arena,name))))
    return snapshots.get(name) // Hash and parser read the same immutable input snapshot.
  }
  for (const name of REQUIRED_ASSETS) {
    progress({ phase: `Checking ${name}` })
    assetHashes[name] = createHash('sha256').update(bytes(name)).digest('hex')
  }
  const fingerprint = createHash('sha256')
  // Include all source and vendored road bytes, not just a Git HEAD which may have uncommitted changes.
  const walk = dir => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(js|json|bytes)$/.test(e.name)) fingerprint.update(relative(source, p)).update(readFileSync(safeFile(source, relative(source, p))))
    }
  }
  walk(join(source, 'src')); walk(join(source, 'vendor/roads-hazelnut'))
  const sourceFingerprint = fingerprint.digest('hex')
  const modules = {}
  const load = async (key, path) => { modules[key] = await import(pathToFileURL(safeFile(source, `src/${path}.js`)).href); return modules[key] }
  progress({ phase: 'Loading source algorithms and world index' })
  const map = await load('map', 'formats/mapsFile')
  const { MapsFile } = map, maps = new MapsFile()
  if (maps.load(bytes('MAPS.BSA'), bytes('CLIMATE.PAK'), bytes('POLITIC.PAK')) === false) throw new Error('MAPS.BSA load failed')
  const { WoodsFile } = await load('woods', 'formats/woodsFile'), woods = new WoodsFile()
  if (woods.load(bytes('WOODS.WLD')) === false) throw new Error('WOODS.WLD load failed')
  const rawMaps=new MapsFile();rawMaps.load(bytes('MAPS.BSA').slice(),bytes('CLIMATE.PAK').slice(),bytes('POLITIC.PAK').slice())
  const rawWoods=new WoodsFile();rawWoods.load(bytes('WOODS.WLD').slice())
  const repair = await load('repair', 'world/terrain/terrainHelper')
  const directory = await load('directory', 'systems/map/mapDirectory')
  repair.dilateCoastalClimate(maps, 2)
  repair.smoothLocationNeighbourhood(directory.buildMapDict(maps), woods)
  const index = new Map(),rows=[]
  for (let r = 0; r < maps.regionCount; r++) {
    const region = maps.getRegion(r)
    if (!region) continue // Several original MAPS region slots are intentionally empty.
    for (let l = 0; l < region.locationCount; l++) {
      const loc = maps.getLocation(r, l)
      if (!loc?.exterior?.exteriorData) continue
      rows.push(loc)
      const p = map.longitudeLatitudeToMapPixel(loc.mapTableData.longitude, loc.mapTableData.latitude)
      index.set(`${p.x},${p.y}`, loc)
    }
  }
  const spawn = await load('spawn', 'world/spawnedDungeons')
  const textures = await load('textures', 'world/dungeon/dungeonTextures')
  const templates = spawn.spawnTemplates(index.values(), textures.isMainStoryDungeon)
  if (!templates.length) throw new Error('No spawn templates found')
  const roads = {}
  for (const [key, file] of Object.entries({ roads: 'road', tracks: 'track', rivers: 'river', streams: 'stream' })) {
    roads[key] = new Uint8Array(readFileSync(safeFile(source, `vendor/roads-hazelnut/${file}Data.bytes`)))
    if (roads[key].length !== 500000) throw new Error(`Invalid ${key} data length`)
  }
  const { BlocksFile } = await load('blocks', 'formats/blocksFile'), blocks = new BlocksFile()
  if (!blocks.load(bytes('BLOCKS.BSA'))) throw new Error('BLOCKS.BSA has invalid directory')
  blocks.autoDiscard = false
  const { Arch3dFile } = await load('arch', 'formats/arch3dFile'), arch = new Arch3dFile()
  if (arch.load(bytes('ARCH3D.BSA')) === false) throw new Error('ARCH3D.BSA load failed')
  const mesh = await load('mesh', 'world/meshReader')
  const seams = await load('seams', 'world/arch3dSeams')
  const models = new Map()
  const getModel = id => {
    if (!models.has(id)) {
      const record = arch.getRecordIndex(id)
      if (record < 0) throw new Error(`Missing ARCH3D model ${id}`)
      models.set(id, mesh.dfMeshToModel(seams.patchSeams(id, arch.getMesh(record)), () => ({ width: 1, height: 1 })))
      if (models.size > 512) models.delete(models.keys().next().value)
    }
    return models.get(id)
  }
  const curated = await load('curated', 'world/dungeon/curatedBlocks')
  const { CURATED_RECORDS } = await load('records', 'world/dungeon/curatedRecords')
  const custom = new Map()
  // Equivalent to the game's world-data block door for its generated curated blocks only.
  const blockReader = {
    getBlockIndex(name) {
      const rec = curated.curatedByName(name, CURATED_RECORDS)
      if (!rec) return blocks.getBlockIndex(name)
      const id = curated.CURATED_BLOCK_INDEX + rec.n
      if (!custom.has(id)) custom.set(id, curated.curatedBlockOf(blocks.getBlock(blocks.getBlockIndex(rec.base)), rec))
      return id
    },
    getBlock(id) { return custom.get(id) ?? blocks.getBlock(id) }
  }
  await load('size', 'world/smallerDungeons')
  await load('layout', 'world/dungeon/dungeonLayout')
  await load('enemies', 'characters/dungeonEnemies')
  await load('door', 'characters/encounterTableDoor')
  await load('vanilla', 'characters/encounterTables')
  await load('dexTables', 'systems/enemyExpansion/dexTables')
  await load('dexText', 'systems/enemyExpansion/dexTableText')
  await load('mudexText', 'systems/enemyExpansion/mudexTableText')
  await load('selector', 'systems/enemyExpansion/dexEncounters')
  await load('mobile', 'characters/mobile/mobileTypes')
  await load('basics', 'characters/enemy/enemyBasics')
  const towns = [...index.values()].filter(l => [0, 1, 2].includes(l.mapTableData.locationType)).map(l => {
    const p = map.longitudeLatitudeToMapPixel(l.mapTableData.longitude, l.mapTableData.latitude)
    return { name: l.name, px: p.x, py: p.y, region: l.regionIndex }
  })
  const species = Object.entries(modules.mobile.MOBILE_TYPES).filter(([, id]) => id < 1024).map(([name, id]) => ({ name, id }))
  const speciesIds = new Set(species.map(s => s.id))
  const tableFiles = text => Object.entries(text).filter(([name]) => name.endsWith('.tdb.csv')).map(([name, data]) => [name.replace(/\.csv$/, ''), data])
  const profiles = new Map()
  for (const profile of ['dex', 'dex-mudex']) {
    const files = [...tableFiles(modules.dexText.DEX_TABLE_TEXT), ...(profile === 'dex-mudex' ? tableFiles(modules.mudexText.MUDEX_TABLE_TEXT) : [])]
    const errors = []
    const tables = modules.dexTables.addDefaultEncounterTables(modules.dexTables.readEncounterTables(files, (level, message) => { if (level === 'error') errors.push(message) }), i => modules.vanilla.ENCOUNTER_TABLES[i])
    if (errors.length) throw new Error(`Encounter database errors: ${errors.join('; ')}`)
    profiles.set(profile, tables)
    const allText = [...Object.entries(modules.dexText.DEX_TABLE_TEXT), ...(profile === 'dex-mudex' ? Object.entries(modules.mudexText.MUDEX_TABLE_TEXT) : [])]
    const careers = modules.dexTables.classicCareers()
    for (const [name, text] of allText.filter(([name]) => name.endsWith('.cdb.csv'))) modules.dexTables.readCareerTable(text, careers, name)
    const names = modules.dexTables.readEnemyTables(allText.filter(([name]) => name.endsWith('.mdb.csv')).map(([name, text]) => [name.replace(/\.csv$/, ''), text]), careers,
      { liveRow: id => modules.basics.ENEMY_BASICS[id], isClassic: modules.basics.isClassicEnemyId, classicName: modules.basics.enemyDisplayName })
    for (const rows of tables.byIndex.values()) for (const row of rows) for (const id of row.enemyIds ?? []) {
      if (!speciesIds.has(id)) { species.push({ id, name: names.enemies.get(id)?.props.name || `Expansion creature ${id}` }); speciesIds.add(id) }
    }
  }
  const ground = spawn.createSpawnGround(woods)
  const groundLaw = await load('groundLaw', 'world/spawnGroundPlace')
  const gate = groundLaw.createSpawnGroundPlace({ maps, online: true, etherSea: true, plateauDry: ground,
    terrainGen: { roads: () => roads }, cloneAt: (px, py) => clone(px, py), spawnGone: () => false,
    zoneMask: () => null }) // Cyrodiil is outside the supported Bay rectangle.
  function clone(px, py) {
    const template = spawn.pickTemplate(templates, spawn.WORLD_SALT, px, py)
    const regionIndex = maps.getRegionIndexAt(px, py)
    return spawn.synthesizeDungeonLocation(template, { salt: spawn.WORLD_SALT, px, py,
      elite: spawn.isEliteSpawn(spawn.WORLD_SALT, px, py), where: { regionIndex, regionName: map.REGION_NAMES[regionIndex],
        politic: maps.getPoliticIndex(px, py), climate: map.getWorldClimateSettings(maps.getClimateIndex(px, py)) } })
  }
  const provenance = { schema: 2, sourceFingerprint, assetHashes, templates: templates.length, worldData,
    sourceCertified: sourceFingerprint==='88cf9bbac96e0efb3c1f30948e8505658a965d2c2247c1d2e7f55d7a42251804',
    onlineRules: { dex: true, mudex: true, alternateForced: false, alternateDefault: false, effectiveLevel: 'Manual input; group/mentor effective level must match the game' },
    scope: 'Bounded queries across the source Tamriel theatres; generated spawned dungeons only. Original assets + source trace/fit/roads + curated blocks; no active browser packs or live state.',
    warnings: ['Fresh layout expectation; live availability unknown.', worldData.diagnostic, ...(worldData.rdbOverrides.length ? [`UNAPPLIED_RDB_OVERRIDES: ${worldData.rdbOverrides.join(', ')}. Matching live layout is not established.`] : []), 'Runtime cleared stops, quest actors and curated encounter events are not a live census.',
      'Reachability unknown: an automap does not prove collision/action connectivity.', 'Nearest town and travel distance are geometric; no fast-travel path is claimed.'] }
  if (!provenance.sourceCertified) provenance.warnings.push('SOURCE_BUILD_UNVERIFIED: core contract matches, but the full source fingerprint differs from the tested baseline. Re-run parity tests before relying on this version.')
  verifySource(source,name=>readFileSync(safeFile(source,name)))
  const game={ modules, maps, woods, index, templates, roads, blockReader, getModel, profiles, gate, clone, provenance, load,
    catalog: { provenance, towns, species: species.sort((a, b) => a.id - b.id), regions: map.REGION_NAMES.map((name, id) => ({ name, id })) } }
  game.world=await createHunterWorld(game,{bytes,rows,rawMaps,rawWoods},progress)
  game.gate=game.world.gate;game.catalog.theatres=game.world.theatres
  provenance.geography={fit:game.world.fit,traceCells:game.world.traceCells,scenario:'Source default traced geography, capitals/countryside/lairs enabled; source roads reconstructed on demand. Browser land edits and live spawn clocks unknown.'}
  return game
}

export function selectProfile(game, profile) {
  game.modules.door._resetEncounterTableSelectors()
  if (profile !== 'vanilla') game.modules.door.registerEncounterTableSelector(game.modules.selector.createDexEncounterSelector(game.profiles.get(profile)))
}

export function reconstruct(game, location, request) {
  const { size, layout, enemies } = game.modules
  const built = size.dungeonLocationFor(location, { online: true })
  const dungeon = layout.layoutDungeon(built, game.blockReader, game.getModel)
  selectProfile(game, request.profile)
  const options = { ...enemies.dungeonPlace(built), dungeonType: built.mapTableData.dungeonType, playerLevel: request.level, alternate: request.alternate }
  const population = populationFor(game, built, dungeon, request)
  const base = population.resolved
  const copies = location.elite ? 3 : 1
  const targets = base.filter(e => e.mobileType === request.species)
  const counts = {}
  for (const enemy of base) counts[enemy.mobileType] = (counts[enemy.mobileType] ?? 0) + copies
  return { mapId: built.mapTableData.mapId, name: built.name, type: built.mapTableData.dungeonType, elite: built.elite,
    templateId: game.modules.spawn.pickTemplate(game.templates, game.modules.spawn.WORLD_SALT, request.tileX ?? request.px, request.tileY ?? request.py)?.mapTableData.mapId,
    size: size.builtDungeonSize(built), curated: built.curated ?? null, count: targets.length * copies,
    fixed: targets.filter(e => e.fixed).length, random: targets.filter(e => !e.fixed).length, copies, counts,
    population: { base: base.length, expanded: base.length * copies, targetBase: targets.length, targetExpanded: targets.length * copies,
      unresolved: population.unresolved.length, excluded: population.excluded, markerCandidates: population.markerCandidates },
    unresolvedMarkers: population.unresolved,
    dragonlings:counts[34]??0,totalEnemies:base.length*copies,dragonlingPercentage:base.length?(counts[34]??0)/(base.length*copies)*100:0,
    targets: targets.map(e => ({ ...e, copies })),
    blocks: dungeon.blocks.map((b, index) => ({ index, name: b.name, x: b.originX, z: b.originZ, starting: b.isStartingBlock, waterLevel: b.layout.waterLevel })),
    entrance: dungeon.enterMarker ?? dungeon.startMarker, populationSeed: options.locationId, tableSeed: options.dungeon,
    reachability: 'unknown', liveAvailability: 'unknown' }
}

export function populationFor(game, built, dungeon, request) {
  selectProfile(game, request.profile)
  const options = { ...game.modules.enemies.dungeonPlace(built), dungeonType: built.mapTableData.dungeonType, playerLevel: request.level, alternate: request.alternate }
  const raw = game.modules.enemies.collectDungeonEnemies(dungeon.blocks.map(b => ({ markers: b.layout.markers, waterLevel: b.layout.waterLevel, originX: b.originX, originZ: b.originZ })), options)
  const markerCandidates = dungeon.blocks.reduce((n, b) => n + b.layout.markers.filter(m => (m.archive ?? 199) === 199 && [15,16].includes(m.record)).length, 0)
  const resolved = raw.filter(e => Number.isInteger(e.mobileType) && e.mobileType >= 0 && e.mobileType < 1024)
  const unresolved = raw.filter(e => !resolved.includes(e)).map(e => ({ blockIndex: e.blockIndex, loadID: e.loadID, x: e.x, y: e.y, z: e.z, reason: 'Source encounter selection did not resolve a valid mobileType' }))
  return { resolved, unresolved, markerCandidates, excluded: markerCandidates - raw.length }
}

export async function scan(game, input, progress = () => {},dataDir) {
  const request = scanRequest(input), start = performance.now(), { spawn } = game.modules
  const stats = { phase: 'Pass A: world gates', pixels: 0, hashCandidates: 0, eligible: 0, simulated: 0, errors: 0, elapsedMs: 0 }
  const candidates = [], results = [], diagnostics = []
  await game.world.prepare(request,progress,dataDir)
  const visitedByTheatre={},seen=new Set();let matchingResults=0
  let last = 0
  const emit = (force = false) => { if (force || performance.now() - last > 150) { stats.elapsedMs = Math.round(performance.now() - start); progress({ ...stats }); last = performance.now() } }
  for (let y = Math.max(-8191, request.py - request.radius); y <= Math.min(8191, request.py + request.radius); y++) {
    for (let x = Math.max(-8191, request.px - request.radius); x <= Math.min(8191, request.px + request.radius); x++) {
      if (Math.hypot(x - request.px, y - request.py) > request.radius) continue
      stats.pixels++
      const theatre=game.world.grid.theatreAt(x,y);visitedByTheatre[theatre]=(visitedByTheatre[theatre]??0)+1
      if(theatre<0||(request.theatre!==undefined&&request.theatre!==-1&&request.theatre!==theatre))continue
      if (!spawn.spawnsDungeon(spawn.WORLD_SALT, x, y) || (request.eliteOnly && !spawn.isEliteSpawn(spawn.WORLD_SALT, x, y))) continue
      stats.hashCandidates++
      if (game.index.has(`${x},${y}`) || (request.region !== -1 && game.maps.getRegionIndexAt(x, y) !== request.region)) continue
      const location = game.gate.spawnAt(x, y, { clocks: false })
      if (location) { candidates.push({ x, y, location }); stats.eligible++ }
      emit()
    }
    emit(); await new Promise(resolve => setImmediate(resolve))
  }
  stats.phase = 'Pass B: online layout + population'; emit(true)
  for (const { x, y, location } of candidates) {
    try {
      const result = reconstruct(game, location, { ...request, tileX: x, tileY: y })
      stats.simulated++
      if (result.count >= request.minTargets) {
        if(seen.has(result.mapId))throw new Error('DUPLICATE_MAP_ID: source identity collision');seen.add(result.mapId);matchingResults++
        const distance = Math.hypot(x - request.px, y - request.py)
        let nearest = null, nearestDistance = Infinity
        for (const town of game.catalog.towns) { const d = Math.hypot(x - town.px, y - town.py); if (d < nearestDistance) { nearestDistance = d; nearest = town } }
        const theatre=game.world.grid.theatreAt(x,y)
        results.push({ ...result, px: x, py: y, distance,theatre,province:game.world.theatres[theatre].name,region:game.maps.getRegionIndexAt(x,y),eligibility:'eligible_under_offline_scenario',verification:'Source-derived fresh layout; live availability unverified', nearest: theatre===0&&nearest ? { ...nearest, distance: nearestDistance, dx: x - nearest.px, dy: y - nearest.py }:null,
          spawnRoll: spawn.spawnRoll(spawn.WORLD_SALT, x, y), gates: ['hash + keep', 'unoccupied', 'climate', 'dry ground', 'source roads/paths free', 'outside Ether Sea', 'outside Cyrodiil open-zone', 'reserved source places excluded'] })
        results.sort((a, b) => (request.rankBy==='purity'?b.dragonlingPercentage-a.dragonlingPercentage:0)||b.count - a.count || a.distance - b.distance || a.mapId - b.mapId)
        if (results.length > 100) results.length = 100
      }
    } catch (error) { stats.errors++; if (diagnostics.length < 20) diagnostics.push({ px: x, py: y, status: 'analysis_error', message: String(error.message) }) }
    emit(); await new Promise(resolve => setImmediate(resolve))
    if (performance.now() - start > 300000) { diagnostics.push({ status: 'unknown', message: '300-second budget exhausted; results are partial.' }); break }
  }
  stats.phase = stats.simulated + stats.errors < candidates.length ? 'Partial' : 'Complete'; emit(true)
  return { request, provenance: game.provenance, stats, results, diagnostics,coverage:{kind:'bounded_circle',center:{px:request.px,py:request.py},radius:request.radius,visitedPixels:stats.pixels,visitedByTheatre,eligible:candidates.length,populationsExamined:stats.simulated,failed:stats.errors,matchingResults,retained:results.length,truncated:matchingResults>results.length,completeWithinQuery:stats.phase==='Complete'&&stats.errors===0,exhaustiveWorld:false,roadRegions:game.world.roadRegions(),note:'Only this requested circle was examined; all other coordinates are unexplored by this result. Cyrodiil generated spawns are excluded by source zone law; static/lair/quest/abyss/zone-hall dungeons are outside this generated-spawn scope.'} }
}
