import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdirSync } from 'node:fs'
import { openGame, scan, reconstruct, selectProfile } from '../src/main/hunter/engine.mjs'

const settings = { dfoSourcePath: process.env.DFO_SOURCE_PATH || resolve('..'), arena2Path: process.env.ARENA2_PATH || 'C:/Program Files (x86)/Steam/steamapps/common/The Elder Scrolls Daggerfall/DF/DAGGER/ARENA2' }
const start = performance.now()
const game = await openGame(settings)
const initializationMs = Math.round(performance.now() - start)
const load = p => import(pathToFileURL(join(settings.dfoSourcePath, 'src', `${p}.js`)).href)
const request = { px: 780, py: 100, radius: 20, species: 34, level: 30, minTargets: 1, region: -1, eliteOnly: true, alternate: false, profile: 'dex-mudex' }
const result = await scan(game, request)
const evidence = { initializationMs, provenance: game.provenance, scan: result.stats, samples: [], memoryMB: Math.round(process.memoryUsage().rss / 1048576) }

test('hundreds of hash and map ID checks include negative/out-of-Bay world lanes', async () => {
  const spawn = await load('world/spawnedDungeons')
  for (let n = 0; n < 1000; n++) {
    const x = (n * 7919) % 1100 - 50, y = (n * 1543) % 550 - 25
    const roll = spawn.hash32(spawn.WORLD_SALT, x, y, 1) / 2 ** 32
    const kept = spawn.hash32(spawn.WORLD_SALT, x, y, 3) / 2 ** 32 < .75
    assert.equal(spawn.spawnsDungeon(1, x, y), roll < .4 && kept)
    assert.equal(spawn.isEliteSpawn(1, x, y), roll >= .3 && roll < .4 && kept)
  }
  assert.notEqual(spawn.spawnedMapId(1, 1003, 10), spawn.spawnedMapId(1, 3, 11))
})

test('supported Bay world gates match the actual stand host for every sampled pixel', async () => {
  const { createSpawnStand } = await load('scenes/spawnStandHost')
  const host = { _arenaTemplates: null, _capitalBase: null, _countryTemplates: null, _insideSpawn: () => false,
    _spawnGround: game.modules.spawn.createSpawnGround(game.woods), _spawnLedger: { expired: () => false }, _spawnSalt: 1,
    _spawnUnroaded: new Set(), etherPlaceAt: () => null, etherSea: true, locationIndex: new Map(game.index), maps: game.maps,
    params: new URLSearchParams('online'), terrainGen: { roads: () => game.roads }, zoneHalls: { standOf: () => null },
    _spawnClock: () => 0, _spawnCloneAt: game.clone, _locIndexGen: 0 }
  const oracle = createSpawnStand(host)
  for (let y = 80; y <= 120; y++) for (let x = 760; x <= 800; x++) {
    const actual = oracle._locationToBuild(x, y)
    const eligible = !game.index.has(`${x},${y}`) && game.modules.spawn.spawnsDungeon(1, x, y) && game.gate.spawnAt(x, y, { clocks: false })
    assert.equal(actual?.spawned === true, !!eligible, `stand ${x},${y}`)
  }
})

test('five real Dragonling candidates match independent source layout/population assembly', async () => {
  assert.equal(result.stats.errors, 0)
  assert.ok(result.results.length >= 5)
  const { BlocksFile } = await load('formats/blocksFile')
  const { readFileSync } = await import('node:fs')
  const { installWorldDataReplacement, bindWorldDataBlocks } = await load('formats/worldData/worldDataReplacement')
  const { installCuratedBlocks } = await load('world/dungeon/curatedInstall')
  installWorldDataReplacement(); installCuratedBlocks()
  const blocks = new BlocksFile(); blocks.load(new Uint8Array(readFileSync(join(settings.arena2Path, 'BLOCKS.BSA')))); bindWorldDataBlocks(blocks)
  for (const sample of result.results.slice(0, 5)) {
    const clone = game.clone(sample.px, sample.py)
    const location = game.modules.size.dungeonLocationFor(clone, { online: true })
    const layout = game.modules.layout.layoutDungeon(location, blocks, game.getModel)
    assert.deepEqual(sample.blocks.map(b => [b.name, b.x, b.z, b.starting]), layout.blocks.map(b => [b.name, b.originX, b.originZ, b.isStartingBlock]))
    for (const profile of ['vanilla', 'dex', 'dex-mudex']) for (const alternate of [false, true]) {
      selectProfile(game, profile)
      const base = game.modules.enemies.collectDungeonEnemies(layout.blocks.map(b => ({ markers: b.layout.markers, waterLevel: b.layout.waterLevel, originX: b.originX, originZ: b.originZ })), { ...game.modules.enemies.dungeonPlace(location), dungeonType: location.mapTableData.dungeonType, playerLevel: 30, alternate })
      const predicted = reconstruct(game, clone, { ...request, profile, alternate, tileX: sample.px, tileY: sample.py })
      assert.equal(predicted.count, base.filter(e => e.mobileType === 34).length * 3)
      assert.deepEqual(predicted.targets.map(({ copies, ...e }) => e), base.filter(e => e.mobileType === 34))
      assert.equal(game.modules.enemies.expandEliteEnemies(base).length, base.length * 3)
      assert.equal(predicted.reachability, 'unknown')
    }
    evidence.samples.push({ px: sample.px, py: sample.py, name: sample.name, mapId: sample.mapId, blocks: sample.blocks.length, curated: sample.curated, count: sample.count })
  }
})

test('selector scenarios are order independent and MUDEX Dragon Den matches the source upper band', () => {
  const table = game.profiles.get('dex-mudex').byIndex.get(14)[0].enemyIds
  assert.deepEqual(table.slice(14, 20), [34, 22, 24, 145, 16, 9])
  const location = game.clone(result.results[0].px, result.results[0].py)
  const first = reconstruct(game, location, request)
  reconstruct(game, game.clone(785, 100), { ...request, profile: 'vanilla', alternate: true })
  assert.deepEqual(reconstruct(game, location, request), first)
})

test('generated curated block adapter matches the actual game world-data door', async () => {
  const { BlocksFile } = await load('formats/blocksFile')
  const { readFileSync } = await import('node:fs')
  const { bindWorldDataBlocks } = await load('formats/worldData/worldDataReplacement')
  const blocks = new BlocksFile(); blocks.load(new Uint8Array(readFileSync(join(settings.arena2Path, 'BLOCKS.BSA')))); bindWorldDataBlocks(blocks)
  let sample
  outer: for (let y = 50; y <= 150; y++) for (let x = 730; x <= 830; x++) {
    if (game.index.has(`${x},${y}`) || !game.modules.spawn.isEliteSpawn(1, x, y)) continue
    const loc = game.gate.spawnAt(x, y, { clocks: false })
    if (!loc) continue
    const built = game.modules.size.dungeonLocationFor(loc, { online: true })
    if (!built.curated) continue
    const oracle = game.modules.layout.layoutDungeon(built, blocks, game.getModel)
    const predicted = reconstruct(game, loc, { ...request, tileX: x, tileY: y })
    assert.deepEqual(predicted.blocks.map(b => b.name), oracle.blocks.map(b => b.name))
    const custom = oracle.blocks.find(b => b.name.startsWith('NDLV'))
    const adapter = game.blockReader.getBlock(game.blockReader.getBlockIndex(custom.name))
    assert.deepEqual(adapter, custom.dfBlock)
    sample = { px: x, py: y, curated: built.curated, blocks: predicted.blocks.length }
    break outer
  }
  assert.ok(sample, 'A real eligible curated candidate must be tested')
  evidence.curatedSample = sample
})

test('fixed/random/archive/water rules and manual level/alternate branches use source behavior', () => {
  selectProfile(game, 'vanilla')
  const e = game.modules.enemies
  const marker = { record: 16, x: 1, y: 2, z: 3, rawY: 0, flags: 0, factionOrMobileId: 34, soundIndex: 0, actionByte: 0 }
  const opts = { locationId: 1, dungeonType: 14, playerLevel: 1, alternate: false }
  const block = { markers: [marker, { ...marker, archive: 216 }, { ...marker, factionOrMobileId: 99 }, { ...marker, factionOrMobileId: 11 }], waterLevel: 10000, originX: 51.2, originZ: -51.2 }
  const foes = e.collectDungeonEnemies([block], opts)
  assert.equal(foes.length, 1); assert.equal(foes[0].mobileType, 34); assert.equal(foes[0].x, 52.2)
  const random = { ...marker, record: 15 }
  assert.notDeepEqual(e.collectDungeonEnemies([{ ...block, markers: [random] }], opts), e.collectDungeonEnemies([{ ...block, markers: [random] }], { ...opts, playerLevel: 30 }))
})

test('real scan filters, town distances, no-result behavior and larger bounded scan', async () => {
  const lich = await scan(game, { ...request, species: 32, radius: 10, eliteOnly: false })
  assert.ok(lich.stats.simulated > 0)
  assert.ok(lich.results.every(r => r.targets.every(t => t.mobileType === 32)))
  const empty = await scan(game, { ...request, minTargets: 1000, radius: 2 })
  assert.equal(empty.results.length, 0)
  const region = await scan(game, { ...request, region: 16, radius: 10 })
  assert.ok(region.results.every(r => game.maps.getRegionIndexAt(r.px, r.py) === 16))
  const large = await scan(game, { ...request, radius: 50 })
  evidence.largeScan = large.stats
  assert.equal(large.stats.pixels, 7845)
  assert.equal(large.stats.errors, 0)
  for (const r of large.results) assert.equal(r.nearest.distance, Math.hypot(r.nearest.dx, r.nearest.dy))
})

test.after(() => {
  evidence.memoryMB = Math.round(process.memoryUsage().rss / 1048576)
  mkdirSync('release/verification', { recursive: true })
  writeFileSync('release/verification/hunter-parity.json', JSON.stringify(evidence, null, 2))
  console.log('HUNTER EVIDENCE', JSON.stringify(evidence))
})
