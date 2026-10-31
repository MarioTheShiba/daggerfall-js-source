import test from 'node:test'
import assert from 'node:assert/strict'
import { scanRequest } from '../src/main/hunter/engine.mjs'
const valid = { px: 780, py: 100, radius: 15, species: 34, level: 30, minTargets: 1, region: -1, eliteOnly: true, alternate: false, profile: 'dex-mudex' }
test('bounded requests preserve Dragonling 34 separately from alternate 40', () => {
  assert.equal(scanRequest(valid).species, 34)
  assert.equal(scanRequest({ ...valid, species: 40 }).species, 40)
})
test('rejects off-world, unbounded, nonnumeric and malformed scan requests', () => {
  for (const value of [null, {}, { ...valid, px: -8192 }, { ...valid, py: 8192 }, { ...valid, radius: 51 }, { ...valid, level: 0 }, { ...valid, px: '780' }, { ...valid, profile: 'unknown' }, { ...valid, alternate: 1 }, { ...valid, species: Infinity },{...valid,theatre:10},{...valid,rankBy:'jackpot'}]) assert.throws(() => scanRequest(value))
})
test('negative and beyond-Bay coordinates are accepted with bounded province/ranking options',()=>{
 assert.equal(scanRequest({...valid,px:-1,py:500,theatre:1,rankBy:'purity'}).px,-1)
 assert.equal(scanRequest({...valid,px:8191,py:-8191}).py,-8191)
})
